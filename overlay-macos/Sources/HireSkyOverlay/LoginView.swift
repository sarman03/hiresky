import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    @AppStorage("auth_token") private var authToken: String = ""
    @AppStorage("auth_refresh_token") private var refreshToken: String = ""
    @AppStorage("user_id") private var userId: String = ""
    
    var onLoginSuccess: () -> Void
    
    var body: some View {
        ZStack {
            Color(red: 0.08, green: 0.08, blue: 0.08).ignoresSafeArea()
            
            VStack(spacing: 24) {
                Text("HireSky")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Log in to your account to continue.")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color(white: 0.15))
                        .cornerRadius(8)
                        .foregroundColor(.white)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color(white: 0.15))
                        .cornerRadius(8)
                        .foregroundColor(.white)
                }
                .frame(width: 300)
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.system(size: 12))
                }
                
                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Log In")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                }
                .buttonStyle(.plain)
                .frame(width: 300)
                .disabled(isLoading || email.isEmpty || password.isEmpty)
            }
        }
        .frame(width: 480, height: 360)
    }
    
    private func login() {
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "http://localhost:4000/api/auth/login") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["email": email, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isLoading = false
                
                if let error = error {
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                    return
                }
                
                guard let data = data, let httpResponse = response as? HTTPURLResponse else {
                    self.errorMessage = "Invalid response from server"
                    return
                }
                
                if httpResponse.statusCode == 200 {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let token = json["token"] as? String,
                       let refresh = json["refreshToken"] as? String,
                       let user = json["user"] as? [String: Any],
                       let uid = user["id"] as? String {
                        
                        self.authToken = token
                        self.refreshToken = refresh
                        self.userId = uid
                        self.onLoginSuccess()
                    } else {
                        self.errorMessage = "Failed to parse login response"
                    }
                } else {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let err = json["error"] as? String {
                        self.errorMessage = err
                    } else {
                        self.errorMessage = "Login failed (\(httpResponse.statusCode))"
                    }
                }
            }
        }.resume()
    }
}
