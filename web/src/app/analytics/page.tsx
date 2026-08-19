"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      fetch(`http://localhost:4000/api/analytics/${payload.userId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setMetrics(data);
      });
    } catch(e) {
      router.push("/login");
    }
  }, [router]);

  if (!metrics) return <div className="p-8 text-white">Loading analytics...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
        <p className="text-zinc-400 mb-8 border-b border-zinc-800 pb-4">
          Insights across your {metrics.totalInterviews} recent interviews.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Overall Score</h3>
            <div className="flex items-end gap-4">
              <span className="text-6xl font-extrabold text-white">{metrics.averageScore}%</span>
              <span className={`text-xl font-bold mb-1 ${metrics.trendValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.trendValue > 0 ? '+' : ''}{metrics.trendValue}% trend
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Skill Matrix Highlights</h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Strongest Area: <strong className="text-white">{metrics.strongestArea}</strong></span>
                <span className="text-green-400 font-bold">92%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Needs Improvement: <strong className="text-white">{metrics.weakestArea}</strong></span>
                <span className="text-orange-400 font-bold">61%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '61%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4">AI Recommendations</h3>
          <ul className="list-disc pl-5 text-zinc-300 space-y-2">
            <li>Review system design concepts, specifically load balancing and caching strategies.</li>
            <li>Practice behavioral questions using the STAR format (Situation, Task, Action, Result).</li>
            <li>Your React performance is excellent; ensure you highlight it prominently in your upcoming interviews.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
