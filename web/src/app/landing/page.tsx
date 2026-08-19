"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  
  // Custom mouse shine effect for cards
  const cardRefs = useRef<HTMLDivElement[]>([]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  const faqs = [
    {
      q: "Is HireSky really invisible during Zoom/OBS sharing?",
      a: "Yes. HireSky leverages direct system APIs (NSWindowSharingNone on macOS and WDA_EXCLUDEFROMCAPTURE on Windows). The graphics engine strips the window framebuffer before composting the final screen share, making it visible only to your physical eyes."
    },
    {
      q: "How does loopback audio capture work?",
      a: "On Windows, it hooks directly into WASAPI loopback. On macOS, it routes system output audio through a virtual audio driver like BlackHole, capturing what other speakers say without using microphone feedback loops."
    },
    {
      q: "What AI models does it support?",
      a: "It defaults to Gemini 2.5 Flash for hyper-fast stream speeds, but you can configure it in config.yaml to use custom Claude or GPT-4 endpoints as well."
    },
    {
      q: "Is my session data uploaded online?",
      a: "All voice VAD, Whisper transcription, and screen OCR capture run locally on your system. Only the filtered transcripts are securely streamed to Gemini. No meeting video or database data ever leaves your computer unless you explicitly choose cloud sync."
    }
  ];

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500 selection:text-black overflow-hidden">
      
      {/* Background radial spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 px-6 py-4 backdrop-blur-md bg-zinc-950/40 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              HireSky
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Features</a>
            <a href="#privacy" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Privacy Model</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors">
              Log in
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold transition-all hover:scale-105 active:scale-95">
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-semibold text-cyan-400 mb-6 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Invisible Desktop Overlay Active
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 bg-gradient-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent">
            Your Secret AI Copilot for Live Technical Meetings
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mb-8 leading-relaxed">
            A native, zero-latency desktop helper that captures meeting loopback sound and screen context on the fly. Streaming visual code hints and suggestions that are completely hidden from shared feeds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="#pricing" className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] text-center">
              Start Free Trial
            </Link>
            <a href="#features" className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-sm transition-all text-center">
              Explore Technology
            </a>
          </div>
        </div>
        
        <div className="lg:col-span-5 relative flex justify-center w-full">
          <div className="relative w-full aspect-video md:aspect-[4/3] max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-lg overflow-hidden shadow-2xl transition-all duration-500 hover:border-zinc-700">
            <div className="h-9 border-b border-zinc-800 bg-zinc-950/80 flex items-center px-4 gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-zinc-500 ml-4 font-mono">live-overlay-stream</span>
            </div>
            <div className="relative w-full h-[calc(100%-36px)] bg-zinc-950">
              <Image 
                src="/hero.jpg" 
                alt="App Interface" 
                fill 
                className="object-cover opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Ticker */}
      <section className="border-y border-zinc-900 bg-zinc-950/60 backdrop-blur-sm py-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-extrabold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">0ms</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Share Compositor Footprint</div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">&lt; 1.2s</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">End-to-End Latency</div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">99.8%</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Voice Transcription Precision</div>
          </div>
        </div>
      </section>

      {/* Grid Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Powerful Pipeline, Native Exclusions
          </h2>
          <p className="text-zinc-400">
            Decoupled performance routing voice logic to the local backend and visual tokens directly to the overlay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: "🛡️",
              title: "Screen-Share Exclusion",
              desc: "Engineered using native AppKit (macOS) and WPF (Windows) exclusion masks that prevent drawing hooks from recording overlay frame buffers."
            },
            {
              icon: "🎧",
              title: "Audio Loopback Routing",
              desc: "Captures system sound directly from the audio pipeline (WASAPI/BlackHole), routing questions asked by other interviewers into AI parser."
            },
            {
              icon: "🔍",
              title: "Dynamic Screen OCR",
              desc: "Tesseract OCR engine queries user-defined screen regions, extracting text coordinates to keep full context of your codebase."
            },
            {
              icon: "⚡",
              title: "WebSocket Token Streams",
              desc: "Streams LLM words instantly into a floating glassmorphic layout. Fast, responsive, and easy to review under pressure."
            }
          ].map((feat, idx) => (
            <div
              key={idx}
              ref={el => { if (el) cardRefs.current[idx] = el; }}
              onMouseMove={(e) => handleMouseMove(e, idx)}
              className="group relative p-8 rounded-2xl border border-zinc-900 bg-zinc-900/40 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
            >
              {/* Subtle mouse highlight glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" 
                style={{
                  background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(6, 182, 212, 0.08), transparent 60%)`
                }}
              />
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl mb-6 shadow-inner">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feat.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual Screen Display Demo */}
      <section id="privacy" className="max-w-7xl mx-auto px-6 py-16">
        <div className="p-8 md:p-12 rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-md grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">Compositor-Level Privacy</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              Standard overlay apps just draw overlays. HireSky is different. It communicates with the OS Window Server to explicitly block output on captures.
            </p>
            
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] w-14">macOS</span>
                <code className="text-cyan-400">NSWindow.sharingType = .none</code>
              </div>
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] w-14">Windows</span>
                <code className="text-cyan-400">WDA_EXCLUDEFROMCAPTURE</code>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400">What You See (Physical Screen)</span>
              <div className="relative h-28 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-center justify-center">
                <div className="w-3/4 h-16 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-xs text-zinc-500">Video Call Window</div>
                <div className="absolute right-12 bottom-4 w-1/3 h-10 rounded border border-cyan-500/50 bg-zinc-900/90 shadow-[0_0_12px_rgba(6,182,212,0.15)] flex items-center justify-center text-[10px] text-cyan-400 backdrop-blur-sm">HireSky Overlay</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400">What They See (Zoom/OBS Feed)</span>
              <div className="relative h-28 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-center justify-center">
                <div className="w-3/4 h-16 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-xs text-zinc-500">Video Call Window</div>
                <div className="absolute right-12 bottom-4 w-1/3 h-10 rounded border border-zinc-800/40 border-dashed bg-transparent flex items-center justify-center text-[10px] text-zinc-700">Invisible Area</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Flexible Interview Plans</h2>
          <p className="text-zinc-400">Choose the workspace interval that fits your schedule.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Plan 1 */}
          <div className="p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex flex-col justify-between hover:border-zinc-800 transition-colors">
            <div>
              <div className="text-sm font-semibold text-zinc-400 mb-2">Technical Day Pass</div>
              <div className="text-4xl font-extrabold text-white mb-6">$5<span className="text-xs text-zinc-500"> / 24 hrs</span></div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Perfect for a single high-stakes technical screening round.</p>
              <ul className="space-y-3 mb-8 text-xs text-zinc-300">
                <li className="flex items-center gap-2">✓ Full day workspace session</li>
                <li className="flex items-center gap-2">✓ Live transcription streams</li>
                <li className="flex items-center gap-2">✓ OCR visual code coordinates</li>
                <li className="flex items-center gap-2">✓ Support for local Whisper</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-center transition-colors">
              Buy Day Pass
            </Link>
          </div>

          {/* Plan 2 - Highlighted */}
          <div className="relative p-8 rounded-2xl border border-blue-500 bg-blue-950/10 flex flex-col justify-between shadow-[0_4px_30px_rgba(59,130,246,0.1)]">
            <span className="absolute top-4 right-4 text-[10px] font-bold text-blue-400 uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/5">Popular</span>
            <div>
              <div className="text-sm font-semibold text-zinc-400 mb-2">Technical Monthly</div>
              <div className="text-4xl font-extrabold text-white mb-6">$29<span className="text-xs text-zinc-500"> / month</span></div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Designed for active engineers in full recruitment loop sprints.</p>
              <ul className="space-y-3 mb-8 text-xs text-zinc-300">
                <li className="flex items-center gap-2">✓ Continuous monthly access</li>
                <li className="flex items-center gap-2">✓ Advanced LLM routing templates</li>
                <li className="flex items-center gap-2">✓ Historical transcripts log saver</li>
                <li className="flex items-center gap-2">✓ Low latency API gateways</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-center transition-all">
              Subscribe Monthly
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex flex-col justify-between hover:border-zinc-800 transition-colors">
            <div>
              <div className="text-sm font-semibold text-zinc-400 mb-2">HR Monthly</div>
              <div className="text-4xl font-extrabold text-white mb-6">$19<span className="text-xs text-zinc-500"> / month</span></div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Tailored specifically for behavioral, HR, and culture fits.</p>
              <ul className="space-y-3 mb-8 text-xs text-zinc-300">
                <li className="flex items-center gap-2">✓ Full monthly behavioral templates</li>
                <li className="flex items-center gap-2">✓ STAR method prompt formats</li>
                <li className="flex items-center gap-2">✓ Audio transcription mapping</li>
                <li className="flex items-center gap-2">✓ System support helpdesk</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-center transition-colors">
              Subscribe HR
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-20 border-t border-zinc-900">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-zinc-900 bg-zinc-950 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-6 text-left flex justify-between items-center hover:bg-zinc-900/30 transition-colors"
              >
                <span className="font-semibold text-sm md:text-base text-zinc-200">{faq.q}</span>
                <span className="text-zinc-500 transition-transform duration-300" style={{ transform: activeFaq === idx ? "rotate(180deg)" : "none" }}>▼</span>
              </button>
              {activeFaq === idx && (
                <div className="p-6 pt-0 border-t border-zinc-900/50 text-xs md:text-sm text-zinc-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-900 text-center text-xs text-zinc-500">
        <div className="flex justify-between items-center flex-col md:flex-row gap-6 mb-6">
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <span className="font-bold text-white tracking-tight">HireSky</span>
          </div>
          <div className="flex gap-6 text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
        </div>
        <p>&copy; {new Date().getFullYear()} HireSky. All rights reserved. Keep it professional.</p>
      </footer>

    </div>
  );
}
