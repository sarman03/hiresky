# HireSky Overlay — macOS (Swift / AppKit)

A borderless, always-on-top, **screen-capture-immune** overlay. It connects to
the backend WebSocket server and renders the streamed copilot output on a
glassmorphism panel in the top-right of your main display.

## Privacy mechanism

The panel sets `NSWindow.sharingType = .none`. macOS's window server then omits
the window from every capture framebuffer, so it is invisible to Zoom, Google
Meet, Teams, QuickTime, and OBS while staying visible on your physical display.

## Build & run

Requires Xcode Command Line Tools (Swift 5.7+), macOS 13+.

```bash
cd overlay-macos
swift run                      # builds and launches the overlay
```

Or open `Package.swift` in Xcode and press Run.

Point it at a non-default backend:

```bash
HIRESKY_WS_URL=ws://127.0.0.1:8765 swift run
```

## Controls

* **⌥⌘H** — toggle overlay visibility (requires Accessibility permission for the
  global shortcut; otherwise works while the overlay is frontmost).
* Drag anywhere on the panel to reposition it.

## Notes

* The app runs as an `.accessory` (no Dock icon / menu bar item).
* It never becomes the key window, so keystrokes keep going to your meeting app.
* If the backend isn't running yet, the client retries with exponential backoff
  and the status dot stays red until it connects.
* To ship a signed `.app`, wrap this target in an Xcode app project or use
  `swift build -c release` and bundle the binary; screen-capture exclusion works
  the same for a plain binary as for a bundled app.
