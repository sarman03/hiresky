"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "logs">("users");
  const [banning, setBanning] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    fetch("http://localhost:4000/api/admin/stats").then(r => r.json()).then(setStats);
    fetch("http://localhost:4000/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); });
    fetch("http://localhost:4000/api/admin/logs").then(r => r.json()).then(d => { if (Array.isArray(d)) setLogs(d); });
  }, [router]);

  const handleBan = async (userId: string) => {
    setBanning(userId);
    await fetch(`http://localhost:4000/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId: userId, reason: "Admin action" })
    });
    const updated = await fetch("http://localhost:4000/api/admin/users").then(r => r.json());
    if (Array.isArray(updated)) setUsers(updated);
    const updatedLogs = await fetch("http://localhost:4000/api/admin/logs").then(r => r.json());
    if (Array.isArray(updatedLogs)) setLogs(updatedLogs);
    setBanning(null);
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.profile?.firstName} ${u.profile?.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <span className="text-xs font-bold bg-red-600/20 text-red-400 border border-red-600/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Restricted</span>
          </div>
          <p className="text-zinc-400 text-sm">Global platform management — users, subscriptions, and activity logs.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { label: "Total Users", value: stats?.totalUsers ?? "—", icon: "👥" },
            { label: "Sessions Today", value: stats?.sessionsToday ?? "—", icon: "🎙️" },
            { label: "Total Sessions", value: stats?.totalSessions ?? "—", icon: "📋" },
            { label: "Active Subs", value: stats?.activeSubscriptions ?? "—", icon: "✅" },
            { label: "MRR", value: stats?.mrr != null ? `$${stats.mrr}` : "—", icon: "💰" },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          {(["users", "logs"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full font-semibold text-sm capitalize transition ${tab === t ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}>
              {t === "users" ? `Users (${users.length})` : `Activity Log (${logs.length})`}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider border-b border-zinc-800 bg-zinc-950/30">
              <div className="col-span-4">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2 text-right">Sessions</div>
              <div className="col-span-2 text-right">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No users found.</div>
              ) : filtered.map(user => (
                <div key={user.id} className="grid grid-cols-12 gap-2 px-5 py-4 items-center hover:bg-zinc-800/20 transition">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {user.profile?.firstName?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName}` : "—"}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-400'}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-sm font-mono text-zinc-300">{user._count?.sessions ?? 0}</div>
                  <div className="col-span-2 text-right">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => handleBan(user.id)}
                      disabled={banning === user.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${user.status === 'SUSPENDED' ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'}`}
                    >
                      {banning === user.id ? "..." : user.status === 'SUSPENDED' ? "Unban" : "Ban"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="divide-y divide-zinc-800/50">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No admin actions recorded yet.</div>
              ) : logs.map(log => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-800/20 transition">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center mb-0.5">
                      <span className="font-bold text-sm text-orange-400">{log.action}</span>
                      <span className="text-xs text-zinc-500">by {log.admin?.email}</span>
                    </div>
                    <div className="text-sm text-zinc-400">{log.details}</div>
                    <div className="text-xs text-zinc-600 mt-1">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
