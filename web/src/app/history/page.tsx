"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    let userId = "";
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId;
    } catch(e) {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:4000/api/interviews/user/${userId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(e => console.error(e));
  }, [router]);

  const filteredSessions = filter === "All" 
    ? sessions 
    : sessions.filter(s => s.domain === filter);

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 border-b border-zinc-800 pb-4">Interviews</h1>
        
        <div className="mb-6 flex gap-2">
          {["All", "TECHNICAL", "HR", "CODING"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                filter === f ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {f === "TECHNICAL" ? "Technical" : f === "CODING" ? "Coding" : f}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {filteredSessions.length === 0 ? (
            <div className="text-zinc-500 py-8 text-center">No interviews found.</div>
          ) : (
            filteredSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => router.push(`/history/${session.id}`)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 transition hover:border-zinc-600 hover:bg-zinc-800/50 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-blue-400 transition">{session.companyName || "Unknown Company"}</h3>
                    <p className="text-zinc-400">{session.title || "Technical Interview"} · {session.domain}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg px-3 py-1 text-sm font-bold ${
                      session.summary?.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
                      session.summary?.overallScore >= 60 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {session.summary?.overallScore ? `${session.summary.overallScore}%` : "No Score"}
                    </div>
                    <span className="text-zinc-500 group-hover:text-white transition text-sm">View →</span>
                  </div>
                </div>
                <div className="text-sm text-zinc-500">
                  {new Date(session.createdAt).toLocaleDateString()} • {session.durationSeconds ? `${Math.floor(session.durationSeconds / 60)} min` : "Unknown duration"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
