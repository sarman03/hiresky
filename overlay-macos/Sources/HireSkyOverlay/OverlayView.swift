import AppKit

/// Top-anchored (flipped) container so content grows downward and we can
/// scroll to the newest line at the bottom.
final class FlippedView: NSView {
    override var isFlipped: Bool { true }
}

/// A small copy button that copies its source text field's current text to the
/// clipboard and flashes a checkmark.
final class CopyButton: NSButton {
    private weak var source: NSTextField?

    init(source: NSTextField) {
        self.source = source
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        isBordered = false
        bezelStyle = .regularSquare
        imagePosition = .imageOnly
        contentTintColor = NSColor(white: 1, alpha: 0.5)
        setSymbol("doc.on.doc", weight: .regular)
        target = self
        action = #selector(copyText)
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setSymbol(_ name: String, weight: NSFont.Weight) {
        image = NSImage(systemSymbolName: name, accessibilityDescription: "Copy")?
            .withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: 11, weight: weight))
    }

    @objc private func copyText() {
        guard let text = source?.stringValue, !text.isEmpty else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        // Brief "copied" feedback.
        contentTintColor = NSColor.systemGreen
        setSymbol("checkmark", weight: .bold)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.contentTintColor = NSColor(white: 1, alpha: 0.5)
            self?.setSymbol("doc.on.doc", weight: .regular)
        }
    }
}

/// Shared layout metrics for the overlay windows.
enum OverlayMetrics {
    static let pillW: CGFloat = 240
    static let pillH: CGFloat = 44
    static let pillGap: CGFloat = 2    // pill -> content (attached look)
    static let hGap: CGFloat = 2          // answer <-> transcript
    static let answerW: CGFloat = 760
    static let transW: CGFloat = 340
    static let contentH: CGFloat = 520
    static var fullW: CGFloat { answerW + hGap + transW }
}

// MARK: - Helpers

/// Glassmorphism surface: translucent blur with a subtle dark tint.
/// ``white`` controls how dark the tint is (lower = darker).
private func makeGlass(cornerRadius: CGFloat, white: CGFloat = 0.20) -> NSVisualEffectView {
    let g = NSVisualEffectView()
    g.translatesAutoresizingMaskIntoConstraints = false
    g.material = .hudWindow
    g.blendingMode = .behindWindow
    g.state = .active
    g.wantsLayer = true
    g.layer?.backgroundColor = NSColor(calibratedWhite: white, alpha: 0.35).cgColor
    g.layer?.cornerRadius = cornerRadius
    g.layer?.masksToBounds = true
    g.layer?.borderWidth = 1
    g.layer?.borderColor = NSColor(white: 1, alpha: 0.10).cgColor
    return g
}

/// Dark capsule button with a subtle white highlight along its top edge only.
final class DarkPillButton: NSButton {
    private let topHighlight = CALayer()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.masksToBounds = true
        layer?.backgroundColor = NSColor(calibratedWhite: 0.08, alpha: 1.0).cgColor
        topHighlight.backgroundColor = NSColor(white: 1, alpha: 0.35).cgColor
        layer?.addSublayer(topHighlight)
    }
    required init?(coder: NSCoder) { fatalError() }

    override func layout() {
        super.layout()
        layer?.cornerRadius = bounds.height / 2
        // Thin white line hugging the top curve of the capsule.
        let inset = bounds.height * 0.35
        topHighlight.frame = CGRect(x: inset,
                                    y: bounds.height - 1.5,
                                    width: max(0, bounds.width - inset * 2),
                                    height: 1.5)
    }
}

private func attributed(_ s: String, size: CGFloat, weight: NSFont.Weight,
                        color: NSColor = .white) -> NSAttributedString {
    NSAttributedString(string: s, attributes: [
        .foregroundColor: color,
        .font: NSFont.systemFont(ofSize: size, weight: weight),
    ])
}

