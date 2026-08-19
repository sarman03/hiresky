import Foundation
import AVFoundation
import Speech
import Vision
import ScreenCaptureKit
import CoreGraphics
import AppKit

/// A native implementation of the HireSky backend inside the Swift App process.
/// Eliminates Python, Tesseract, BlackHole, and Websockets.
final class NativeEngine: NSObject, SCStreamOutput, URLSessionDataDelegate {
    
    // --- Public API matching WebSocketClient ---
    var onEvent: ((BackendEvent) -> Void)?
    var onStateChange: ((Bool) -> Void)?
    
    // --- Configuration State ---
    private var geminiAPIKey: String {
        let saved = UserDefaults.standard.string(forKey: "gemini_api_key") ?? ""
        return saved.isEmpty ? "" : saved
    }
    private var activePrompt: String {
        // Retrieve selected prompt
        guard let savedJSON = UserDefaults.standard.string(forKey: "saved_prompts"),
              let data = savedJSON.data(using: .utf8),
              let items = try? JSONDecoder().decode([PromptItem].self, from: data) else {
            return "You are HireSky, a concise technical assistant."
        }
        let selectedID = UserDefaults.standard.string(forKey: "selected_prompt_id")
        if let selectedID = selectedID, let uuid = UUID(uuidString: selectedID) {
            return items.first(where: { $0.id == uuid })?.content ?? items.first?.content ?? ""
        }
        return items.first?.content ?? ""
    }
    private var activeCandidateInfo: String {
        guard let savedJSON = UserDefaults.standard.string(forKey: "saved_info"),
              let data = savedJSON.data(using: .utf8),
              let items = try? JSONDecoder().decode([InfoItem].self, from: data) else {
            return ""
        }
        let selectedID = UserDefaults.standard.string(forKey: "selected_info_id")
        if let selectedID = selectedID, let uuid = UUID(uuidString: selectedID) {
            return items.first(where: { $0.id == uuid })?.content ?? items.first?.content ?? ""
        }
        return items.first?.content ?? ""
    }
    
    // --- Internal State ---
    private var isRunning = false
    private var isListening = true
    private var isAnswering = false
    private var answerSeq = 0
    private var msgSeq = 0
    private var lastAnsweredText = ""   // avoid re-answering the same question

    // Conversational Chat Memory
    private var chatHistory: [[String: Any]] = []
    
    // Active session state for session history
    private var activeSessionId = UUID()
    private var activeSessionTitle = ""
    private var activeSessionTranscript: [String] = []
    private var activeSessionQA: [String] = []
    
    // Prompt wrapper prefix
    private let baseHumanizedWrapper = """
    You are assisting me in a LIVE technical interview. I will read your reply out
    loud to the interviewer, so write it as words I can speak.

    Every answer MUST be:
    - COMPLETE: fully answer the question, leave nothing important out.
    - WELL-STRUCTURED: clear sections/short paragraphs; use bullet points where
      they help; wrap any code in proper markdown code blocks.
    - NATURAL & HUMAN: sound like a real, confident developer talking — first
      person, conversational. NEVER robotic, never "As an AI", no filler.
    - INTERVIEW-READY: get to the point, lead with the answer, then the reasoning
      and a short example if useful.
    - CRISP BUT DETAILED: precise and technically correct, but no padding or
      generic fluff.

    For coding/DSA/system-design questions include, in order: the approach, the
    complete working code, time & space complexity, and edge cases.
    """
    
    // Tracking for "What should I say?" button and last question
    private var lastAIResponseText = ""
    private var lastQuestion: String?

    // --- Manual-segment model (interviewer only) ---
    // The interviewer transcript accumulates into ONE bubble until the user
    // presses Cmd+} — then it's finalized into a message + sent to the AI, and a
    // fresh bubble starts below. The SFSpeech recognizer is NEVER restarted for
    // this (that used to break recognition) — instead we track a baseline
    // offset into the live session transcript.
    //   segId          = current bubble id (empty until first words)
    //   segCommitted   = text folded in from earlier SFSpeech sessions
    //   sessionBaseline= chars of the current session already used by prior
    //                    (finalized) messages — the current message shows only
    //                    the text AFTER this offset
    //   lastFullText   = latest cumulative transcript from the live session
    private var segId = ""
    private var segCommitted = ""
    private var sessionBaseline = 0
    private var lastFullText = ""
    
