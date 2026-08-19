import AppKit

/// Non-activating panel: floats above other apps without stealing key focus,
/// so the underlying meeting window keeps receiving input.
final class OverlayPanel: NSPanel {
    // Must be able to become key so the nav-bar buttons receive clicks, but the
    // nonactivating style keeps the meeting app active in the background.
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

/// A borderless, floating, screen-capture-immune panel hosting any content view.
final class OverlayPanelController: NSWindowController {
    init(content: NSView, size: NSSize, origin: NSPoint) {
        let panel = OverlayPanel(
            contentRect: NSRect(origin: origin, size: size),
            styleMask: [.borderless, .nonactivatingPanel, .resizable],
            backing: .buffered,
            defer: false
        )

        // Privacy: exclude from screen capture at the window-server level.
        panel.sharingType = .none

        // Always-on-top, across all Spaces, non-activating.
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.isFloatingPanel = true
        panel.becomesKeyOnlyIfNeeded = true
        panel.ignoresMouseEvents = false
        panel.isMovableByWindowBackground = true
        panel.titleVisibility = .hidden
        panel.hidesOnDeactivate = false
        panel.contentView = content

        super.init(window: panel)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) unused") }

    override func showWindow(_ sender: Any?) {
        window?.orderFrontRegardless()
    }

    func hide() {
        window?.orderOut(nil)
    }

    var isShown: Bool { window?.isVisible ?? false }
}