private func cleanMarkdown(_ text: String) -> String {
    var cleaned = text
    cleaned = cleaned.replacingOccurrences(of: "```", with: "")
    cleaned = cleaned.replacingOccurrences(of: "***", with: "")
    cleaned = cleaned.replacingOccurrences(of: "**", with: "")
    cleaned = cleaned.replacingOccurrences(of: "`", with: "")
    cleaned = cleaned.replacingOccurrences(of: " - ", with: " • ")
    return cleaned
}



final class PillBarView: NSView {
    private let glass = makeGlass(cornerRadius: OverlayMetrics.pillH / 2, white: 0.12)
    private let logoView = NSImageView()
    private let hideAskButton = DarkPillButton()
    private let squareButton = DarkPillButton()
    private let closeButton = DarkPillButton()

    private var contentShown = true
    private var listening = true

    var onToggleContent: (() -> Void)?
    var onToggleListen: (() -> Void)?
    var onLogoClick: (() -> Void)?
    var onCloseSession: (() -> Void)?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        // Shadow ko thoda kam karte hain taaki clean lage
        wantsLayer = true
        layer?.shadowColor = NSColor.black.cgColor
        layer?.shadowOpacity = 0.6
        layer?.shadowRadius = 10
        layer?.shadowOffset = CGSize(width: 0, height: -4)
        build()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func build() {
        addSubview(glass)
        NSLayoutConstraint.activate([
            glass.leadingAnchor.constraint(equalTo: leadingAnchor),
            glass.trailingAnchor.constraint(equalTo: trailingAnchor),
            glass.topAnchor.constraint(equalTo: topAnchor),
            glass.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        // --- 1. LOGO (same size as the buttons) ---
        logoView.translatesAutoresizingMaskIntoConstraints = false
        logoView.imageScaling = .scaleProportionallyUpOrDown
        logoView.wantsLayer = true

        let logoSize: CGFloat = 35                 // matches button height
        logoView.layer?.cornerRadius = logoSize / 2
        logoView.layer?.masksToBounds = true
        
        let logoGesture = NSClickGestureRecognizer(target: self, action: #selector(logoTapped))
        logoView.addGestureRecognizer(logoGesture)

        if let url = Bundle.module.url(forResource: "logo", withExtension: "png"),
           let img = NSImage(contentsOf: url) {
            logoView.image = img
        } else {
            // Placeholder agar logo na mile, taaki white box na dikhe
            logoView.image = NSImage(systemSymbolName: "person.crop.circle.fill", accessibilityDescription: nil)
            logoView.contentTintColor = NSColor(white: 1, alpha: 0.5)
        }

        // --- 2. HIDE/ASK BUTTON (darker shade + top white highlight
        //        comes from DarkPillButton) ---
        hideAskButton.translatesAutoresizingMaskIntoConstraints = false
        hideAskButton.isBordered = false

        // Alignment fix karne ke liye setting: Image left me, text right me
        hideAskButton.imagePosition = .imageLeft
        hideAskButton.imageHugsTitle = true
        hideAskButton.contentTintColor = .white

        hideAskButton.target = self
        hideAskButton.action = #selector(hideAskTapped)

        // Square (stop / resume listening) round button — same dark style
        squareButton.translatesAutoresizingMaskIntoConstraints = false
        squareButton.isBordered = false
        squareButton.target = self
        squareButton.action = #selector(squareTapped)

        // Close / End Session button
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.isBordered = false
        closeButton.target = self
        closeButton.action = #selector(closeTapped)

        // Logo | Hide | Square | Close — sab me ek jaisa 2px gap
        let stack = NSStackView(views: [logoView, hideAskButton, squareButton, closeButton])
        stack.orientation = .horizontal
        stack.alignment = .centerY
        stack.spacing = 2
        stack.translatesAutoresizingMaskIntoConstraints = false
        glass.addSubview(stack)

        NSLayoutConstraint.activate([
            // Logo Size Constraints (Ab bada dikhega)
            logoView.widthAnchor.constraint(equalToConstant: logoSize),
            logoView.heightAnchor.constraint(equalToConstant: logoSize),
            
            hideAskButton.heightAnchor.constraint(equalToConstant: 35),
            // Width automatic adjust hogi content ke hisaab se, minimum set kar dete hain
            hideAskButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 80),
            
            squareButton.widthAnchor.constraint(equalToConstant: 35),
            squareButton.heightAnchor.constraint(equalToConstant: 35),

            closeButton.widthAnchor.constraint(equalToConstant: 35),
            closeButton.heightAnchor.constraint(equalToConstant: 35),
            
            stack.centerXAnchor.constraint(equalTo: glass.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: glass.centerYAnchor),
            // Stack ko thoda side padding dete hain
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: glass.leadingAnchor, constant: 10),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: glass.trailingAnchor, constant: -10)
        ])

        refreshHideAsk()
        refreshSquare()
        refreshClose()
    }

