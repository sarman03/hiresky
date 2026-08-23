import AppKit

/// Owns the pill bar window + the content window (answer card, transcript),
/// routes backend events, and implements Hide/Ask, listening and transcript
/// toggles used by the pill buttons and the keyboard shortcuts.
final class OverlayController {
    private let pill = PillBarView(frame: .zero)
    private let content = ContentRootView(frame: .zero)
    private let pillWindow: OverlayPanelController
    private let contentWindow: OverlayPanelController

    private var listening = true
    private var contentShown = true
    private var transcriptShown = true      // interviewer transcript visible by default
    private var allHidden = false
    private var savedContentShown = true

    /// Set by AppDelegate: forwards (action, optional text) to the backend.
    var onCommand: ((String, String?) -> Void)?
    var onLogoClick: (() -> Void)?
    var onEndSession: (() -> Void)?

    init() {
        let M = OverlayMetrics.self
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)

        let pillOrigin = NSPoint(x: screen.midX - M.pillW / 2,
                                 y: screen.maxY - 20 - M.pillH)
        pillWindow = OverlayPanelController(
            content: pill,
            size: NSSize(width: M.pillW, height: M.pillH),
            origin: pillOrigin)

        // Start wide enough to show the answer + transcript side by side.
        let contentSize = NSSize(width: M.answerW + M.hGap + M.transW, height: M.contentH)
        let contentOrigin = NSPoint(x: screen.midX - contentSize.width / 2,
                                    y: pillOrigin.y - M.pillGap - contentSize.height)
        contentWindow = OverlayPanelController(content: content, size: contentSize, origin: contentOrigin)
        contentWindow.window?.minSize = NSSize(width: 640, height: 360)
        contentWindow.window?.maxSize = NSSize(width: 1800, height: 1100)
        content.transcriptShown = true

        pill.onToggleContent = { [weak self] in self?.toggleContent() }
        pill.onToggleListen = { [weak self] in self?.toggleListening() }
        pill.onLogoClick = { [weak self] in self?.onLogoClick?() }
        pill.onCloseSession = { [weak self] in self?.onEndSession?() }
        pill.setContentShown(contentShown)
        pill.setListening(listening)

        content.answerCard.onAssist = { [weak self] in self?.onCommand?("assist", nil) }
        content.answerCard.onAsk = { [weak self] text in
            // Typed questions appear as a chat message, then the reply streams
            // in as an assistant message underneath — like a normal messenger.
            self?.content.answerCard.addUserMessage(text)
            self?.onCommand?("ask", text)
        }
        content.answerCard.onChip = { [weak self] chip in
            guard let self = self else { return }
            if chip.contains("Assist") {
                self.onCommand?("assist", nil)
            } else if chip.contains("What should I say") {
                self.content.answerCard.addUserMessage("What should I say?")
                self.onCommand?("summarize_last_answer", nil)
            }
        }
        
