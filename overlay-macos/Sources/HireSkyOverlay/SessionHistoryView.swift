import SwiftUI

struct PastSession: Identifiable, Codable {
    var id = UUID()
    var title: String
    var date: String
    var summary: String
    var transcript: String
}

struct SessionHistoryView: View {
    @State private var searchText: String = ""
    @State private var selectedTab: String = "Summary" // "Summary" | "Transcript" | "Usage"
    @State private var selectedSessionID: UUID? = nil
    
    // Pulse animation for live session
    @State private var isPulsing = false
    
    // Mock past sessions history data
    @State private var sessions: [PastSession] = [
        PastSession(
            title: "Backend Engineer Interview - TechCorp",
            date: "Today, 4:15 PM",
            summary: """
Key takeaways:
• Candidate successfully explained microservices and REST API trade-offs.
• Detailed brute force and optimized approaches for a 2-Sum problem.
• Demonstrated strong familiarity with AWS and Docker containerization.
• Suggested follow-up questions to ask about their deployment cycles.
""",
            transcript: """
[Interviewer]: Hi Akash, welcome! Tell me about yourself.
[Candidate]: Hi, thank you. I am a full-stack developer with 3 years of experience.
[Interviewer]: Can you explain how you optimized database queries at your last job?
[Candidate]: Yes, I integrated Redis caching which reduced response times by 40%.
[Interviewer]: Great. Let's do a coding question. Write a function to check for duplicates.
[Candidate]: We can use a hash set to achieve O(N) time and O(N) space complexity.
"""
        ),
        PastSession(
            title: "Full Stack Developer Round - InnovateLab",
            date: "Yesterday, 11:30 AM",
            summary: """
Key takeaways:
• Discussed state management in React using Redux and Context API.
• Answered technical questions about database indexing and performance.
• Showcased project experience on real-time messaging apps using WebSockets.
""",
            transcript: """
[Interviewer]: Welcome! Why do you want to join InnovateLab?
[Candidate]: I love building highly interactive applications and working with modern web tech.
[Interviewer]: How do you handle real-time data?
[Candidate]: I've extensively used WebSockets and Socket.io for bi-directional streaming.
[Interviewer]: Excellent.
"""
        ),
        PastSession(
            title: "System Design Interview - Google",
            date: "July 18, 2026",
            summary: """
Key takeaways:
• Designed a global URL shortener service (like Bitly).
• Handled scalability, estimation, load balancers, and database partitioning.
• Successfully addressed API rate limiting and security concerns.
""",
            transcript: """
[Interviewer]: Design a URL shortening service.
[Candidate]: Let's start with functional and non-functional requirements. We need 100M URLs daily.
[Interviewer]: What database will you choose?
[Candidate]: I would use a NoSQL database like MongoDB or DynamoDB for high write scalability.
"""
        )
    ]
    
    var filteredSessions: [PastSession] {
        if searchText.isEmpty {
            return sessions
        } else {
            return sessions.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        ZStack {
            // Dark elegant background
            Color(red: 0.08, green: 0.08, blue: 0.08)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header: Live Session Status
                HStack {
                    Circle()
                        .fill(Color(red: 0.16, green: 0.8, blue: 0.38))
                        .frame(width: 8, height: 8)
                        .scaleEffect(isPulsing ? 1.3 : 1.0)
                        .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isPulsing)
                    
                    Text("Live Session Active")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.16, green: 0.8, blue: 0.38))
                    
                    Spacer()
                    
                    Text("HireSky Session Hub")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                .padding(.bottom, 12)
                .onAppear {
                    isPulsing = true
                }
                
                // Search Bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                        .font(.system(size: 13))
                    TextField("Search interviews by title...", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(white: 0.14))
                .cornerRadius(8)
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
                
                // Tab Selection Row
                HStack(spacing: 12) {
                    ForEach(["Summary", "Transcript", "Usage"], id: \.self) { tab in
                        Button(action: {
                            selectedTab = tab
                        }) {
                            Text(tab)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(selectedTab == tab ? .white : .gray)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 6)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(selectedTab == tab ? Color.blue : Color(white: 0.14))
                                )
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
                
                // Content area based on Tab selection
                if selectedTab == "Usage" {
                    // Usage Analytics Placeholder
                    VStack(spacing: 12) {
                        Image(systemName: "chart.bar.xaxis")
                            .font(.system(size: 36))
                            .foregroundColor(.gray)
                        Text("Usage Analytics Coming Soon")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                        Text("Track your session durations, question counts, and performance metrics over time.")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    // Split view of Session list + Detail card
                    HStack(spacing: 16) {
                        // Left List of past sessions
                        ScrollView {
                            VStack(spacing: 8) {
                                ForEach(filteredSessions) { item in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(item.title)
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.white)
                                            .lineLimit(1)
                                        Text(item.date)
                                            .font(.system(size: 10))
                                            .foregroundColor(.gray)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(selectedSessionID == item.id ? Color(white: 0.18) : Color(white: 0.12))
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedSessionID == item.id ? Color.blue.opacity(0.5) : Color.clear, lineWidth: 1)
                                    )
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        selectedSessionID = item.id
                                    }
                                }
                            }
                        }
                        .frame(width: 220)
                        
                        // Right Detail card
                        ZStack {
                            if let activeSession = sessions.first(where: { $0.id == selectedSessionID }) {
                                ScrollView {
                                    VStack(alignment: .leading, spacing: 12) {
                                        Text(activeSession.title)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                        
                                        Divider()
                                            .background(Color(white: 0.2))
                                        
                                        if selectedTab == "Summary" {
                                            Text(activeSession.summary)
                                                .font(.system(size: 12))
                                                .foregroundColor(.white)
                                                .lineSpacing(4)
                                        } else {
                                            Text(activeSession.transcript)
                                                .font(.system(size: 12, design: .monospaced))
                                                .foregroundColor(.gray)
                                                .lineSpacing(4)
                                        }
                                    }
                                    .padding(14)
                                }
                                .background(Color(white: 0.12))
                                .cornerRadius(8)
                            } else {
                                VStack {
                                    Text("Select an interview session from the list to view details.")
                                        .font(.system(size: 12))
                                        .foregroundColor(.gray)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
        .frame(width: 680, height: 440)
        .onAppear {
            isPulsing = true
            let loadedSessions = SessionStorage.shared.loadAllSessions()
            if !loadedSessions.isEmpty {
                self.sessions = loadedSessions
            }
            if selectedSessionID == nil {
                selectedSessionID = sessions.first?.id
            }
        }
    }
}
