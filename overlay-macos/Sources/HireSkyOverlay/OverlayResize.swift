import AppKit

// Diagonal resize cursors are private on macOS; look them up by selector with a
// safe fallback so the app still works if they ever disappear.
extension NSCursor {
    static var resizeNWSE: NSCursor { bySelector("_windowResizeNorthWestSouthEastCursor") ?? .resizeUpDown }
    static var resizeNESW: NSCursor { bySelector("_windowResizeNorthEastSouthWestCursor") ?? .resizeUpDown }

    private static func bySelector(_ name: String) -> NSCursor? {
        let sel = NSSelectorFromString(name)
        guard NSCursor.responds(to: sel),
              let result = NSCursor.perform(sel)?.takeUnretainedValue() as? NSCursor
        else { return nil }
        return result
    }
}

/// A transparent view on top of the window that grabs the mouse only in the
/// edge / corner margins to resize the window. Interior clicks fall through
/// (via `hitTest`) so buttons and scrolling still work.
///
/// Resizing runs in a modal event-tracking loop (the same technique AppKit uses
/// for native window resize) so drag events are never coalesced or delayed —
/// giving lag-free, jitter-free live resize. Cursors update instantly through a
/// `.cursorUpdate` tracking area rather than laggy cursor rects.
final class ResizeBorderView: NSView {
    private struct Zone: OptionSet {
        let rawValue: Int
        static let left = Zone(rawValue: 1)
        static let right = Zone(rawValue: 2)
        static let top = Zone(rawValue: 4)
        static let bottom = Zone(rawValue: 8)
    }

    // Generous, forgiving hit areas (invisible).
    private let margin: CGFloat = 14
    private let corner: CGFloat = 22

    override var isFlipped: Bool { false }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    // MARK: Zone detection

    private func zone(at p: NSPoint) -> Zone {
        let b = bounds
        var z: Zone = []
        if p.x <= margin { z.insert(.left) }
        if p.x >= b.maxX - margin { z.insert(.right) }
        if p.y <= margin { z.insert(.bottom) }
        if p.y >= b.maxY - margin { z.insert(.top) }
        // Widen the corners so they're easy to grab.
        let c = corner
        if p.x <= c && p.y >= b.maxY - c { z = [.left, .top] }
        else if p.x >= b.maxX - c && p.y >= b.maxY - c { z = [.right, .top] }
        else if p.x <= c && p.y <= c { z = [.left, .bottom] }
        else if p.x >= b.maxX - c && p.y <= c { z = [.right, .bottom] }
        return z
    }

    private func cursor(for z: Zone) -> NSCursor {
        if (z.contains(.left) && z.contains(.top)) || (z.contains(.right) && z.contains(.bottom)) {
            return .resizeNWSE
        }
        if (z.contains(.right) && z.contains(.top)) || (z.contains(.left) && z.contains(.bottom)) {
            return .resizeNESW
        }
        if z.contains(.left) || z.contains(.right) { return .resizeLeftRight }
        if z.contains(.top) || z.contains(.bottom) { return .resizeUpDown }
        return .arrow
    }

    // MARK: Hit-testing & cursor

    // Capture only in the resize margins; interior passes through.
    override func hitTest(_ aPoint: NSPoint) -> NSView? {
        let local = convert(aPoint, from: superview)
        return zone(at: local).isEmpty ? nil : self
    }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        for ta in trackingAreas { removeTrackingArea(ta) }
        let ta = NSTrackingArea(
            rect: .zero,
            options: [.activeAlways, .cursorUpdate, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(ta)
    }

    override func cursorUpdate(with event: NSEvent) {
        let z = zone(at: convert(event.locationInWindow, from: nil))
        if z.isEmpty { super.cursorUpdate(with: event) }
        else { cursor(for: z).set() }
    }

    // MARK: Resize (modal tracking loop)

    override func mouseDown(with event: NSEvent) {
        guard let win = window else { return }
        let startZone = zone(at: convert(event.locationInWindow, from: nil))
        guard !startZone.isEmpty else { return }

        let startMouse = NSEvent.mouseLocation      // screen coords
        let startFrame = win.frame
        let activeCursor = cursor(for: startZone)
        activeCursor.push()
        defer { NSCursor.pop() }

        trackingLoop: while true {
            guard let e = NSApp.nextEvent(
                matching: [.leftMouseDragged, .leftMouseUp],
                until: .distantFuture,
                inMode: .eventTracking,
                dequeue: true
            ) else { break }

            switch e.type {
            case .leftMouseUp:
                break trackingLoop
            case .leftMouseDragged:
                activeCursor.set()   // keep the resize cursor throughout the drag
                let now = NSEvent.mouseLocation
                let f = frame(from: startFrame, zone: startZone,
                              dx: now.x - startMouse.x, dy: now.y - startMouse.y, win: win)
                win.setFrame(f, display: true, animate: false)
            default:
                break
            }
        }
    }

    private func frame(from f0: NSRect, zone z: Zone, dx: CGFloat, dy: CGFloat, win: NSWindow) -> NSRect {
        let minS = win.minSize, maxS = win.maxSize
        var f = f0
        if z.contains(.right) {
            f.size.width = clamp(f0.width + dx, minS.width, maxS.width)
        }
        if z.contains(.left) {
            let w = clamp(f0.width - dx, minS.width, maxS.width)
            f.origin.x = f0.maxX - w
            f.size.width = w
        }
        if z.contains(.top) {
            f.size.height = clamp(f0.height + dy, minS.height, maxS.height)
        }
        if z.contains(.bottom) {
            let h = clamp(f0.height - dy, minS.height, maxS.height)
            f.origin.y = f0.maxY - h
            f.size.height = h
        }
        return f
    }

    private func clamp(_ v: CGFloat, _ lo: CGFloat, _ hi: CGFloat) -> CGFloat {
        min(max(v, lo), hi)
    }
}
