import SwiftUI
import UniformTypeIdentifiers

struct PromptItem: Identifiable, Codable, Equatable {
    var id = UUID()
    var title: String
    var content: String
}

struct InfoItem: Identifiable, Codable, Equatable {
    var id = UUID()
    var title: String
    var content: String
}

struct DashboardView: View {
    @State private var isDetectable: Bool = false
    var onPromptChange: (String) -> Void
    var onInfoChange: (String) -> Void
    var onDetectableChange: (Bool) -> Void
    var onStart: () -> Void
    
    // Persistent storage using AppStorage (encoded as JSON string)
    @AppStorage("saved_prompts") private var savedPromptsJSON: String = ""
    @AppStorage("selected_prompt_id") private var selectedPromptIDString: String = ""
    
    @AppStorage("saved_info") private var savedInfoJSON: String = ""
    @AppStorage("selected_info_id") private var selectedInfoIDString: String = ""
    @AppStorage("gemini_api_key") private var geminiAPIKey: String = ""
    
    @State private var showPromptManager: Bool = false
    @State private var showInfoManager: Bool = false
    @State private var isScanning: Bool = false
    
    // Prompt state
    @State private var editingTitle: String = ""
    @State private var editingContent: String = ""
    @State private var activePromptID: UUID? = nil
    
    // Info state
    @State private var editingInfoTitle: String = ""
    @State private var editingInfoContent: String = ""
    @State private var activeInfoID: UUID? = nil
    
    // Computed property for parsing saved prompts
    private var prompts: [PromptItem] {
        get {
            guard let data = savedPromptsJSON.data(using: .utf8),
                  let items = try? JSONDecoder().decode([PromptItem].self, from: data) else {
                return []
            }
            return items
        }
        nonmutating set {
            if let data = try? JSONEncoder().encode(newValue),
               let str = String(data: data, encoding: .utf8) {
                savedPromptsJSON = str
            }
        }
    }
    
    // Computed property for parsing saved info
    private var infoItems: [InfoItem] {
        get {
            guard let data = savedInfoJSON.data(using: .utf8),
                  let items = try? JSONDecoder().decode([InfoItem].self, from: data) else {
                return []
            }
            return items
        }
        nonmutating set {
            if let data = try? JSONEncoder().encode(newValue),
               let str = String(data: data, encoding: .utf8) {
                savedInfoJSON = str
            }
        }
    }
    
    let examplePromptTemplate = """
You are HireSky, an expert coding interviewer and assistant. When the user asks a coding or algorithmic question, follow this structure precisely:

1. BRUTE-FORCE APPROACH
   - Explain the brute-force idea clearly.
   - Provide the complete, working code.
   - Time & Space complexity (O-notation).

2. OPTIMIZED APPROACH
   - Explain how to optimize (e.g. dynamic programming, two pointers, hash map).
   - Provide the complete, commented optimized code.
   - Time & Space complexity.

3. KEY CONSIDERATIONS
   - Edge cases to consider.
   - Suggest 2 sharp follow-up questions to ask the interviewer.

Be concise but thorough.
"""

    let exampleInfoTemplate = """
CANDIDATE PROFILE:
Name: Akash Sharma
Role: Software Engineer (Full Stack)

TECHNICAL SKILLS:
- Languages: Python, JavaScript, TypeScript, Swift, Go
- Frameworks: React, Node.js, FastAPI, SwiftUI, Next.js
- Databases: PostgreSQL, MongoDB, Redis
- Cloud & Tools: AWS, Docker, Kubernetes, Git, CI/CD

KEY PROJECTS:
1. HireSky (Real-time Copilot)
   - Built a low-latency meeting assistant using Python, SwiftUI, and WebSocket.
   - Integrated Gemini Flash Lite API for real-time transcription and prompt answers.
   - Excluded overlay windows from screen sharing using native macOS APIs.

2. E-Commerce Platform
   - Designed a scalable microservices architecture handling 10k+ requests per minute.
   - Reduced database latency by 40% through Redis caching strategies.

WORK EXPERIENCE:
- Senior Engineer at TechCorp (2024 - Present): Led front-end migration to SwiftUI.
- Software Engineer at DevSolutions (2022 - 2024): Maintained legacy backend APIs.
"""

