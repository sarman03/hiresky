"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const typeIcon: Record<string, string> = {
  INTERVIEW_COMPLETE: "🎯",
  REFERRAL_REWARD: "🎁",
  PLAN_EXPIRY: "⚠️",
  SYSTEM: "📢"
};

const typeBg: Record<string, string> = {
  INTERVIEW_COMPLETE: "bg-blue-500/10 border-blue-500/20",
  REFERRAL_REWARD: "bg-green-500/10 border-green-500/20",
  PLAN_EXPIRY: "bg-orange-500/10 border-orange-500/20",
  SYSTEM: "bg-zinc-800 border-zinc-700"
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      fetch(`http://localhost:4000/api/notifications/${payload.userId}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setNotifications(data);
          setLoading(false);
        });
    } catch { router.push("/login"); }
  }, [router]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    await fetch(`http://localhost:4000/api/notifications/${userId}/read-all`, { method: "PATCH" });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    await fetch(`http://localhost:4000/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-8 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">Stay updated on your interviews, rewards, and plan status.</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm text-blue-400 hover:text-blue-300 font-semibold transition">
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-zinc-500 text-center py-12">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-zinc-500 text-center py-12">
            <div className="text-5xl mb-4">🔔</div>
            <p>You're all caught up! No notifications yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.actionUrl) router.push(n.actionUrl);
                }}
                className={`relative flex gap-4 p-5 rounded-2xl border cursor-pointer transition hover:scale-[1.01] ${typeBg[n.type] || "bg-zinc-900 border-zinc-800"} ${!n.isRead ? 'ring-1 ring-blue-500/30' : 'opacity-70'}`}
              >
                {/* Unread indicator */}
                {!n.isRead && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
                )}

                <div className="text-3xl flex-shrink-0">{typeIcon[n.type] || "🔔"}</div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="font-bold text-white">{n.title}</div>
                  <div className="text-sm text-zinc-300 leading-relaxed">{n.message}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                    {n.actionUrl && <span className="ml-3 text-blue-400 hover:underline">View →</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
