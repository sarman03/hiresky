import AppKit
import SwiftUI

/// Wires up the dashboard window, the status bar menu item, the two overlays,
/// and the WebSocket connection.
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var dashboardWindow: NSWindow?
    private var loginWindow: NSWindow?
    private var overlays: OverlayController?
    private var client: NativeEngine?
    private var statusItem: NSStatusItem?
    private var isDetectable = false
    private var sessionHistoryWindow: NSWindow?

    // Backend endpoint. Override with the HIRESKY_WS_URL environment variable.
    private var serverURL: URL {
        let raw = ProcessInfo.processInfo.environment["HIRESKY_WS_URL"]
            ?? "ws://127.0.0.1:8765"
        return URL(string: raw)!
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Standard clipboard shortcuts (Cmd+C/V/X/A) for text fields.
        setupEditShortcuts()

        // Set up the persistent menu bar status item
        setupStatusItem()

        checkAuthAndProceed()
    }
    
    private func checkAuthAndProceed() {
        let token = UserDefaults.standard.string(forKey: "auth_token") ?? ""
        if token.isEmpty {
            showLogin()
        } else {
            showDashboard()
        }
    }
    
    private func showLogin() {
        if loginWindow == nil {
            let loginView = LoginView(onLoginSuccess: { [weak self] in
                self?.loginWindow?.close()
                self?.loginWindow = nil
                self?.showDashboard()
            })
            
            let hostingController = NSHostingController(rootView: loginView)
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 480, height: 360),
                styleMask: [.titled, .closable, .fullSizeContentView],
                backing: .buffered,
                defer: false
            )
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.contentViewController = hostingController
            window.center()
            window.isReleasedWhenClosed = false
            self.loginWindow = window
        }
        
        NSApp.setActivationPolicy(.regular)
        loginWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }

    /// Enables Cmd+C / Cmd+V / Cmd+X / Cmd+A inside the app's text fields.
    /// Prevents accidental Cmd+Q or Cmd+W from closing or terminating the overlay app.
    private func setupEditShortcuts() {
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            guard event.modifierFlags.contains(.command) else { return event }
            let key = event.charactersIgnoringModifiers?.lowercased()
            let sel: Selector?
            switch key {
            case "c": sel = #selector(NSText.copy(_:))
            case "v": sel = #selector(NSText.paste(_:))
            case "x": sel = #selector(NSText.cut(_:))
            case "a": sel = #selector(NSText.selectAll(_:))
            case "z": sel = Selector(("undo:"))
            default:  sel = nil
            }
            if let sel = sel, NSApp.sendAction(sel, to: nil, from: nil) {
                return nil   // handled by the focused text field
            }
            return event
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        client?.disconnect()
    }

    private var currentActivePrompt: String {
        guard let savedJSON = UserDefaults.standard.string(forKey: "saved_prompts"),
              let data = savedJSON.data(using: .utf8),
              let items = try? JSONDecoder().decode([PromptItem].self, from: data) else {
            return ""
        }
        
        let selectedID = UserDefaults.standard.string(forKey: "selected_prompt_id")
        if let selectedID = selectedID, let uuid = UUID(uuidString: selectedID) {
            return items.first(where: { $0.id == uuid })?.content ?? ""
        }
        return items.first?.content ?? ""
    }
    
    private var currentActiveInfo: String {
        guard let savedJSON = UserDefaults.standard.string(forKey: "saved_info"),
              let data = savedJSON.data(using: .utf8),
              let items = try? JSONDecoder().decode([InfoItem].self, from: data) else {
            return ""
        }
        
        let selectedID = UserDefaults.standard.string(forKey: "selected_info_id")
        if let selectedID = selectedID, let uuid = UUID(uuidString: selectedID) {
            return items.first(where: { $0.id == uuid })?.content ?? ""
        }
        return items.first?.content ?? ""
    }

    private func showDashboard() {
        if dashboardWindow == nil {
            let dashboardView = DashboardView(
                onPromptChange: { _ in },
                onInfoChange: { _ in },
                onDetectableChange: { [weak self] detectable in
                    self?.isDetectable = detectable
                    self?.applyDetectabilityToOverlays()
                },
                onStart: { [weak self] in
                    self?.startSession()
                }
            )
            
            let hostingController = NSHostingController(rootView: dashboardView)
            
            // Borderless titled window for custom look
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 720, height: 480),
                styleMask: [.titled, .closable, .miniaturizable, .fullSizeContentView],
                backing: .buffered,
                defer: false
            )
            window.title = "HireSky"
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.contentViewController = hostingController
            window.center()
            window.isReleasedWhenClosed = false
            window.sharingType = isDetectable ? .readWrite : .none
            self.dashboardWindow = window
        }
        
        NSApp.setActivationPolicy(.regular)
        dashboardWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func startSession() {
        // Hide the dashboard window
        dashboardWindow?.orderOut(nil)
        
        // Hide the Dock icon (switch app to accessory mode)
        NSApp.setActivationPolicy(.accessory)
        
        let token = UserDefaults.standard.string(forKey: "auth_token") ?? ""
        let userId = UserDefaults.standard.string(forKey: "user_id") ?? ""
        
        guard let url = URL(string: "http://localhost:4000/api/interviews/start") else {
            initializeOverlaysAndEngine(snapshot: nil)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "userId": userId,
            "domain": "TECHNICAL",
            "title": "Live Interview",
            "companyName": "Unknown",
            "jobTitle": "Engineer"
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                var snapshotJson: String? = nil
                
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let snapshot = json["snapshot"] as? [String: Any],
                   let snapshotData = try? JSONSerialization.data(withJSONObject: snapshot),
                   let snapshotString = String(data: snapshotData, encoding: .utf8) {
                    snapshotJson = snapshotString
                }
                
                self?.initializeOverlaysAndEngine(snapshot: snapshotJson)
            }
        }.resume()
    }
    
    private func initializeOverlaysAndEngine(snapshot: String?) {
        // Lazy initialize the overlays and backend connection
        if overlays == nil {
            let overlays = OverlayController()
            self.overlays = overlays

            let client = NativeEngine()
            client.onEvent = { [weak overlays] event in
                DispatchQueue.main.async {
                    overlays?.apply(event: event)
                }
            }
            client.onStateChange = { [weak overlays] connected in
                DispatchQueue.main.async {
                    overlays?.setConnected(connected)
                }
            }
            client.connect()
            self.client = client

            // Route commands (listening toggle, assist, ask) to the backend.
            overlays.onCommand = { [weak client] action, text in
                client?.send(command: action, text: text)
            }
            
            overlays.onLogoClick = { [weak self] in
                self?.showSessionHistory()
            }

            overlays.onEndSession = { [weak self] in
                self?.endSession()
            }

            // Global keyboard shortcuts (Carbon system-wide hotkeys)
            // Cmd+V — toggle voice listening (start / stop).
            HotKey.register(keyCode: 9 /* v */, modifiers: [.command]) { [weak overlays] in
                overlays?.toggleListening()
            }
            // Cmd+T and Ctrl+T — toggle the transcript panel.
            HotKey.register(keyCode: 17 /* t */, modifiers: [.command]) { [weak overlays] in
                overlays?.toggleTranscript()
            }
            HotKey.register(keyCode: 17 /* t */, modifiers: [.control]) { [weak overlays] in
                overlays?.toggleTranscript()
            }
            // Cmd+O — hide / restore all overlays.
            HotKey.register(keyCode: 31 /* o */, modifiers: [.command]) { [weak overlays] in
                overlays?.toggleAll()
            }
            // Cmd+Option+Y — show / restore the Dashboard control window.
            HotKey.register(keyCode: 16 /* y */, modifiers: [.command, .option]) { [weak self] in
                DispatchQueue.main.async {
                    self?.showDashboard()
                }
            }

            // --- 1. Send Transcript Only (Cmd+Option+S) ---
            HotKey.register(keyCode: 1 /* s */, modifiers: [.command, .option]) { [weak overlays] in
                overlays?.finalizeAndAsk()
            }

            // --- 2. Screen Capture Only (Cmd+Option+D) ---
            HotKey.register(keyCode: 2 /* d */, modifiers: [.command, .option]) { [weak overlays] in
                overlays?.analyzeScreenOnly()
            }

            // --- 3. Full Screen + Voice Transcript (Cmd+Option+F) ---
            HotKey.register(keyCode: 3 /* f */, modifiers: [.command, .option]) { [weak overlays] in
                overlays?.analyzeScreen()
            }
        }
        
        // In a complete implementation, this snapshot would be passed to `client.send` or `overlays`
        if let snapshot = snapshot {
            print("Session snapshot received: \(snapshot.prefix(100))...")
            // Example: client?.send(command: "set_context", text: snapshot)
        }
        
        // Display the overlay pill bar and panels
        overlays?.showAll()
        applyDetectabilityToOverlays()
    }
    
    private func applyDetectabilityToOverlays() {
        overlays?.setDetectable(isDetectable)
        
        let type: NSWindow.SharingType = isDetectable ? .readWrite : .none
        dashboardWindow?.sharingType = type
        sessionHistoryWindow?.sharingType = type
    }

    func endSession() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Disconnect and release the engine/client
            self.client?.disconnect()
            self.client = nil
            
            // Hide and release overlays
            self.overlays?.destroy()
            self.overlays = nil
            
            // Restore Dock and Menu Bar activation policy to normal (regular app)
            NSApp.setActivationPolicy(.regular)
            
            // Show Dashboard
            self.showDashboard()
        }
    }
    
    private func showSessionHistory() {
        if sessionHistoryWindow == nil {
            let historyView = SessionHistoryView()
            let hostingController = NSHostingController(rootView: historyView)
            
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 680, height: 440),
                styleMask: [.titled, .closable, .miniaturizable],
                backing: .buffered,
                defer: false
            )
            window.title = "HireSky Session Hub"
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.contentViewController = hostingController
            window.center()
            window.isReleasedWhenClosed = false
            
            window.sharingType = isDetectable ? .readWrite : .none
            self.sessionHistoryWindow = window
        }
        
        sessionHistoryWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Status Bar Menu Bar Item

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "rocket.fill", accessibilityDescription: "HireSky")
            button.imagePosition = .imageLeft
            button.action = #selector(statusItemClicked)
            button.target = self
        }
        
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show Dashboard", action: #selector(menuShowDashboard), keyEquivalent: "d"))
        menu.addItem(NSMenuItem(title: "Toggle Overlay", action: #selector(menuToggleOverlay), keyEquivalent: "o"))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit HireSky", action: #selector(menuQuit), keyEquivalent: "q"))
        statusItem?.menu = menu
    }

    @objc private func statusItemClicked() {
        // Handled by menu
    }

    @objc private func menuShowDashboard() {
        showDashboard()
    }

    @objc private func menuToggleOverlay() {
        overlays?.toggleAll()
    }

    @objc private func menuQuit() {
        NSApplication.shared.terminate(nil)
    }
}
