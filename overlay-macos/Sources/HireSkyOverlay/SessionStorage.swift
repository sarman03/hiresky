import Foundation

class SessionStorage {
    static let shared = SessionStorage()
    
    private let directoryURL: URL
    
    private init() {
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        directoryURL = appSupport.appendingPathComponent("HireSky").appendingPathComponent("Sessions")
        
        try? fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    }
    
    func saveSession(_ session: PastSession) {
        let fileURL = directoryURL.appendingPathComponent("\(session.id).json")
        do {
            let data = try JSONEncoder().encode(session)
            try data.write(to: fileURL)
            print("[SessionStorage] Saved session to \(fileURL.path)")
        } catch {
            print("[SessionStorage] Error saving session: \(error)")
        }
    }
    
    func loadAllSessions() -> [PastSession] {
        var sessions: [PastSession] = []
        let fileManager = FileManager.default
        
        do {
            let fileURLs = try fileManager.contentsOfDirectory(at: directoryURL, includingPropertiesForKeys: [.creationDateKey])
            for url in fileURLs where url.pathExtension == "json" {
                if let data = try? Data(contentsOf: url),
                   let session = try? JSONDecoder().decode(PastSession.self, from: data) {
                    sessions.append(session)
                }
            }
            
            // Sort by file creation date (descending)
            sessions.sort { s1, s2 in
                let u1 = directoryURL.appendingPathComponent("\(s1.id).json")
                let u2 = directoryURL.appendingPathComponent("\(s2.id).json")
                let d1 = (try? u1.resourceValues(forKeys: [.creationDateKey]))?.creationDate ?? Date.distantPast
                let d2 = (try? u2.resourceValues(forKeys: [.creationDateKey]))?.creationDate ?? Date.distantPast
                return d1 > d2
            }
        } catch {
            print("[SessionStorage] Error loading sessions: \(error)")
        }
        
        return sessions
    }
}
