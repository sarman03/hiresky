"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    // Parse JWT to get userId
    let userId = "";
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId;
    } catch(e) {
      router.push("/login");
      return;
    }

    // Since we don't have a specific /me endpoint, we'll fetch interviews directly for now
    fetch(`http://localhost:4000/api/interviews/user/${userId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
          setUser({ id: userId, name: "Akash" });
        }
      })
      .catch(e => console.error("Error fetching sessions:", e));

    // Fetch unread notification count
    fetch(`http://localhost:4000/api/notifications/${userId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setUnreadCount(data.filter((n: any) => !n.isRead).length);
      });
  }, [router]);

  if (!user) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="animate-fade-in p-8 text-white bg-zinc-950 min-h-screen">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-3xl font-bold">Good morning, {user.name} 👋</h3>
          <p className="text-zinc-400">Here's your interview overview.</p>
        </div>
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col items-start">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Current Plan</div>
          <div className="text-2xl font-bold mb-1">Technical Pro</div>
          <div className="text-sm text-zinc-500 mb-6">Expires in 18 days</div>
          <button className="mt-auto w-full bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded-lg font-semibold text-sm">
            Launch Interview Assistant
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Interview Stats</div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-zinc-500 text-sm">Total Interviews</div>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">This Month</div>
              <div className="text-2xl font-bold">3</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Average Score</div>
              <div className="text-2xl font-bold">78%</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Improvement</div>
              <div className="text-2xl font-bold text-green-400">+12%</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Upcoming Interviews</div>
          <div className="mt-4">
            <div className="text-lg font-bold">Google</div>
            <div className="text-sm text-zinc-300">Technical Interview</div>
            <div className="text-sm text-blue-400 mt-2">Tomorrow • 11:00 AM</div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <strong className="text-lg font-bold">Recent Sessions</strong>
          <span className="text-sm text-blue-400 hover:underline cursor-pointer" onClick={() => router.push('/history')}>View All</span>
        </div>

        <div className="flex flex-col gap-4">
          {sessions.length === 0 ? (
            <div className="text-zinc-500 text-sm">No recent sessions found. Start an interview to see it here.</div>
          ) : (
            sessions.slice(0, 5).map(session => (
              <div key={session.id} className="flex justify-between items-center pb-4 border-b border-zinc-800 last:border-0 last:pb-0">
                <div>
                  <div className="text-base font-semibold text-white mb-1">{session.title || "Technical Interview"}</div>
                  <div className="text-xs text-zinc-400">{new Date(session.createdAt).toLocaleDateString()} • {session.domain}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 transition">View Transcript</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
