"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HistoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(240); // Mock 4 minutes
  
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetch(`http://localhost:4000/api/interviews/${params.id}/stats`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSession(data);
      });
  }, [params.id, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(t => {
          if (t >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!session) return <div className="p-8 text-white">Loading session data...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-zinc-800 flex-shrink-0">
        <div>
          <button onClick={() => router.push('/history')} className="text-zinc-400 text-sm hover:text-white mb-2 flex items-center gap-1">
            ← Back to History
          </button>
          <h1 className="text-2xl font-bold">{session.title || "Live Interview"} - {session.companyName}</h1>
          <p className="text-zinc-500 text-sm mt-1">{new Date(session.createdAt).toLocaleString()} • {session.domain}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-blue-400">{session.summary?.overallScore || 0}%</div>
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Overall Score</div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Column: Media Player & Stats */}
        <div className="w-7/12 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
          
          {/* Mock Video Player */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div ref={videoRef} className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              {/* Mock Video Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <div className="text-zinc-600 flex flex-col items-center z-0">
                <span className="text-6xl mb-2">📹</span>
                <span className="font-semibold tracking-widest uppercase text-sm">Session Recording</span>
              </div>
              
              {/* Timeline markers mock */}
              <div className="absolute bottom-16 left-0 right-0 px-6 z-20 flex justify-between">
                 <div className="bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs px-2 py-1 rounded backdrop-blur-sm shadow">System Design Intro</div>
                 <div className="bg-green-500/20 border border-green-500/50 text-green-300 text-xs px-2 py-1 rounded backdrop-blur-sm shadow">Strong Answer</div>
                 <div className="bg-orange-500/20 border border-orange-500/50 text-orange-300 text-xs px-2 py-1 rounded backdrop-blur-sm shadow">Hesitation Detected</div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="p-4 bg-zinc-900 flex flex-col gap-3">
              {/* Scrubber */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-zinc-400 w-10">{formatTime(currentTime)}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full relative cursor-pointer group">
                  <div className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                  <div className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${(currentTime/duration)*100}% - 8px)`}}></div>
                </div>
                <span className="text-xs font-mono text-zinc-400 w-10">{formatTime(duration)}</span>
              </div>
              
              {/* Buttons */}
              <div className="flex justify-between items-center px-2">
                <div className="flex gap-4 items-center">
                  <button className="text-zinc-400 hover:text-white">⏪ 15s</button>
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg hover:scale-105 transition">
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button className="text-zinc-400 hover:text-white">15s ⏩</button>
                </div>
                <div className="flex gap-4">
                  <button className="text-zinc-400 hover:text-white text-sm font-semibold">1.0x</button>
                  <button className="text-zinc-400 hover:text-white">⚙️</button>
                  <button className="text-zinc-400 hover:text-white">⛶</button>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Dive Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">Communication</div>
              <div className="flex justify-between items-end mb-4">
                <span className="text-3xl font-bold">{session.summary?.fillerWordCount || 14}</span>
                <span className="text-sm text-zinc-500 mb-1">Filler Words</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-3xl font-bold">{session.summary?.speakingPaceWpm || 135}</span>
                <span className="text-sm text-zinc-500 mb-1">WPM Pace</span>
              </div>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">AI Feedback</div>
              <ul className="text-sm text-zinc-300 space-y-2">
                <li>• {session.summary?.strengths || "Strong technical foundation."}</li>
                <li>• {session.summary?.weaknesses || "Rushed explanation of indexing."}</li>
                <li>• {session.summary?.recommendations || "Pause before answering complex DB questions."}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Synchronized Transcript */}
        <div className="w-5/12 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
            <h3 className="font-bold text-sm uppercase tracking-wider">Synchronized Transcript</h3>
            <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">Export</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {session.transcriptSegments && session.transcriptSegments.length > 0 ? (
              session.transcriptSegments.map((seg: any) => (
                <div key={seg.id} className={`flex flex-col ${seg.speaker === 'candidate' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-zinc-500 mb-1 font-semibold uppercase">{seg.speaker} <span className="font-mono lowercase font-normal ml-1">{seg.startTime}</span></span>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                    seg.speaker === 'candidate' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                  }`}>
                    {seg.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 text-sm text-center mt-10 italic">
                No transcript segments recorded for this session.
                <br/><br/>
                (In a live scenario, the Python engine streams these via WebSocket, and the Cloud API saves them.)
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
