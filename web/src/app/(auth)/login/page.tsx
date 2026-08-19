"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin ? { email, password } : { email, password, firstName, lastName };
      
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        router.push("/");
      } else {
        const error = await res.json();
        alert(error.error || "Authentication failed");
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h2 className="mb-6 text-3xl font-bold tracking-tight">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="First Name" 
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm outline-none focus:border-blue-500"
                value={firstName} onChange={e => setFirstName(e.target.value)} required 
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm outline-none focus:border-blue-500"
                value={lastName} onChange={e => setLastName(e.target.value)} required 
              />
            </div>
          )}
          <input 
            type="email" 
            placeholder="Email address" 
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm outline-none focus:border-blue-500"
            value={email} onChange={e => setEmail(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm outline-none focus:border-blue-500"
            value={password} onChange={e => setPassword(e.target.value)} required 
          />
          
          <button type="submit" className="mt-2 w-full rounded-lg bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-500">
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:underline">
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
