import Foundation

/// A decoded event from the backend (see backend/README.md protocol).
struct BackendEvent: Decodable {
    let type: String
    let text: String?
    let id: String?
    let speaker: String?   // "you" | "interviewer" on conversation events
    let status: String?    // "streaming" | "completed" on conversation events
}

/// Minimal WebSocket client over URLSessionWebSocketTask with auto-reconnect.
/// Callbacks are invoked on the main queue.
final class WebSocketClient {
    private let url: URL
    private var task: URLSessionWebSocketTask?
    private lazy var session = URLSession(configuration: .default)
    private var shouldRun = false
    private var reconnectDelay: TimeInterval = 1.0

    var onEvent: ((BackendEvent) -> Void)?
    var onStateChange: ((Bool) -> Void)?

    init(url: URL) {
        self.url = url
    }

    func connect() {
        shouldRun = true
        openSocket()
    }

    func disconnect() {
        shouldRun = false
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func openSocket() {
        let task = session.webSocketTask(with: url)
        self.task = task
        task.resume()
        notifyState(true)
        reconnectDelay = 1.0
        receive()
        sendPing()
    }

    private func receive() {
        task?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .failure:
                self.notifyState(false)
                self.scheduleReconnect()
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handle(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) { self.handle(text) }
                @unknown default:
                    break
                }
                self.receive() // keep listening
            }
        }
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8),
              let event = try? JSONDecoder().decode(BackendEvent.self, from: data)
        else { return }
        DispatchQueue.main.async { self.onEvent?(event) }
    }

    /// Send a control command to the backend, e.g. "toggle_listening",
    /// "assist", or "ask" (with the typed question as `text`).
    func send(command action: String, text: String? = nil) {
        var dict: [String: Any] = ["type": "cmd", "action": action]
        if let text = text { dict["text"] = text }
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let json = String(data: data, encoding: .utf8) else { return }
        task?.send(.string(json)) { _ in }
    }

    private func sendPing() {
        // App-level keepalive so the server prunes dead overlays.
        let json = #"{"type":"ping"}"#
        task?.send(.string(json)) { _ in }
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let self = self, self.shouldRun, self.task != nil else { return }
            self.sendPing()
        }
    }

    private func scheduleReconnect() {
        guard shouldRun else { return }
        task = nil
        let delay = reconnectDelay
        reconnectDelay = min(reconnectDelay * 2, 10) // exponential backoff, capped
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self, self.shouldRun else { return }
            self.openSocket()
        }
    }

    private func notifyState(_ connected: Bool) {
        DispatchQueue.main.async { self.onStateChange?(connected) }
    }
}