    var body: some View {
        let detectableBinding = Binding<Bool>(
            get: { self.isDetectable },
            set: { newValue in
                self.isDetectable = newValue
                self.onDetectableChange(newValue)
            }
        )
        
        return ZStack {
            // Dark gray background
            Color(red: 0.08, green: 0.08, blue: 0.08)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top Header / Navigation Row
                HStack(spacing: 12) {
                    // Green Badge
                    Link(destination: URL(string: "https://hiresky.app")!) {
                        HStack(spacing: 4) {
                            Text("What's new in HireSky v2.0")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(red: 0.16, green: 0.8, blue: 0.38))
                            Image(systemName: "arrow.up.forward")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Color(red: 0.16, green: 0.8, blue: 0.38))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(Color(red: 0.16, green: 0.8, blue: 0.38).opacity(0.15))
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    // Gemini API Key Input
                    HStack(spacing: 8) {
                        Image(systemName: "key.fill")
                            .foregroundColor(.gray)
                            .font(.system(size: 11))
                        SecureField("Enter Gemini API Key...", text: $geminiAPIKey)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .frame(width: 260)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(red: 0.15, green: 0.15, blue: 0.15))
                    )
                    
                    Spacer()
                    
                    // Refer a Friend button
                    Button(action: {
                        if let url = URL(string: "https://hiresky.app/referrals") {
                            NSWorkspace.shared.open(url)
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "gift.fill")
                                .font(.system(size: 11))
                            Text("Refer & Earn")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(Color(red: 0.16, green: 0.8, blue: 0.38))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Color(red: 0.16, green: 0.8, blue: 0.38).opacity(0.12))
                        )
                        .overlay(
                            Capsule()
                                .stroke(Color(red: 0.16, green: 0.8, blue: 0.38).opacity(0.3), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    
                    // Start Button (Top Right)
                    Button(action: onStart) {
                        HStack(spacing: 6) {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 12))
                            Text("Start HireSky")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            LinearGradient(
                                colors: [Color(red: 0.22, green: 0.55, blue: 1.0), Color(red: 0.43, green: 0.27, blue: 1.0)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 24)
                
                // Second Row: Brand + Toggle + Meeting limit
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 12) {
                            Text("HireSky")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.white)
                            
                            Button(action: {
                                // Reload action (could clear form or reload prompt)
                                if showPromptManager {
                                    if let activeID = activePromptID, let item = prompts.first(where: { $0.id == activeID }) {
                                        editingTitle = item.title
                                        editingContent = item.content
                                    }
                                } else if showInfoManager {
                                    if let activeID = activeInfoID, let item = infoItems.first(where: { $0.id == activeID }) {
                                        editingInfoTitle = item.title
                                        editingInfoContent = item.content
                                    }
                                }
                            }) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .buttonStyle(.plain)
                            
                            // Detectable toggle pill
                            HStack(spacing: 6) {
                                Image(systemName: isDetectable ? "eye" : "eye.slash")
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                                Text("Detectable")
                                    .font(.system(size: 12))
                                    .foregroundColor(.gray)
                                Toggle("", isOn: detectableBinding)
                                    .toggleStyle(SwitchToggleStyle(tint: .blue))
                                    .labelsHidden()
                                    .scaleEffect(0.7)
                                    .frame(width: 36)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(red: 0.15, green: 0.15, blue: 0.15))
                            )
                        }
                        
                        Button(action: {}) {
                            Text("Link your calendar")
                                .foregroundColor(.blue)
                                .font(.system(size: 13, weight: .semibold))
                            + Text(" to get notifications for upcoming meetings.")
                                .foregroundColor(.gray)
                                .font(.system(size: 13))
                        }
                        .buttonStyle(.plain)
                        
                    }
                    
                    Spacer()
                    
                    Text("Unlimited meetings")
                        .font(.system(size: 12))
                        .foregroundColor(.gray.opacity(0.7))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 30)
                