        content.onCloseTranscript = { [weak self] in
            self?.toggleTranscript()
        }
    }

    func showAll() {
        pillWindow.showWindow(nil)
        if contentShown { contentWindow.showWindow(nil) }
        content.needsLayout = true
    }

    // MARK: - Event routing

    func setConnected(_ c: Bool) {
        pill.setConnected(c)
    }

    func apply(event: BackendEvent) {
        switch event.type {
        case "status":
            let t = event.text ?? ""
            if t == "paused" { listening = false; pill.setListening(false) }
            else if t == "listening" { listening = true; pill.setListening(true) }
            else {
                // Surface important capture/permission messages so failures
                // aren't silent (e.g. interviewer audio / Screen Recording).
                let l = t.lowercased()
                if l.contains("denied") || l.contains("unavailable")
                    || l.contains("permission") || l.contains("error")
                    || l.contains("connected") || l.contains("capturing")
                    || l.contains("blocked") {
                    content.answerCard.showNote(t)
                }
            }
        case "answer_start":
            content.answerCard.answerStart()
        case "token":
            content.answerCard.appendToken(event.text ?? "")
        case "answer_end":
            content.answerCard.answerEnd()
        case "conversation":
            content.transcriptView.applyConversation(
                id: event.id ?? "msg-0",
                speaker: event.speaker ?? "interviewer",
                status: event.status ?? "streaming",
                text: event.text ?? "")
        case "ocr":
            content.answerCard.setCaption("Viewed screen")
        default:
            break
        }
    }

    // MARK: - Toggles

    /// Pill "Hide" / "✦ Ask" button: hide or show the big answer overlay.
    func toggleContent() {
        contentShown.toggle()
        pill.setContentShown(contentShown)
        if contentShown {
            contentWindow.showWindow(nil)
            content.needsLayout = true
        } else {
            contentWindow.hide()
        }
    }

    /// Temporarily make overlay windows completely hidden (orderOut) so screen capture sees ONLY background applications (Chrome, WhatsApp, VSCode, LeetCode).
    private func setOverlaysHiddenForCapture(_ hidden: Bool, completion: @escaping () -> Void) {
        if hidden {
            pillWindow.window?.alphaValue = 0.0
            contentWindow.window?.alphaValue = 0.0
            pillWindow.window?.orderOut(nil)
            contentWindow.window?.orderOut(nil)
        } else {
            pillWindow.window?.alphaValue = 1.0
            contentWindow.window?.alphaValue = 1.0
            pillWindow.showWindow(nil)
            if contentShown { contentWindow.showWindow(nil) }
        }
        // Give macOS Window Server 60ms to flush display composite tree
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) {
            completion()
        }
    }

    /// Cmd+/ — analyze the current screen using the latest cached OCR text.
    func analyzeScreen() {
        setOverlaysHiddenForCapture(true) { [weak self] in
            guard let self = self else { return }
            self.onCommand?("analyze_screen_with_transcript", nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                if !self.contentShown { self.toggleContent() }
                self.setOverlaysHiddenForCapture(false) {}
                self.content.answerCard.addUserMessage("Analyze my screen + transcript")
            }
        }
    }

    /// Cmd+Shift+\ — analyze screen only (no transcript).
    func analyzeScreenOnly() {
        setOverlaysHiddenForCapture(true) { [weak self] in
            guard let self = self else { return }
            self.onCommand?("analyze_screen_only", nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                if !self.contentShown { self.toggleContent() }
                self.setOverlaysHiddenForCapture(false) {}
                self.content.answerCard.addUserMessage("Analyze screen only")
            }
        }
    }

    /// Cmd+} : lock the accumulated interviewer transcript into a message and
    /// ask the AI about it; a fresh transcript starts below.
    func finalizeAndAsk() {
        if !contentShown { toggleContent() }   // make sure the answer is visible
        onCommand?("finalize_ask", nil)
    }

    /// Cmd+V / pill square button: start-stop speech recognition.
    func toggleListening() {
        listening.toggle()
        pill.setListening(listening)
        onCommand?("toggle_listening", nil)
    }

    /// Cmd+T / Ctrl+T: show-hide the transcript panel on the right.
    func toggleTranscript() {
        transcriptShown.toggle()
        content.transcriptShown = transcriptShown
        // If the content is hidden, showing the transcript should reveal it.
        if transcriptShown && !contentShown { toggleContent() }
        resizeContentWindow()
    }

    /// Cmd+O — hide everything, or restore the previous visibility state.
    func toggleAll() {
        if allHidden {
            allHidden = false
            pillWindow.showWindow(nil)
            contentShown = savedContentShown
            pill.setContentShown(contentShown)
            if contentShown { contentWindow.showWindow(nil) }
        } else {
            savedContentShown = contentShown
            allHidden = true
            pillWindow.hide()
            contentWindow.hide()
        }
    }

    private func resizeContentWindow() {
        guard let win = contentWindow.window else { return }
        let M = OverlayMetrics.self
        let delta = M.transW + M.hGap
        let screen = win.screen?.visibleFrame ?? NSScreen.main?.visibleFrame
            ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        var f = win.frame
        let topY = f.maxY
        var newW = f.width + (transcriptShown ? delta : -delta)
        newW = min(max(newW, win.minSize.width), win.maxSize.width)
        f.size.width = newW
        f.origin.x = screen.midX - newW / 2
        f.origin.y = topY - f.size.height       // keep the top edge fixed
        win.setFrame(f, display: true, animate: false)
        content.needsLayout = true
    }

    func setDetectable(_ detectable: Bool) {
        let type: NSWindow.SharingType = detectable ? .readWrite : .none
        pillWindow.window?.sharingType = type
        contentWindow.window?.sharingType = type
        print("Set overlays detectability to: \(detectable) (sharingType: \(type.rawValue))")
    }

    func destroy() {
        pillWindow.hide()
        contentWindow.hide()
    }
}