    // Rolling transcript context
    private var transcript: [String] = []
    private var pendingChars = 0
    private var currentOcrContext: String = ""
    
    // --- Native Capture Components (interviewer / system audio only) ---
    private var scStream: SCStream?
    private var themSpeechRecognizer: SFSpeechRecognizer?
    private var themRecognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var themRecognitionTask: SFSpeechRecognitionTask?

    // System-audio -> SFSpeech format conversion (48kHz stereo -> 16kHz mono).
    private let themTargetFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                                                 sampleRate: 16000, channels: 1,
                                                 interleaved: false)!
    private var themConverter: AVAudioConverter?
    private var themConverterInput: AVAudioFormat?
    private var themAudioSeen = false

    // Prefer on-device recognition, but fall back to server if it errors (the
    // on-device model may not be installed). Errors are surfaced once so the
    // real cause is visible instead of a silent restart loop.
    private var themUseOnDevice = true
    private var lastSpeechErrorAt: [String: Date] = [:]
    
    // Continuous OCR timer
    private var ocrTimer: Timer?
    
    // Gemini SSE Connection
    private var geminiSession: URLSession?
    private var sseBuffer = Data()
    private var activeStreamHandler: ((String) -> Void)?
    private var activeStreamEndHandler: (() -> Void)?
    
    // Fallback simulation timer for demo when permissions fail
    private var simulationTimer: Timer?
    private var demoStep = 0
    
    override init() {
        super.init()
        themSpeechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }
    
    private func resetActiveSession() {
        self.chatHistory = []
        self.activeSessionId = UUID()
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        self.activeSessionTitle = "Session - \(formatter.string(from: Date()))"
        self.activeSessionTranscript = []
        self.activeSessionQA = []
        self.lastAIResponseText = ""
        self.lastQuestion = nil
    }

    private func saveActiveSessionToHistory() {
        // Compile summary from Q&A
        var summaryText = "### Interview Key Q&A:\n\n"
        if activeSessionQA.isEmpty {
            summaryText += "No questions were asked during this session."
        } else {
            for qa in activeSessionQA {
                summaryText += "\(qa)\n\n"
            }
        }
        
        let finalTranscript = activeSessionTranscript.joined(separator: "\n")
        
        let newSession = PastSession(
            id: self.activeSessionId,
            title: self.activeSessionTitle,
            date: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short),
            summary: summaryText,
            transcript: finalTranscript.isEmpty ? "No audio was transcribed during this session." : finalTranscript
        )
        
        // Save via SessionStorage
        SessionStorage.shared.saveSession(newSession)
    }

    private func emitEvent(_ event: BackendEvent) {
        DispatchQueue.main.async { [weak self] in
            self?.onEvent?(event)
        }
    }

    func connect() {
        guard !isRunning else { return }
        isRunning = true
        onStateChange?(true)
        emitEvent(BackendEvent(type: "status", text: "initializing native capture...", id: nil, speaker: nil, status: nil))
        
        // Reset active session
        self.resetActiveSession()
        
        // Reset segment state
        self.segId = ""
        self.segCommitted = ""
        self.sessionBaseline = 0
        self.lastFullText = ""

        // We only transcribe the INTERVIEWER (system/speaker audio). The mic
        // ("you") is intentionally NOT captured. The interviewer transcript
        // accumulates continuously until the user presses Cmd+} (finalize+ask).
        SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
            guard let self = self else { return }
            DispatchQueue.main.async {
                guard speechStatus == .authorized else {
                    self.emitEvent(BackendEvent(type: "status", text: "Speech Recognition denied — enable it in System Settings ▸ Privacy & Security ▸ Speech Recognition, then restart HireSky.", id: nil, speaker: nil, status: nil))
                    self.startOCRTask()
                    return
                }
                // Interviewer audio via ScreenCaptureKit (Screen Recording perm).
                self.startSystemAudioCapture()
                self.startOCRTask()
                self.emitEvent(BackendEvent(type: "status", text: "listening", id: nil, speaker: nil, status: nil))
            }
        }
    }
    
    func disconnect() {
        guard isRunning else { return }
        isRunning = false
        onStateChange?(false)
        
        stopSystemAudioCapture()

        ocrTimer?.invalidate()
        ocrTimer = nil
        
        // Save session history before shutting down
        saveActiveSessionToHistory()
    }
    
    func send(command action: String, text: String?) {
        print("[NativeEngine] Command received: \(action) (text: \(text ?? "nil"))")
        
        switch action {
        case "toggle_listening":
            isListening.toggle()
            let stateText = isListening ? "listening" : "paused"
            emitEvent(BackendEvent(type: "status", text: stateText, id: nil, speaker: nil, status: nil))
            
        case "ask":
            if let question = text, !question.isEmpty {
                triggerLLMResponse(userQuestion: question)
            }
            
        case "assist":
            triggerLLMResponse(userQuestion: nil)

        case "finalize_ask":
            finalizeSegmentAndAsk()

        case "analyze_screen_only":
            captureAndProcessScreen { [weak self] jpegData, ocrText in
                guard let self = self else { return }
                self.currentOcrContext = ocrText
                self.emitEvent(BackendEvent(type: "ocr", text: ocrText, id: nil, speaker: nil, status: nil))
                let prompt = "Analyze the coding problem shown in the attached screenshot (e.g. LeetCode / IDE). Read the problem statement, constraints, example inputs/outputs, and code signature carefully. Provide the optimal solution with code explanation, time & space complexity, and complete working code."
                self.triggerLLMResponse(userQuestion: prompt, imageBytes: jpegData, hasTranscript: false)
            }
            
        case "analyze_screen_with_transcript", "analyze_screen":
            captureAndProcessScreen { [weak self] jpegData, ocrText in
                guard let self = self else { return }
                self.currentOcrContext = ocrText
                self.emitEvent(BackendEvent(type: "ocr", text: ocrText, id: nil, speaker: nil, status: nil))
                let prompt = "Analyze the coding problem in the attached screenshot together with our live discussion transcript. Provide the optimal code solution, time & space complexity, and humanized explanation."
                self.triggerLLMResponse(userQuestion: prompt, imageBytes: jpegData, hasTranscript: true)
            }
            
        case "summarize_last_answer":
            if !lastAIResponseText.isEmpty {
                let prompt = "Here is the previous detailed response:\n\n\"\(lastAIResponseText)\"\n\nSummarize this into highly conversational, crisp bullet points that I can easily say out loud to the interviewer right now."
                triggerLLMResponse(userQuestion: prompt, hasTranscript: false)
            } else {
                triggerLLMResponse(userQuestion: "What should I say next? Give me a strong, concise response.")
            }
            
        default:
            break
        }
    }
    
    // --- System Audio ("Interviewer") Loopback Capture via ScreenCaptureKit ---
    
    private func startSystemAudioCapture() {
        Task {
            do {
                // Trigger / verify the Screen Recording TCC for THIS binary.
                // (Unsigned rebuilds get a new identity, so a previous grant to
                // an old "HireSky" entry won't apply — this re-prompts.)
                if !CGPreflightScreenCaptureAccess() {
                    let granted = CGRequestScreenCaptureAccess()
                    if !granted {
                        await MainActor.run {
                            self.onEvent?(BackendEvent(type: "status", text: "Interviewer audio blocked — enable HireSky under System Settings ▸ Privacy & Security ▸ Screen Recording, then FULLY QUIT (menu-bar ▸ Quit) and reopen. If you see a duplicate 'HireSky' entry, remove all of them first.", id: nil, speaker: nil, status: nil))
                        }
                        return
                    }
                }
                let shareable = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
                guard let display = shareable.displays.first else {
                    await MainActor.run {
                        self.onEvent?(BackendEvent(type: "status", text: "No display found for system-audio capture.", id: nil, speaker: nil, status: nil))
                    }
                    return
                }

                let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
                let config = SCStreamConfiguration()
                config.capturesAudio = true
                config.excludesCurrentProcessAudio = true   // don't transcribe our own sounds
                config.sampleRate = 48000
                config.channelCount = 2
                config.width = 128                          // small but valid video size
                config.height = 128

                scStream = SCStream(filter: filter, configuration: config, delegate: nil)
                try scStream?.addStreamOutput(self, type: .audio, sampleHandlerQueue: DispatchQueue.global(qos: .userInteractive))
                try await scStream?.startCapture()

                await MainActor.run {
                    self.onEvent?(BackendEvent(type: "status", text: "capturing system audio — play something to see the transcript", id: nil, speaker: nil, status: nil))
                    self.beginThemRecognition()
                }
            } catch {
                // Surface the real reason instead of silently faking a chat.
                await MainActor.run {
                    self.onEvent?(BackendEvent(type: "status", text: "Interviewer audio unavailable — Screen Recording is granted to a stale/duplicate 'HireSky' entry. Remove all HireSky entries in System Settings ▸ Privacy & Security ▸ Screen Recording, reopen this app, grant when asked, then fully quit and reopen. (\(error.localizedDescription))", id: nil, speaker: nil, status: nil))
                }
            }
        }
    }

    /// Fresh recognition request + task for the system-audio (interviewer)
    /// stream; restarted after each final result for continuous transcription.
    private func beginThemRecognition() {
        guard isRunning else { return }
        themRecognitionTask?.cancel()
        // New SFSpeech session: its cumulative transcript restarts from empty,
        // so reset the baseline. The accumulated segment text (segCommitted)
        // persists so the interviewer transcript keeps growing until Cmd+}.
        sessionBaseline = 0
        lastFullText = ""

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if themUseOnDevice && themSpeechRecognizer?.supportsOnDeviceRecognition == true {
            req.requiresOnDeviceRecognition = true
        }
        themRecognitionRequest = req

        themRecognitionTask = themSpeechRecognizer?.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result, self.isListening {
                let text = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                if !text.isEmpty {
                    DispatchQueue.main.async { self.handleSpeech(speaker: "interviewer", text: text, isFinal: isFinal) }
                }
                if isFinal {
                    DispatchQueue.main.async { self.beginThemRecognition() }
                }
            }
            if let error = error {
                DispatchQueue.main.async {
                    self.onRecognitionError(error, speaker: "interviewer")
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.beginThemRecognition() }
                }
            }
        }
    }
    
    private func stopSystemAudioCapture() {
        Task {
            try? await scStream?.stopCapture()
            scStream = nil
        }
        themRecognitionRequest?.endAudio()
        themRecognitionTask?.cancel()
        themRecognitionRequest = nil
        themRecognitionTask = nil
    }
    
    private func convertToPCMBuffer(sampleBuffer: CMSampleBuffer) -> AVAudioPCMBuffer? {
        guard let formatDescription = CMSampleBufferGetFormatDescription(sampleBuffer) else { return nil }
        let format = AVAudioFormat(cmAudioFormatDescription: formatDescription)
        
        let frameCount = AVAudioFrameCount(CMSampleBufferGetNumSamples(sampleBuffer))
        guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        pcmBuffer.frameLength = frameCount
        
        let status = CMSampleBufferCopyPCMDataIntoAudioBufferList(sampleBuffer, at: 0, frameCount: Int32(frameCount), into: pcmBuffer.mutableAudioBufferList)
        if status != noErr {
            return nil
        }
        return pcmBuffer
    }
    
    // ScreenCaptureKit Audio delegate callback
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio, let req = themRecognitionRequest else { return }
        guard let src = convertToPCMBuffer(sampleBuffer: sampleBuffer) else { return }

        // SFSpeech reliably transcribes the mic (native format) but silently
        // ignores ScreenCaptureKit's 48 kHz stereo audio. Convert it to
        // 16 kHz mono Float32 first so the interviewer's speech is recognized.
        if themConverter == nil || themConverterInput != src.format {
            themConverter = AVAudioConverter(from: src.format, to: themTargetFormat)
            themConverterInput = src.format
        }
        guard let converter = themConverter else { req.append(src); return }

        let ratio = themTargetFormat.sampleRate / src.format.sampleRate
        let capacity = AVAudioFrameCount(Double(src.frameLength) * ratio) + 1024
        guard let out = AVAudioPCMBuffer(pcmFormat: themTargetFormat, frameCapacity: capacity) else {
            req.append(src); return
        }

        var consumed = false
        var convErr: NSError?
        converter.convert(to: out, error: &convErr) { _, status in
            if consumed { status.pointee = .noDataNow; return nil }
            consumed = true
            status.pointee = .haveData
            return src
        }
        if convErr == nil && out.frameLength > 0 {
            req.append(out)
            if !themAudioSeen {
                themAudioSeen = true
                DispatchQueue.main.async {
                    self.onEvent?(BackendEvent(type: "status", text: "interviewer audio connected", id: nil, speaker: nil, status: nil))
                }
            }
        }
    }
    
    // --- 3. Screen OCR using Vision ---
    
    private func startOCRTask() {
        ocrTimer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: true) { [weak self] _ in
            self?.captureScreenOCR { text in
                if !text.isEmpty && text.count > 12 {
                    self?.currentOcrContext = text
                    self?.onEvent?(BackendEvent(type: "ocr", text: String(text.prefix(400)), id: nil, speaker: nil, status: nil))
                }
            }
        }
    }
    
    private func resizeAndCompressImage(imageRef: CGImage, maxDimension: CGFloat = 1600) -> Data? {
        let width = CGFloat(imageRef.width)
        let height = CGFloat(imageRef.height)
        
        var newWidth = width
        var newHeight = height
        
        if width > maxDimension || height > maxDimension {
            if width > height {
                newWidth = maxDimension
                newHeight = (height / width) * maxDimension
            } else {
                newHeight = maxDimension
                newWidth = (width / height) * maxDimension
            }
        }
        
        let size = CGSize(width: newWidth, height: newHeight)
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let context = CGContext(data: nil,
                                      width: Int(newWidth),
                                      height: Int(newHeight),
                                      bitsPerComponent: 8,
                                      bytesPerRow: 0,
                                      space: colorSpace,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
            return nil
        }
        
        context.interpolationQuality = .high
        context.draw(imageRef, in: CGRect(origin: .zero, size: size))
        
        guard let scaledImage = context.makeImage() else { return nil }
        let bitmapRep = NSBitmapImageRep(cgImage: scaledImage)
        return bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.85])
    }
    
    private func captureAndProcessScreen(completion: @escaping (Data?, String) -> Void) {
        if #available(macOS 11.0, *) {
            if !CGPreflightScreenCaptureAccess() {
                print("⚠️ [SCREEN RECORDING PERMISSION DENIED] Prompting system permission...")
                CGRequestScreenCaptureAccess()
                emitEvent(BackendEvent(type: "status", text: "Screen Recording permission missing! Please enable HireSky in System Settings ▸ Privacy & Security ▸ Screen Recording, then restart.", id: nil, speaker: nil, status: nil))
            }
        }
        
        let imageRef = CGWindowListCreateImage(.infinite, .optionOnScreenOnly, kCGNullWindowID, [.boundsIgnoreFraming, .bestResolution])
            ?? CGDisplayCreateImage(CGMainDisplayID())
            
        guard let validImage = imageRef else {
            completion(nil, currentOcrContext)
            return
        }
        
        // High quality image resize & compression
        let jpegData = resizeAndCompressImage(imageRef: validImage)
        
        // Save debug screenshot directly to Desktop & Workspace for local inspection
        if let data = jpegData {
            let desktopURL = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Desktop")
                .appendingPathComponent("hiresky_debug_capture.png")
            let workspaceURL = URL(fileURLWithPath: "/Users/akash/HireSky/debug_capture.png")
            
            try? data.write(to: desktopURL)
            try? data.write(to: workspaceURL)
            print("==================================================")
            print("📸 [DEBUG CAPTURE SAVED] Screenshot saved to:")
            print("  1. Desktop: \(desktopURL.path)")
            print("  2. Workspace: \(workspaceURL.path)")
            print("==================================================")
        }
        
        // Extract fresh OCR text from current screen
        captureScreenOCR { [weak self] freshText in
            let combinedText = !freshText.isEmpty ? freshText : (self?.currentOcrContext ?? "")
            completion(jpegData, combinedText)
        }
    }

    private func captureScreenOCR(completion: @escaping (String) -> Void) {
        let imageRef = CGWindowListCreateImage(.infinite, .optionOnScreenOnly, kCGNullWindowID, [.boundsIgnoreFraming, .bestResolution])
            ?? CGDisplayCreateImage(CGMainDisplayID())
            
        guard let validImage = imageRef else {
            completion("")
            return
        }
        
        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion("")
                return
            }
            
            var text = ""
            for observation in observations {
                guard let topCandidate = observation.topCandidates(1).first else { continue }
                text += topCandidate.string + "\n"
            }
            completion(text)
        }
        
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        
        let handler = VNImageRequestHandler(cgImage: validImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }
    
    // --- 4. Utterance Finalization & Triggering AI ---
    
    /// Surface a recognition error once (throttled) and drop to server-based
    /// recognition on the next restart. The accumulated segment is preserved.
    private func onRecognitionError(_ error: Error, speaker: String) {
        let now = Date()
        if let last = lastSpeechErrorAt[speaker], now.timeIntervalSince(last) < 8 {
            // throttle
        } else {
            lastSpeechErrorAt[speaker] = now
            onEvent?(BackendEvent(type: "status", text: "Speech recognition error (interviewer): \(error.localizedDescription) — retrying.", id: nil, speaker: nil, status: nil))
        }
        themUseOnDevice = false
    }

    /// Interviewer speech handler. The transcript accumulates continuously into
    /// ONE bubble (`segId`) — across pauses and SFSpeech session restarts —
    /// until the user presses Cmd+} (see `finalizeSegmentAndAsk`).
    ///
    /// `fullText` is the current SFSpeech session's cumulative transcript; it is
    /// combined with text committed from earlier sessions in this segment.
    private func handleSpeech(speaker: String, text fullText: String, isFinal: Bool) {
        // Only the interviewer is transcribed; ignore anything else.
        guard speaker == "interviewer" else { return }

        // If SFSpeech reset its buffer mid-session (text suddenly much shorter),
        // fold what we had so the transcript never shrinks, and rebase.
        if lastFullText.count > 20 && fullText.count < lastFullText.count / 2 {
            let prev = Array(lastFullText)
            let b = min(sessionBaseline, prev.count)
            segCommitted = capWords((segCommitted + " " + String(prev[b...])).trimmingCharacters(in: .whitespacesAndNewlines))
            sessionBaseline = 0
        }
        lastFullText = fullText

        // Current message text = committed carry-over + this session's text
        // after the baseline (baseline advances only on Cmd+}).
        let chars = Array(fullText)
        let base = min(sessionBaseline, chars.count)
        let sessionDelta = String(chars[base...])
        let combined = capWords((segCommitted + " " + sessionDelta).trimmingCharacters(in: .whitespacesAndNewlines))
        guard !combined.isEmpty else { return }

        if segId.isEmpty {
            msgSeq += 1
            segId = "interviewer-\(msgSeq)"
        }

        // Always "streaming" — the bubble is only finalized by Cmd+}.
        emitEvent(BackendEvent(type: "conversation", text: combined, id: segId,
                              speaker: "interviewer", status: "streaming"))

        if isFinal {
            // Session ended naturally; fold into committed and let the closure's
            // beginThemRecognition() start a fresh session (baseline resets there).
            segCommitted = combined
            sessionBaseline = 0
        }
    }

    /// Keep a message bounded to 3000 words (drop the oldest beyond that).
    private func capWords(_ text: String, _ maxWords: Int = 3000) -> String {
        let words = text.split(separator: " ", omittingEmptySubsequences: true)
        guard words.count > maxWords else { return text }
        return words.suffix(maxWords).joined(separator: " ")
    }

    /// Cmd+} — finalize the accumulated interviewer transcript into a completed
    /// message, ask the AI about it, and start a fresh transcript below.
    private func finalizeSegmentAndAsk() {
        let chars = Array(lastFullText)
        let base = min(sessionBaseline, chars.count)
        let sessionDelta = String(chars[base...])
        let finalText = capWords((segCommitted + " " + sessionDelta).trimmingCharacters(in: .whitespacesAndNewlines))

        if !segId.isEmpty && !finalText.isEmpty {
            emitEvent(BackendEvent(type: "conversation", text: finalText, id: segId,
                                  speaker: "interviewer", status: "completed"))
            transcript.append("[interviewer] \(finalText)")
            activeSessionTranscript.append("[interviewer] \(finalText)")
            triggerLLMResponse(userQuestion: nil)
        }

        // Start a fresh message WITHOUT touching the recognizer (restarting it
        // used to break recognition). Just advance the baseline so only words
        // spoken AFTER this point go into the next bubble.
        sessionBaseline = chars.count
        segCommitted = ""
        segId = ""
    }
    
    // --- 5. Gemini SSE Client ---
    
    private func triggerLLMResponse(userQuestion: String?, imageBytes: Data? = nil, hasTranscript: Bool = true) {
        guard !isAnswering else { return }
        isAnswering = true
        answerSeq += 1
        let respId = "resp-native-\(answerSeq)"
        
        emitEvent(BackendEvent(type: "answer_start", text: nil, id: respId, speaker: nil, status: nil))
        
        let apiKey = self.geminiAPIKey
        if apiKey.isEmpty {
            streamMockTokens(
                text: "To receive live answers, please configure your Gemini API Key in the dashboard settings bar above.",
                respId: respId
            )
            return
        }
        
        // 1. Build current user query / text context
        var promptText = ""
        if hasTranscript {
            let transcriptContext = transcript.suffix(10).joined(separator: "\n")
            if !transcriptContext.isEmpty {
                promptText += "[Recent Transcript Context]\n\(transcriptContext)"
            }
        }
        
        if let question = userQuestion {
            if !promptText.isEmpty { promptText += "\n\n" }
            promptText += "[Question / Action Required]\n\(question)"
            self.lastQuestion = question
        } else {
            self.lastQuestion = "General Assist"
        }
        
        if !currentOcrContext.isEmpty {
            if !promptText.isEmpty { promptText += "\n\n" }
            promptText += "[On-screen Text (OCR)]\n\(currentOcrContext)"
        }
        
        if promptText.isEmpty {
            promptText = "Please assist me based on the available context."
        }
        
        // 2. Build parts for current message
        var currentParts: [[String: Any]] = [["text": promptText]]
        
        if let imageBytes = imageBytes {
            let base64Image = imageBytes.base64EncodedString()
            currentParts.append([
                "inlineData": [
                    "mimeType": "image/jpeg",
                    "data": base64Image
                ]
            ])
        }
        
        // Remove heavy/stale inline image data from past turns to prevent vision context confusion
        var cleanedHistory: [[String: Any]] = []
        for msg in chatHistory {
            guard let role = msg["role"] as? String, let parts = msg["parts"] as? [[String: Any]] else { continue }
            let textParts = parts.filter { $0["inlineData"] == nil }
            if !textParts.isEmpty {
                cleanedHistory.append(["role": role, "parts": textParts])
            }
        }
        
        let userMessage: [String: Any] = [
            "role": "user",
            "parts": currentParts
        ]
        
        // Append current query to chat history
        chatHistory.append(userMessage)
        cleanedHistory.append(userMessage)
        
        // Limit history to stay within prompt limits
        let historyToSubmit = Array(cleanedHistory.suffix(10))
        
        // 3. Build system instruction
        var systemPrompt = """
        \(baseHumanizedWrapper)

        \(activePrompt)
        """
        
        let candidateInfo = self.activeCandidateInfo
        if !candidateInfo.isEmpty {
            systemPrompt += "\n\n[Candidate Resume / Experience Context]\n\(candidateInfo)\n"
            systemPrompt += "IMPORTANT: When technical questions are asked (e.g. debouncing, caching, UI architecture), prefer matching the answer to the projects and experience listed in the Candidate Resume/Experience Context above. Say: 'I have used [concept] in my [project name] project to [how it was used]'. Keep the explanation natural and brief."
        }
        
        sseBuffer = Data()
        lastAIResponseText = ""
        
        activeStreamHandler = { [weak self] token in
            self?.lastAIResponseText += token
            self?.emitEvent(BackendEvent(type: "token", text: token, id: respId, speaker: nil, status: nil))
        }
        
        activeStreamEndHandler = { [weak self] in
            guard let self = self else { return }
            self.emitEvent(BackendEvent(type: "answer_end", text: nil, id: respId, speaker: nil, status: nil))
            
            // Append assistant response to chat history
            let assistantMessage: [String: Any] = [
                "role": "model",
                "parts": [["text": self.lastAIResponseText]]
            ]
            self.chatHistory.append(assistantMessage)
            
            // Append to session QA list
            let questionLabel = self.lastQuestion ?? "General Assist"
            self.activeSessionQA.append("Q: \(questionLabel)\nA: \(self.lastAIResponseText)")
            
            self.isAnswering = false
        }
        
        let availableModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash", "gemini-2.0-flash"]
        let modelName = availableModels[0]
        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(modelName):streamGenerateContent?alt=sse&key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            activeStreamEndHandler?()
            return
        }
        
        let payload: [String: Any] = [
            "contents": historyToSubmit,
            "systemInstruction": [
                "parts": [
                    ["text": systemPrompt]
                ]
            ],
            "generationConfig": [
                "temperature": 0.2,
                "maxOutputTokens": 1024
            ]
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload) else {
            activeStreamEndHandler?()
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        geminiSession?.invalidateAndCancel()
        let config = URLSessionConfiguration.default
        geminiSession = URLSession(configuration: config, delegate: self, delegateQueue: OperationQueue.main)
        geminiSession?.dataTask(with: request).resume()
    }
    
    // URLSessionDataDelegate handling Server-Sent Events
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        sseBuffer.append(data)
        
        while let newlineIndex = sseBuffer.firstIndex(of: 10) { // 10 is '\n'
            let lineData = sseBuffer.subdata(in: 0..<newlineIndex)
            sseBuffer.removeSubrange(0...newlineIndex)
            
            if let line = String(data: lineData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) {
                if line.hasPrefix("data:") {
                    let jsonString = line.dropFirst(5).trimmingCharacters(in: .whitespacesAndNewlines)
                    if !jsonString.isEmpty {
                        parseAndEmit(jsonString)
                    }
                } else if line.contains("\"error\"") || line.hasPrefix("{") {
                    parseAndEmit(line)
                }
            }
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            activeStreamHandler?("\n[API Stream Connection Error: \(error.localizedDescription)]")
        }
        activeStreamEndHandler?()
    }
    
    private func parseAndEmit(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }
        
        if let errorObj = json["error"] as? [String: Any],
           let message = errorObj["message"] as? String {
            print("[NativeEngine] Gemini API Error: \(message)")
            activeStreamHandler?("\n⚠️ [Gemini API Error: \(message)]")
            return
        }
        
        guard let candidates = json["candidates"] as? [[String: Any]],
              let firstCandidate = candidates.first,
              let content = firstCandidate["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let firstPart = parts.first,
              let text = firstPart["text"] as? String else {
            return
        }
        
        activeStreamHandler?(text)
    }
    
    // --- 6. Mock/Simulation Mode (Fallback / Demo) ---
    
    private func startMockSimulation() {
        simulationTimer = Timer.scheduledTimer(withTimeInterval: 8.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isListening else { return }
            
            let script = [
                ("interviewer", "Hello Akash, welcome! Let's start. Can you explain the difference between a process and a thread?"),
                ("you", "A process runs in an isolated memory space managed by the OS. A thread runs inside a process and shares its heap and resources, making context-swapping lighter."),
                ("interviewer", "Makes sense. How do you design a high-performance cache layer for database queries?"),
                ("you", "I'd use Redis as an in-memory cache in front of Postgres. Use a Cache-Aside pattern, set clear TTL values, and deploy read replicas to scale query routing.")
            ]
            
            let speaker = script[self.demoStep % script.count].0
            let text = script[self.demoStep % script.count].1
            
            self.demoStep += 1
            
            // Simulating typing first
            self.msgSeq += 1
            let tempMsgId = "msg-mock-\(self.msgSeq)"
            
            var wordAccumulator = ""
            var wordIndex = 0
            let words = text.components(separatedBy: " ")
            
            Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { timer in
                guard self.isRunning else { timer.invalidate(); return }
                
                wordAccumulator += words[wordIndex] + " "
                wordIndex += 1
                
                self.onEvent?(BackendEvent(
                    type: "conversation",
                    text: wordAccumulator.trimmingCharacters(in: .whitespacesAndNewlines),
                    id: tempMsgId,
                    speaker: speaker,
                    status: "streaming"
                ))
                
                if wordIndex >= words.count {
                    timer.invalidate()
                    self.onEvent?(BackendEvent(
                        type: "conversation",
                        text: text,
                        id: tempMsgId,
                        speaker: speaker,
                        status: "completed"
                    ))
                    self.transcript.append("[\(speaker)] \(text)")
                    self.activeSessionTranscript.append("[\(speaker)] \(text)")
                    
                    if speaker == "interviewer" {
                        self.triggerLLMResponse(userQuestion: nil)
                    }
                }
            }
        }
    }
    
    private func streamMockTokens(text: String, respId: String) {
        let chars = Array(text)
        var index = 0
        Timer.scheduledTimer(withTimeInterval: 0.015, repeats: true) { [weak self] timer in
            guard let self = self, self.isRunning else { timer.invalidate(); return }
            
            let charStr = String(chars[index])
            self.onEvent?(BackendEvent(type: "token", text: charStr, id: respId, speaker: nil, status: nil))
            
            index += 1
            if index >= chars.count {
                timer.invalidate()
                self.onEvent?(BackendEvent(type: "answer_end", text: nil, id: respId, speaker: nil, status: nil))
                self.isAnswering = false
            }
        }
    }
}
