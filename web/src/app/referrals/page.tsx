"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReferralsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      fetch(`http://localhost:4000/api/referrals/${payload.userId}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setData(d); });
    } catch { router.push("/login"); }
  }, [router]);

  const inviteLink = data ? `https://hiresky.app/signup?ref=${data.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/30 border border-blue-500/20 rounded-3xl p-10 mb-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">🎁</div>
          <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Refer &amp; Earn
          </h1>
          <p className="text-zinc-300 text-lg mb-6 max-w-md mx-auto">
            Invite a friend to HireSky and both of you get <strong className="text-white">3 free bonus days</strong> added to your plan.
          </p>

          {data ? (
            <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-700 rounded-xl p-1 pl-4 max-w-lg mx-auto">
              <span className="text-sm font-mono text-zinc-300 truncate flex-1">{inviteLink}</span>
              <button
                onClick={copyLink}
                className={`flex-shrink-0 px-5 py-2.5 rounded-lg font-bold text-sm transition ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {copied ? "Copied! ✓" : "Copy Link"}
              </button>
            </div>
          ) : (
            <div className="text-zinc-500 text-sm">Generating your referral link...</div>
          )}
        </div>

        {/* Stats Row */}
        {data && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Invites", value: data.usedCount, icon: "👥" },
              { label: "Rewards Earned", value: `${data.usedCount * 3} days`, icon: "🏆" },
              { label: "Your Code", value: data.code, icon: "🔑" },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center shadow-lg">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Referral history */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
            <h2 className="font-bold text-lg">People You Invited</h2>
          </div>
          {!data || data.referrals.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <p>No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {data.referrals.map((ref: any) => (
                <div key={ref.id} className="flex justify-between items-center p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">
                      {ref.referredUser?.profile?.firstName?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {ref.referredUser?.profile?.firstName} {ref.referredUser?.profile?.lastName}
                      </div>
                      <div className="text-xs text-zinc-500">{new Date(ref.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${ref.status === 'REWARDED' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {ref.status === 'REWARDED' ? '✓ Rewarded' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