    private func refreshHideAsk() {
        // Unicode character (⌄) ki jagah SF Symbols use karenge perfect center alignment ke liye
        let symbolName = contentShown ? "chevron.down" : "sparkles"
        let titleText = contentShown ? "Hide" : "Ask"
        
        let config = NSImage.SymbolConfiguration(pointSize: 13, weight: .semibold)
        if let img = NSImage(systemSymbolName: symbolName, accessibilityDescription: nil)?
            .withSymbolConfiguration(config) {
            hideAskButton.image = img
        }
        
        // Font size aur weight text ke liye
        hideAskButton.attributedTitle = attributed(titleText, size: 15, weight: .semibold)
        
        // Thodi padding image aur text ke beech me (AppKit hack)
        if contentShown {
            hideAskButton.imageScaling = .scaleProportionallyDown
            // 'Hide' ke liye chevron thoda niche lagta h baselines ki wajah se, offset de sakte hain agar zarurat ho
        }
    }

    private func refreshSquare() {
        let name = listening ? "stop.fill" : "play.fill"
        let color: NSColor = listening ? .white : NSColor.systemGreen // Play pe green kar diya
        
        if let img = NSImage(systemSymbolName: name, accessibilityDescription: name) {
            let cfg = NSImage.SymbolConfiguration(pointSize: 14, weight: .bold)
            squareButton.image = img.withSymbolConfiguration(cfg)
            squareButton.contentTintColor = color
            squareButton.attributedTitle = NSAttributedString(string: "")
        }
    }

    private func refreshClose() {
        let name = "xmark"
        let color: NSColor = .systemRed
        
        if let img = NSImage(systemSymbolName: name, accessibilityDescription: "End Session") {
            let cfg = NSImage.SymbolConfiguration(pointSize: 13, weight: .bold)
            closeButton.image = img.withSymbolConfiguration(cfg)
            closeButton.contentTintColor = color
            closeButton.attributedTitle = NSAttributedString(string: "")
        }
    }

    @objc private func hideAskTapped() { onToggleContent?() }
    @objc private func squareTapped() { onToggleListen?() }
    @objc private func logoTapped() { onLogoClick?() }
    @objc private func closeTapped() { onCloseSession?() }

    // API
    func setContentShown(_ shown: Bool) { contentShown = shown; refreshHideAsk() }
    func setListening(_ on: Bool) { listening = on; refreshSquare() }
    func setConnected(_ c: Bool) {
        glass.layer?.borderColor = (c ? NSColor(white: 1, alpha: 0.10)
                                      : NSColor.systemRed.withAlphaComponent(0.6)).cgColor
    }
}

// MARK: - Answer card (primary)

final class AnswerCardView: NSView {
    private let glass = makeGlass(cornerRadius: 24)
    private let assistPill = NSButton()
    private let caption = NSTextField(labelWithString: "Viewed screen")
    private let scroll = NSScrollView()
    private let doc = FlippedView()
    private let chatStack = NSStackView()
    /// The assistant bubble currently receiving streamed tokens.
    private var streamBody: NSTextField?
    private var current = ""

    private let inputBox = NSView()
    private let inputField = NSTextField()
    private let sendButton = NSButton()

