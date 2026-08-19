// HireSky macOS overlay — entry point.
//
// Boots a borderless, always-on-top, screen-capture-immune window and connects
// to the Python backend's WebSocket server, rendering the streamed copilot
// output. The window uses `NSWindow.sharingType = .none` so it is excluded
// from the OS compositor's capture framebuffer (invisible to Zoom/Meet/OBS).

import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.regular) // show Dock icon / menu bar on launch

let delegate = AppDelegate()
app.delegate = delegate
app.run()
