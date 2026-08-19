import AppKit
import Carbon

private func carbonHotKeyHandler(handlerCall: EventHandlerCallRef?, eventRef: EventRef?, userData: UnsafeMutableRawPointer?) -> OSStatus {
    var hotKeyID = EventHotKeyID()
    let err = GetEventParameter(eventRef, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &hotKeyID)
    if err == noErr {
        HotKey.invokeHandler(id: hotKeyID.id)
    }
    return noErr
}

/// Native Carbon EventHotKey implementation for 100% reliable system-wide global shortcuts.
/// Works across Chrome, Xcode, Zoom, and all active macOS applications seamlessly.
enum HotKey {
    private static var hotKeyRefs: [EventHotKeyRef] = []
    private static var handlers: [UInt32: () -> Void] = [:]
    private static var nextHotKeyID: UInt32 = 1
    private static var eventHandlerInstalled = false

    static func invokeHandler(id: UInt32) {
        if let handler = handlers[id] {
            DispatchQueue.main.async {
                handler()
            }
        }
    }

    static func register(keyCode: UInt16,
                         modifiers: NSEvent.ModifierFlags,
                         handler: @escaping () -> Void) {
        if !eventHandlerInstalled {
            setupEventHandler()
        }

        var carbonModifiers: UInt32 = 0
        if modifiers.contains(.command) { carbonModifiers |= UInt32(cmdKey) }
        if modifiers.contains(.option) { carbonModifiers |= UInt32(optionKey) }
        if modifiers.contains(.control) { carbonModifiers |= UInt32(controlKey) }
        if modifiers.contains(.shift) { carbonModifiers |= UInt32(shiftKey) }

        let hotKeyID = EventHotKeyID(signature: OSType(0x48534B59 /* "HSKY" */), id: nextHotKeyID)
        let idVal = nextHotKeyID
        nextHotKeyID += 1
        handlers[idVal] = handler

        var hotKeyRef: EventHotKeyRef?
        let status = RegisterEventHotKey(UInt32(keyCode), carbonModifiers, hotKeyID, GetEventDispatcherTarget(), 0, &hotKeyRef)
        if status == noErr, let ref = hotKeyRef {
            hotKeyRefs.append(ref)
        }

        // Additional NSEvent monitor fallback
        let matches: (NSEvent) -> Bool = { event in
            event.keyCode == keyCode &&
            event.modifierFlags.intersection(.deviceIndependentFlagsMask) == modifiers
        }

        let global = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
            if matches(event) { handler() }
        }
        let local = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            if matches(event) { handler(); return nil }
            return event
        }
        _ = global
        _ = local
    }

    private static func setupEventHandler() {
        eventHandlerInstalled = true
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetEventDispatcherTarget(), carbonHotKeyHandler, 1, &eventType, nil, nil)
    }
}