                // Central Workspace Area
                if !showPromptManager && !showInfoManager {
                    // Original start first session view
                    VStack(spacing: 20) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(red: 0.14, green: 0.14, blue: 0.14))
                                .frame(width: 54, height: 54)
                            Image(systemName: "desktopcomputer")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                        }
                        
                        VStack(spacing: 8) {
                            Text("Start your first session")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            
                            Text("HireSky provides live AI help during your conversation\nand generates searchable summaries afterwards.")
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                        }
                        
                        Button(action: onStart) {
                            Text("Start HireSky")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 8)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color(red: 0.18, green: 0.18, blue: 0.18))
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(red: 0.28, green: 0.28, blue: 0.28), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                        
                        HStack(spacing: 16) {
                            // Card 1: Custom Prompts
                            Button(action: {
                                showPromptManager = true
                            }) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Image(systemName: "terminal.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(.blue)
                                        Text("Custom Prompts")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                    Text("Configure LLM persona & system instructions.")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                        .multilineTextAlignment(.leading)
                                        .lineLimit(2)
                                }
                                .padding(12)
                                .frame(width: 170, height: 80)
                                .background(Color(white: 0.14))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(white: 0.2), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)

                            // Card 2: Candidate Resume
                            Button(action: {
                                showInfoManager = true
                            }) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Image(systemName: "doc.text.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(.green)
                                        Text("Candidate Info")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                    Text("Upload & scan resume to prefer candidate info.")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                        .multilineTextAlignment(.leading)
                                        .lineLimit(2)
                                }
                                .padding(12)
                                .frame(width: 170, height: 80)
                                .background(Color(white: 0.14))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(white: 0.2), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.top, 12)
                    }
                    .padding(.vertical, 40)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(red: 0.18, green: 0.18, blue: 0.18), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .background(Color(red: 0.1, green: 0.1, blue: 0.1).opacity(0.3))
                    )
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                } else if showPromptManager {
                    // Split-View Prompt Manager Layout
                    HStack(spacing: 16) {
                        // Left Column: Saved Prompts List
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 8) {
                                Button(action: {
                                    showPromptManager = false
                                }) {
                                    Image(systemName: "chevron.left")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.gray)
                                }
                                .buttonStyle(.plain)
                                
                                Text("Saved Prompts")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Button(action: {
                                    activePromptID = nil
                                    editingTitle = ""
                                    editingContent = ""
                                }) {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(.blue)
                                }
                                .buttonStyle(.plain)
                            }
                            
                            ScrollView {
                                VStack(spacing: 6) {
                                    ForEach(prompts) { item in
                                        HStack {
                                            Text(item.title)
                                                .font(.system(size: 12, weight: activePromptID == item.id ? .bold : .regular))
                                                .foregroundColor(activePromptID == item.id ? .white : .gray)
                                                .lineLimit(1)
                                            Spacer()
                                            if activePromptID == item.id {
                                                Circle()
                                                    .fill(Color.blue)
                                                    .frame(width: 6, height: 6)
                                            }
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 6)
                                                .fill(activePromptID == item.id ? Color(white: 0.18) : Color.clear)
                                        )
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            activePromptID = item.id
                                            selectedPromptIDString = item.id.uuidString
                                            editingTitle = item.title
                                            editingContent = item.content
                                            onPromptChange(item.content)
                                        }
                                    }
                                }
                            }
                        }
                        .frame(width: 180)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 10)
                        .background(Color(white: 0.11))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(white: 0.15), lineWidth: 1)
                        )
                        
                        // Right Column: Editor Workspace
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                TextField("Prompt Title (e.g. Custom Template)", text: $editingTitle)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color(white: 0.15))
                                    .cornerRadius(6)
                                
                                Spacer()
                                
                                Button(action: {
                                    editingContent = examplePromptTemplate
                                    if editingTitle.isEmpty {
                                        editingTitle = "Example Prompt"
                                    }
                                }) {
                                    Text("Load Example Prompt")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.blue)
                                }
                                .buttonStyle(.plain)
                            }
                            
                            Text("Configure instructions (500-1000 words example) for your AI assistant:")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            
                            // Native TextEditor for multi-line content
                            TextEditor(text: $editingContent)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(.white)
                                .padding(4)
                                .background(Color(white: 0.13))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(white: 0.2), lineWidth: 1)
                                )
                                .frame(height: 140)
                            
                            HStack {
                                Button(action: {
                                    savePrompt()
                                }) {
                                    Text(activePromptID == nil ? "Create Prompt" : "Save Changes")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 6)
                                        .background(Color.blue)
                                        .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
                                
                                if activePromptID != nil {
                                    Button(action: {
                                        deletePrompt()
                                    }) {
                                        Text("Delete")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.red.opacity(0.15))
                                            .cornerRadius(6)
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                Spacer()
                                
                                Text("\(editingContent.split(separator: " ").count) words")
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 12)
                        .background(Color(white: 0.11))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(white: 0.15), lineWidth: 1)
                        )
                    }
                    .frame(height: 260)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                } else if showInfoManager {
                    // Split-View Candidate Info Manager Layout
                    HStack(spacing: 16) {
                        // Left Column: Saved Info List
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 8) {
                                Button(action: {
                                    showInfoManager = false
                                }) {
                                    Image(systemName: "chevron.left")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.gray)
                                }
                                .buttonStyle(.plain)
                                
                                Text("Saved Info")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Button(action: {
                                    activeInfoID = nil
                                    editingInfoTitle = ""
                                    editingInfoContent = ""
                                }) {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(.blue)
                                }
                                .buttonStyle(.plain)
                            }
                            
                            ScrollView {
                                VStack(spacing: 6) {
                                    ForEach(infoItems) { item in
                                        HStack {
                                            Text(item.title)
                                                .font(.system(size: 12, weight: activeInfoID == item.id ? .bold : .regular))
                                                .foregroundColor(activeInfoID == item.id ? .white : .gray)
                                                .lineLimit(1)
                                            Spacer()
                                            if activeInfoID == item.id {
                                                Circle()
                                                    .fill(Color.blue)
                                                    .frame(width: 6, height: 6)
                                            }
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 6)
                                                .fill(activeInfoID == item.id ? Color(white: 0.18) : Color.clear)
                                        )
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            activeInfoID = item.id
                                            selectedInfoIDString = item.id.uuidString
                                            editingInfoTitle = item.title
                                            editingInfoContent = item.content
                                            onInfoChange(item.content)
                                        }
                                    }
                                }
                            }
                        }
                        .frame(width: 180)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 10)
                        .background(Color(white: 0.11))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(white: 0.15), lineWidth: 1)
                        )
                        
                        // Right Column: Editor Workspace
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                TextField("Info Title (e.g. Candidate Profile)", text: $editingInfoTitle)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color(white: 0.15))
                                    .cornerRadius(6)
                                
                                Spacer()
                                
                                Button(action: {
                                    editingInfoContent = exampleInfoTemplate
                                    if editingInfoTitle.isEmpty {
                                        editingInfoTitle = "Candidate Profile"
                                    }
                                }) {
                                    Text("Load Example Info")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.blue)
                                }
                                .buttonStyle(.plain)
                            }
                            
                            Text("Provide candidate details (resume, projects, background) for context:")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            
                            // Native TextEditor for multi-line content
                            TextEditor(text: $editingInfoContent)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(.white)
                                .padding(4)
                                .background(Color(white: 0.13))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(white: 0.2), lineWidth: 1)
                                )
                                .frame(height: 140)
                            
                            HStack {
                                Button(action: {
                                    saveInfo()
                                }) {
                                    Text(activeInfoID == nil ? "Create Info" : "Save Changes")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 6)
                                        .background(Color.blue)
                                        .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
                                
                                if activeInfoID != nil {
                                    Button(action: {
                                        deleteInfo()
                                    }) {
                                        Text("Delete")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.red.opacity(0.15))
                                            .cornerRadius(6)
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                if isScanning {
                                    HStack(spacing: 6) {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                                            .scaleEffect(0.6)
                                        Text("Scanning...")
                                            .font(.system(size: 11))
                                            .foregroundColor(.gray)
                                    }
                                    .padding(.leading, 8)
                                } else {
                                    Button(action: selectAndScanResume) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "doc.text.viewfinder")
                                            Text("Scan Resume (PDF/Image)")
                                                .font(.system(size: 12, weight: .semibold))
                                        }
                                        .foregroundColor(.blue)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.blue.opacity(0.15))
                                        .cornerRadius(6)
                                    }
                                    .buttonStyle(.plain)
                                    .padding(.leading, 8)
                                }
                                
                                Spacer()
                                
                                Text("\(editingInfoContent.split(separator: " ").count) words")
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 12)
                        .background(Color(white: 0.11))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(white: 0.15), lineWidth: 1)
                        )
                    }
                    .frame(height: 260)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
                
                Spacer()
            }
        }
        .frame(width: 720, height: 480)
        .onAppear {
            initializeSelection()
        }
    }
    
    // MARK: - Prompt Management Helpers
    
    private func initializeSelection() {
        // Initialize Prompts
        if let firstPrompt = prompts.first {
            let activeID: UUID
            if let savedID = UUID(uuidString: selectedPromptIDString), prompts.contains(where: { $0.id == savedID }) {
                activeID = savedID
            } else {
                activeID = firstPrompt.id
                selectedPromptIDString = firstPrompt.id.uuidString
            }
            self.activePromptID = activeID
            if let item = prompts.first(where: { $0.id == activeID }) {
                editingTitle = item.title
                editingContent = item.content
                onPromptChange(item.content)
            }
        }
        
        // Initialize Candidate Info
        if let firstInfo = infoItems.first {
            let activeID: UUID
            if let savedID = UUID(uuidString: selectedInfoIDString), infoItems.contains(where: { $0.id == savedID }) {
                activeID = savedID
            } else {
                activeID = firstInfo.id
                selectedInfoIDString = firstInfo.id.uuidString
            }
            self.activeInfoID = activeID
            if let item = infoItems.first(where: { $0.id == activeID }) {
                editingInfoTitle = item.title
                editingInfoContent = item.content
                onInfoChange(item.content)
            }
        }
    }
    
    private func savePrompt() {
        guard !editingTitle.isEmpty else { return }
        
        var currentPrompts = prompts
        if let id = activePromptID, let index = currentPrompts.firstIndex(where: { $0.id == id }) {
            currentPrompts[index].title = editingTitle
            currentPrompts[index].content = editingContent
            prompts = currentPrompts
        } else {
            let newItem = PromptItem(title: editingTitle, content: editingContent)
            currentPrompts.append(newItem)
            prompts = currentPrompts
            activePromptID = newItem.id
            selectedPromptIDString = newItem.id.uuidString
        }
        
        notifyActivePromptChange()
    }
    
    private func deletePrompt() {
        guard let id = activePromptID else { return }
        var currentPrompts = prompts
        currentPrompts.removeAll(where: { $0.id == id })
        prompts = currentPrompts
        
        if let first = prompts.first {
            activePromptID = first.id
            selectedPromptIDString = first.id.uuidString
            editingTitle = first.title
            editingContent = first.content
        } else {
            activePromptID = nil
            selectedPromptIDString = ""
            editingTitle = ""
            editingContent = ""
            showPromptManager = false
        }
        
        notifyActivePromptChange()
    }
    
    private func notifyActivePromptChange() {
        if let id = activePromptID, let active = prompts.first(where: { $0.id == id }) {
            onPromptChange(active.content)
        } else {
            onPromptChange("")
        }
    }
    
    // MARK: - Candidate Info Management Helpers
    
    private func saveInfo() {
        guard !editingInfoTitle.isEmpty else { return }
        
        var currentInfo = infoItems
        if let id = activeInfoID, let index = currentInfo.firstIndex(where: { $0.id == id }) {
            currentInfo[index].title = editingInfoTitle
            currentInfo[index].content = editingInfoContent
            infoItems = currentInfo
        } else {
            let newItem = InfoItem(title: editingInfoTitle, content: editingInfoContent)
            currentInfo.append(newItem)
            infoItems = currentInfo
            activeInfoID = newItem.id
            selectedInfoIDString = newItem.id.uuidString
        }
        
        notifyActiveInfoChange()
    }
    
    private func deleteInfo() {
        guard let id = activeInfoID else { return }
        var currentInfo = infoItems
        currentInfo.removeAll(where: { $0.id == id })
        infoItems = currentInfo
        
        if let first = infoItems.first {
            activeInfoID = first.id
            selectedInfoIDString = first.id.uuidString
            editingInfoTitle = first.title
            editingInfoContent = first.content
        } else {
            activeInfoID = nil
            selectedInfoIDString = ""
            editingInfoTitle = ""
            editingInfoContent = ""
            showInfoManager = false
        }
        
        notifyActiveInfoChange()
    }
    
    private func notifyActiveInfoChange() {
        if let id = activeInfoID, let active = infoItems.first(where: { $0.id == id }) {
            onInfoChange(active.content)
        } else {
            onInfoChange("")
        }
    }

    private func getMimeType(for url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "pdf": return "application/pdf"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        default: return "application/octet-stream"
        }
    }

    private func selectAndScanResume() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.pdf, .png, .jpeg]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        
        guard panel.runModal() == .OK, let url = panel.url else { return }
        
        do {
            let fileData = try Data(contentsOf: url)
            let base64Data = fileData.base64EncodedString()
            let mimeType = getMimeType(for: url)
            
            isScanning = true
            
            performGeminiScan(base64: base64Data, mimeType: mimeType, fileName: url.lastPathComponent, fileUrl: url)
        } catch {
            print("Failed to read file: \(error.localizedDescription)")
        }
    }

    private func performGeminiScan(base64: String, mimeType: String, fileName: String, fileUrl: URL) {
        let apiKey = UserDefaults.standard.string(forKey: "gemini_api_key") ?? ""
        if apiKey.isEmpty {
            DispatchQueue.main.async {
                self.isScanning = false
                let alert = NSAlert()
                alert.messageText = "Gemini API Key Required"
                alert.informativeText = "Please enter your Gemini API Key in the settings input bar on the top-right before scanning."
                alert.alertStyle = .warning
                alert.runModal()
            }
            return
        }
        
        let modelName = "gemini-1.5-flash"
        guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(modelName):generateContent?key=\(apiKey)") else {
            DispatchQueue.main.async { self.isScanning = false }
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        [
                            "text": "Extract and organize all candidate information, technical skills, projects, and work experience from this resume document into a clean, structured Markdown format. Do not add any conversational remarks, introductory text, or explanations. Just output the clean markdown containing the candidate's details."
                        ],
                        [
                            "inlineData": [
                                "mimeType": mimeType,
                                "data": base64
                            ]
                        ]
                    ]
                ]
            ]
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload) else {
            DispatchQueue.main.async { self.isScanning = false }
            return
        }
        request.httpBody = jsonData
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isScanning = false
                
                if let error = error {
                    print("Gemini API Error: \(error.localizedDescription)")
                    return
                }
                
                guard let data = data else { return }
                
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let candidates = json["candidates"] as? [[String: Any]],
                   let firstCandidate = candidates.first,
                   let content = firstCandidate["content"] as? [String: Any],
                   let parts = content["parts"] as? [[String: Any]],
                   let firstPart = parts.first,
                   let text = firstPart["text"] as? String {
                    
                    self.editingInfoContent = text
                    if self.editingInfoTitle.isEmpty {
                        self.editingInfoTitle = fileName.replacingOccurrences(of: ".\(fileUrl.pathExtension)", with: "")
                    }
                } else {
                    print("Failed to parse Gemini scan response: \(String(data: data, encoding: .utf8) ?? "nil")")
                }
            }
        }.resume()
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView(onPromptChange: { _ in }, onInfoChange: { _ in }, onDetectableChange: { _ in }, onStart: {})
    }
}