    var onAssist: (() -> Void)?
    var onAsk: ((String) -> Void)?
    var onChip: ((String) -> Void)?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.shadowColor = NSColor.black.cgColor
        layer?.shadowOpacity = 0.4
        layer?.shadowRadius = 18
        layer?.shadowOffset = CGSize(width: 0, height: -3)
        build()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func chip(_ title: String) -> NSButton {
        let b = NSButton()
        b.translatesAutoresizingMaskIntoConstraints = false
        b.isBordered = false
        b.attributedTitle = attributed(title, size: 14, weight: .medium,
                                       color: NSColor(white: 0.92, alpha: 1))
        b.target = self
        b.action = #selector(chipTapped(_:))
        return b
    }

    private func dot() -> NSTextField {
        let d = NSTextField(labelWithString: "·")
        d.font = .systemFont(ofSize: 14, weight: .bold)
        d.textColor = NSColor(white: 0.5, alpha: 1)
        return d
    }

    private func build() {
        addSubview(glass)
        NSLayoutConstraint.activate([
            glass.leadingAnchor.constraint(equalTo: leadingAnchor),
            glass.trailingAnchor.constraint(equalTo: trailingAnchor),
            glass.topAnchor.constraint(equalTo: topAnchor),
            glass.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        // Blue "Assist" pill (top-right) — hidden until the user taps the
        // ✦ Assist chip, to keep the UI uncluttered.
        assistPill.translatesAutoresizingMaskIntoConstraints = false
        assistPill.isBordered = false
        assistPill.wantsLayer = true
        assistPill.layer?.cornerRadius = 17
        assistPill.layer?.backgroundColor = NSColor(calibratedRed: 0.16, green: 0.35, blue: 0.85, alpha: 1).cgColor
        assistPill.attributedTitle = attributed("   Assist   ", size: 15, weight: .semibold)
        assistPill.target = self
        assistPill.action = #selector(assistTapped)
        assistPill.isHidden = true

        // Caption
        caption.font = .systemFont(ofSize: 15, weight: .regular)
        caption.textColor = NSColor(white: 0.55, alpha: 1)
        caption.translatesAutoresizingMaskIntoConstraints = false

        // Chat conversation (user + assistant messages)
        chatStack.orientation = .vertical
        chatStack.alignment = .width
        chatStack.spacing = 12
        chatStack.translatesAutoresizingMaskIntoConstraints = false

        doc.translatesAutoresizingMaskIntoConstraints = false
        doc.addSubview(chatStack)

        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.drawsBackground = false
        scroll.hasVerticalScroller = true
        scroll.borderType = .noBorder
        scroll.documentView = doc

        // Action chips row
        let chips = NSStackView(views: [
            chip("✦ Assist"), dot(),
            chip("✨ What should I say?"),
        ])
        chips.orientation = .horizontal
        chips.alignment = .centerY
        chips.spacing = 10
        chips.translatesAutoresizingMaskIntoConstraints = false

        // Input box
        inputBox.translatesAutoresizingMaskIntoConstraints = false
        inputBox.wantsLayer = true
        inputBox.layer?.cornerRadius = 16
        inputBox.layer?.backgroundColor = NSColor(white: 1, alpha: 0.05).cgColor
        inputBox.layer?.borderWidth = 1
        inputBox.layer?.borderColor = NSColor(white: 1, alpha: 0.15).cgColor

        inputField.translatesAutoresizingMaskIntoConstraints = false
        inputField.isBezeled = false
        inputField.drawsBackground = false
        inputField.focusRingType = .none
        inputField.font = .systemFont(ofSize: 16)
        inputField.textColor = .white
        inputField.placeholderAttributedString = attributed(
            "Ask about your screen or conversation, or ⌘ ↵ for Assist",
            size: 16, weight: .regular, color: NSColor(white: 0.55, alpha: 1))
        inputField.target = self
        inputField.action = #selector(sendTapped)

        let smart = NSTextField(labelWithString: "  ⚡ Smart  ")
        smart.font = .systemFont(ofSize: 13, weight: .medium)
        smart.textColor = NSColor(white: 0.8, alpha: 1)
        smart.wantsLayer = true
        smart.layer?.cornerRadius = 12
        smart.layer?.borderWidth = 1
        smart.layer?.borderColor = NSColor(white: 1, alpha: 0.18).cgColor
        smart.translatesAutoresizingMaskIntoConstraints = false

        sendButton.translatesAutoresizingMaskIntoConstraints = false
        sendButton.isBordered = false
        sendButton.wantsLayer = true
        sendButton.layer?.cornerRadius = 16
        sendButton.layer?.backgroundColor = NSColor(calibratedRed: 0.16, green: 0.35, blue: 0.85, alpha: 1).cgColor
        if let img = NSImage(systemSymbolName: "arrowtriangle.right.fill",
                             accessibilityDescription: "send") {
            let cfg = NSImage.SymbolConfiguration(pointSize: 12, weight: .bold)
            sendButton.image = img.withSymbolConfiguration(cfg)
            sendButton.contentTintColor = .white
        } else {
            sendButton.attributedTitle = attributed("▶", size: 13, weight: .bold)
        }
        sendButton.target = self
        sendButton.action = #selector(sendTapped)

        inputBox.addSubview(inputField)
        inputBox.addSubview(smart)
        inputBox.addSubview(sendButton)

        glass.addSubview(assistPill)
        glass.addSubview(caption)
        glass.addSubview(scroll)
        glass.addSubview(chips)
        glass.addSubview(inputBox)

        // One consistent padding everywhere.
        let pad: CGFloat = 20
        NSLayoutConstraint.activate([
            assistPill.topAnchor.constraint(equalTo: glass.topAnchor, constant: pad - 2),
            assistPill.trailingAnchor.constraint(equalTo: glass.trailingAnchor, constant: -pad),
            assistPill.heightAnchor.constraint(equalToConstant: 34),

            caption.topAnchor.constraint(equalTo: glass.topAnchor, constant: pad),
            caption.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: pad),

            scroll.topAnchor.constraint(equalTo: caption.bottomAnchor, constant: 10),
            scroll.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: pad),
            scroll.trailingAnchor.constraint(equalTo: glass.trailingAnchor, constant: -pad),
            scroll.bottomAnchor.constraint(equalTo: chips.topAnchor, constant: -14),

            doc.leadingAnchor.constraint(equalTo: scroll.contentView.leadingAnchor),
            doc.trailingAnchor.constraint(equalTo: scroll.contentView.trailingAnchor),
            doc.topAnchor.constraint(equalTo: scroll.contentView.topAnchor),
            doc.widthAnchor.constraint(equalTo: scroll.contentView.widthAnchor),

            chatStack.leadingAnchor.constraint(equalTo: doc.leadingAnchor),
            chatStack.trailingAnchor.constraint(equalTo: doc.trailingAnchor),
            chatStack.topAnchor.constraint(equalTo: doc.topAnchor),
            chatStack.bottomAnchor.constraint(equalTo: doc.bottomAnchor),

            chips.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: pad),
            chips.bottomAnchor.constraint(equalTo: inputBox.topAnchor, constant: -14),
            chips.heightAnchor.constraint(equalToConstant: 24),

            inputBox.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: pad),
            inputBox.trailingAnchor.constraint(equalTo: glass.trailingAnchor, constant: -pad),
            inputBox.bottomAnchor.constraint(equalTo: glass.bottomAnchor, constant: -pad),
            inputBox.heightAnchor.constraint(equalToConstant: 92),

            inputField.topAnchor.constraint(equalTo: inputBox.topAnchor, constant: 16),
            inputField.leadingAnchor.constraint(equalTo: inputBox.leadingAnchor, constant: 16),
            inputField.trailingAnchor.constraint(equalTo: inputBox.trailingAnchor, constant: -56),

            // Smart chip: same baseline row as the send button, vertically
            // centered against it so the bottom row lines up perfectly.
            smart.leadingAnchor.constraint(equalTo: inputBox.leadingAnchor, constant: 16),
            smart.centerYAnchor.constraint(equalTo: sendButton.centerYAnchor),
            smart.heightAnchor.constraint(equalToConstant: 26),

            sendButton.trailingAnchor.constraint(equalTo: inputBox.trailingAnchor, constant: -12),
            sendButton.bottomAnchor.constraint(equalTo: inputBox.bottomAnchor, constant: -12),
            sendButton.widthAnchor.constraint(equalToConstant: 32),
            sendButton.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    // MARK: - Chat bubbles

    /// Right-aligned blue bubble for what the user asked.
    func addUserMessage(_ text: String) {
        let bubble = NSView()
        bubble.translatesAutoresizingMaskIntoConstraints = false
        bubble.wantsLayer = true
        bubble.layer?.cornerRadius = 14
        bubble.layer?.backgroundColor = NSColor(calibratedRed: 0.16, green: 0.35, blue: 0.85, alpha: 0.85).cgColor

        let body = NSTextField(wrappingLabelWithString: text)
        body.font = .systemFont(ofSize: 13.5)
        body.textColor = .white
        body.isSelectable = true
        body.maximumNumberOfLines = 0
        body.preferredMaxLayoutWidth = 460
        body.translatesAutoresizingMaskIntoConstraints = false

        bubble.addSubview(body)
        NSLayoutConstraint.activate([
            body.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 8),
            body.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 12),
            body.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -12),
            body.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -8),
        ])

        let row = NSView()
        row.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(bubble)
        NSLayoutConstraint.activate([
            bubble.topAnchor.constraint(equalTo: row.topAnchor),
            bubble.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            bubble.trailingAnchor.constraint(equalTo: row.trailingAnchor),
            bubble.widthAnchor.constraint(lessThanOrEqualTo: row.widthAnchor, multiplier: 0.75),
            bubble.leadingAnchor.constraint(greaterThanOrEqualTo: row.leadingAnchor),
        ])
        chatStack.addArrangedSubview(row)
        scrollToBottom()
    }

    /// Left-aligned assistant message; returns the text field tokens stream into.
    @discardableResult
    private func addAssistantMessage(_ text: String) -> NSTextField {
        let bubble = NSView()
        bubble.translatesAutoresizingMaskIntoConstraints = false
        bubble.wantsLayer = true
        bubble.layer?.cornerRadius = 14
        bubble.layer?.backgroundColor = NSColor(white: 1, alpha: 0.07).cgColor

        let body = NSTextField(wrappingLabelWithString: text)
        body.font = .systemFont(ofSize: 13.5)
        body.textColor = NSColor(white: 0.97, alpha: 1)
        body.isSelectable = true            // easy to read, select, and copy
        body.maximumNumberOfLines = 0
        body.preferredMaxLayoutWidth = 560
        body.translatesAutoresizingMaskIntoConstraints = false

        let copy = CopyButton(source: body)

        bubble.addSubview(body)
        bubble.addSubview(copy)
        NSLayoutConstraint.activate([
            body.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 10),
            body.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 14),
            body.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -14),
            copy.topAnchor.constraint(equalTo: body.bottomAnchor, constant: 4),
            copy.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -10),
            copy.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -6),
            copy.widthAnchor.constraint(equalToConstant: 18),
            copy.heightAnchor.constraint(equalToConstant: 16),
        ])

        let row = NSView()
        row.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(bubble)
        NSLayoutConstraint.activate([
            bubble.topAnchor.constraint(equalTo: row.topAnchor),
            bubble.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            bubble.leadingAnchor.constraint(equalTo: row.leadingAnchor),
            bubble.widthAnchor.constraint(lessThanOrEqualTo: row.widthAnchor, multiplier: 0.92),
            bubble.trailingAnchor.constraint(lessThanOrEqualTo: row.trailingAnchor),
        ])
        chatStack.addArrangedSubview(row)
        scrollToBottom()
        return body
    }

    private func scrollToBottom() {
        layoutSubtreeIfNeeded()
        doc.scrollToVisible(NSRect(x: 0, y: max(0, doc.bounds.height - 1), width: 1, height: 1))
    }

    @objc private func assistTapped() { onAssist?() }
    @objc private func chipTapped(_ sender: NSButton) {
        let title = sender.attributedTitle.string.trimmingCharacters(in: .whitespaces)
        // The blue Assist pill only appears once the user opts into Assist.
        if title.contains("Assist") { assistPill.isHidden = false }
        onChip?(title)
    }
    @objc private func sendTapped() {
        let text = inputField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputField.stringValue = ""
        onAsk?(text)
    }

    // API — streaming goes into a fresh assistant chat message.
    func answerStart() {
        current = ""
        streamBody = addAssistantMessage("…")
    }
    func appendToken(_ t: String) {
        guard let body = streamBody else { return }
        if current.isEmpty { body.stringValue = "" }
        current += t
        body.stringValue = cleanMarkdown(current)
        // scrollToBottom() // Commented out to stay at starting of answer
    }
    func answerEnd() {
        streamBody = nil
    }
    func setCaption(_ text: String) { caption.stringValue = text }
    /// Show a one-off system note (e.g. a permission/capture warning) as a
    /// left-aligned assistant message so the user actually sees it.
    func showNote(_ text: String) { _ = addAssistantMessage(text) }
}

