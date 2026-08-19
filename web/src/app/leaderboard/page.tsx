"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const router = useRouter();
  const [epoch, setEpoch] = useState("ALL_TIME");
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchLeaderboard(epoch);
  }, [router, epoch]);

  const fetchLeaderboard = (selectedEpoch: string) => {
    fetch(`http://localhost:4000/api/leaderboard/${selectedEpoch}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.entries) {
          setEntries(data.entries);
        }
      });
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold">Global Leaderboard</h1>
            <p className="text-zinc-400 mt-1">See how you stack up against top candidates.</p>
          </div>
          <select 
            className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg p-2 outline-none"
            value={epoch}
            onChange={(e) => setEpoch(e.target.value)}
          >
            <option value="ALL_TIME">All Time</option>
            <option value="MONTHLY_OCT">October 2026</option>
            <option value="WEEKLY">This Week</option>
          </select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/50">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5">Candidate</div>
            <div className="col-span-3 text-right">Interviews</div>
            <div className="col-span-2 text-right">Avg Score</div>
          </div>
          
          <div className="flex flex-col">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No data available for this epoch.</div>
            ) : (
              entries.map((entry, index) => (
                <div key={entry.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition">
                  <div className="col-span-2 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-300/20 text-gray-300' :
                      index === 2 ? 'bg-orange-700/20 text-orange-500' :
                      'text-zinc-400'
                    }`}>
                      #{entry.rank}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold border border-zinc-700">
                      {entry.user.profile?.firstName?.[0]}{entry.user.profile?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{entry.user.profile?.firstName} {entry.user.profile?.lastName}</div>
                    </div>
                  </div>
                  <div className="col-span-3 text-right text-zinc-400 font-mono text-sm flex items-center justify-end">
                    {entry.totalInterviews}
                  </div>
                  <div className="col-span-2 text-right font-bold text-white flex items-center justify-end">
                    {entry.score.toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