// MARK: - Transcript panel (right)

final class TranscriptView: NSView {
    private let glass = makeGlass(cornerRadius: 24)
    private let scroll = NSScrollView()
    private let doc = FlippedView()
    private let stack = NSStackView()
    private var openBody: [String: NSTextField] = [:]

    // Interviewer = light/white bubble on the left; You = blue bubble on the right.
    private let themBubble = NSColor(calibratedWhite: 0.98, alpha: 0.16).cgColor
    private let youBubble = NSColor(calibratedRed: 0.20, green: 0.50, blue: 0.95, alpha: 0.70).cgColor

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.shadowColor = NSColor.black.cgColor
        layer?.shadowOpacity = 0.4
        layer?.shadowRadius = 18
        layer?.shadowOffset = CGSize(width: 0, height: -3)
        build()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func build() {
        addSubview(glass)
        NSLayoutConstraint.activate([
            glass.leadingAnchor.constraint(equalTo: leadingAnchor),
            glass.trailingAnchor.constraint(equalTo: trailingAnchor),
            glass.topAnchor.constraint(equalTo: topAnchor),
            glass.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        let caption = NSTextField(labelWithString: "LIVE TRANSCRIPT")
        caption.font = .systemFont(ofSize: 10, weight: .bold)
        caption.textColor = NSColor(white: 0.6, alpha: 1)
        caption.translatesAutoresizingMaskIntoConstraints = false

        stack.orientation = .vertical
        stack.alignment = .width
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false

        doc.translatesAutoresizingMaskIntoConstraints = false
        doc.addSubview(stack)

        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.drawsBackground = false
        scroll.hasVerticalScroller = true
        scroll.borderType = .noBorder
        scroll.documentView = doc
        glass.addSubview(caption)
        glass.addSubview(scroll)

        NSLayoutConstraint.activate([
            caption.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: 14),
            caption.topAnchor.constraint(equalTo: glass.topAnchor, constant: 16),

            scroll.leadingAnchor.constraint(equalTo: glass.leadingAnchor, constant: 10),
            scroll.trailingAnchor.constraint(equalTo: glass.trailingAnchor, constant: -10),
            scroll.topAnchor.constraint(equalTo: caption.bottomAnchor, constant: 8),
            scroll.bottomAnchor.constraint(equalTo: glass.bottomAnchor, constant: -12),

            doc.leadingAnchor.constraint(equalTo: scroll.contentView.leadingAnchor),
            doc.trailingAnchor.constraint(equalTo: scroll.contentView.trailingAnchor),
            doc.topAnchor.constraint(equalTo: scroll.contentView.topAnchor),
            doc.widthAnchor.constraint(equalTo: scroll.contentView.widthAnchor),

            stack.leadingAnchor.constraint(equalTo: doc.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: doc.trailingAnchor),
            stack.topAnchor.constraint(equalTo: doc.topAnchor),
            stack.bottomAnchor.constraint(equalTo: doc.bottomAnchor),
        ])
    }

    /// Apply a structured conversation event. One chat bubble per message id:
    /// "streaming" updates the same bubble in place; "completed" locks it so
    /// the next message starts a fresh bubble. No full-transcript re-render —
    /// only the active message's text field changes.
    func applyConversation(id: String, speaker: String, status: String, text: String) {
        guard !text.isEmpty else { return }
        if let body = openBody[id] {
            body.stringValue = text
        } else {
            openBody[id] = addBubble(text: text, speaker: speaker)
        }
        if status == "completed" { openBody[id] = nil }
        scrollToBottom()
    }

    @discardableResult
    private func addBubble(text: String, speaker: String) -> NSTextField {
        let isYou = (speaker == "you")

        let bubble = NSView()
        bubble.translatesAutoresizingMaskIntoConstraints = false
        bubble.wantsLayer = true
        bubble.layer?.cornerRadius = 12
        bubble.layer?.backgroundColor = isYou ? youBubble : themBubble

        let name = NSTextField(labelWithString: isYou ? "You" : "Interviewer")
        name.font = .systemFont(ofSize: 9, weight: .semibold)
        name.textColor = NSColor(white: 1, alpha: 0.6)
        name.translatesAutoresizingMaskIntoConstraints = false

        let body = NSTextField(wrappingLabelWithString: text)
        body.font = .systemFont(ofSize: 13)
        body.textColor = NSColor(white: 0.98, alpha: 1)
        body.maximumNumberOfLines = 0
        body.preferredMaxLayoutWidth = 300
        body.translatesAutoresizingMaskIntoConstraints = false
        body.isSelectable = true

        let copy = CopyButton(source: body)

        bubble.addSubview(name)
        bubble.addSubview(body)
        bubble.addSubview(copy)
        NSLayoutConstraint.activate([
            name.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 6),
            name.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 10),
            name.trailingAnchor.constraint(lessThanOrEqualTo: bubble.trailingAnchor, constant: -10),
            body.topAnchor.constraint(equalTo: name.bottomAnchor, constant: 2),
            body.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 10),
            body.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -10),
            copy.topAnchor.constraint(equalTo: body.bottomAnchor, constant: 3),
            copy.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -8),
            copy.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -6),
            copy.widthAnchor.constraint(equalToConstant: 18),
            copy.heightAnchor.constraint(equalToConstant: 16),
        ])

        let row = NSView()
        row.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(bubble)
        // Centered / full-width bubble with a 2px gap on each side.
        NSLayoutConstraint.activate([
            bubble.topAnchor.constraint(equalTo: row.topAnchor),
            bubble.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            bubble.leadingAnchor.constraint(equalTo: row.leadingAnchor, constant: 2),
            bubble.trailingAnchor.constraint(equalTo: row.trailingAnchor, constant: -2),
        ])

        stack.addArrangedSubview(row)

        // Smooth appear animation for new messages.
        row.alphaValue = 0
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.18
            row.animator().alphaValue = 1
        }
        return body
    }

    private func scrollToBottom() {
        layoutSubtreeIfNeeded()
        doc.scrollToVisible(NSRect(x: 0, y: max(0, doc.bounds.height - 1), width: 1, height: 1))
    }
}

// MARK: - Content root: answer card + transcript + resize border

final class ContentRootView: NSView {
    let answerCard = AnswerCardView(frame: .zero)
    let transcriptView = TranscriptView(frame: .zero)
    let resizeBorder = ResizeBorderView(frame: .zero)

    var transcriptShown = false { didSet { needsLayout = true } }

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        addSubview(answerCard)
        addSubview(transcriptView)
        addSubview(resizeBorder)     // topmost: grabs edges, passes interior through
        transcriptView.isHidden = true
    }
    required init?(coder: NSCoder) { fatalError() }

    override var isFlipped: Bool { false }

    override func layout() {
        super.layout()
        let b = bounds
        let M = OverlayMetrics.self
        if transcriptShown {
            transcriptView.isHidden = false
            let aw = b.width - M.hGap - M.transW
            answerCard.frame = NSRect(x: 0, y: 0, width: aw, height: b.height)
            transcriptView.frame = NSRect(x: aw + M.hGap, y: 0, width: M.transW, height: b.height)
        } else {
            transcriptView.isHidden = true
            answerCard.frame = NSRect(x: 0, y: 0, width: b.width, height: b.height)
        }
        resizeBorder.frame = b
    }
}
