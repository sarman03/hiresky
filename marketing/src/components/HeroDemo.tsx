"use client";

import Image from "next/image";
import { useState } from "react";

export default function HeroDemo() {
  const [view, setView] = useState<"interviewer" | "mine">("interviewer");
  const isMine = view === "mine";

  return (
    <div className="dark-scope mx-auto max-w-[560px]">
      {/* Laptop screen */}
      <div className="rounded-t-xl border border-line-strong border-b-0 bg-ink-3 px-3 pt-3">
        <div className="mb-2.5 flex justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
        </div>

        <div className="overflow-hidden rounded-sm border border-line-strong">
          <div className="flex items-center justify-between border-b border-line bg-ink-2 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div
              role="group"
              aria-label="Switch viewpoint"
              className="flex overflow-hidden rounded-full border border-line-strong font-mono text-[11px]"
            >
              <button
                type="button"
                onClick={() => setView("interviewer")}
                className={`px-3 py-1.5 transition-colors ${
                  !isMine ? "bg-signal text-signal-ink" : "text-text-faint"
                }`}
              >
                Interviewer&apos;s view
              </button>
              <button
                type="button"
                onClick={() => setView("mine")}
                className={`px-3 py-1.5 transition-colors ${
                  isMine ? "bg-signal text-signal-ink" : "text-text-faint"
                }`}
              >
                My view
              </button>
            </div>
          </div>

          <div className="relative aspect-[4/3] bg-ink p-5">
            <div className="flex gap-2.5">
              <div className="relative flex flex-1 aspect-video items-end overflow-hidden rounded-sm p-2">
                <Image
                  src="/images/panelist-1.jpg"
                  alt=""
                  fill
                  className="object-cover grayscale-[35%]"
                  sizes="260px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <span className="relative font-mono text-[10px] text-text">
                  INTERVIEWER_01
                </span>
              </div>
              <div className="relative flex flex-1 aspect-video items-end overflow-hidden rounded-sm p-2">
                <Image
                  src="/images/panelist-2.jpg"
                  alt=""
                  fill
                  className="object-cover grayscale-[35%]"
                  sizes="260px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <span className="relative font-mono text-[10px] text-text">
                  INTERVIEWER_02
                </span>
              </div>
            </div>

            <div
              className={`glass-signal absolute right-5 bottom-5 left-5 rounded-sm p-4 transition-all duration-300 ${
                isMine
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1.5 opacity-0"
              }`}
            >
              <span className="mb-1.5 block font-mono text-[11px] text-signal">
                HIRESKY · LIVE
              </span>
              <p className="text-sm text-text">
                &quot;Walk me through how you&apos;d shard this table&quot; →
                Start with access pattern, not row count. Shard on tenant_id —
                keeps every query single-shard.
              </p>
            </div>
          </div>

          <div className="border-t border-line bg-ink-2 px-4 py-3 font-mono text-xs text-text-faint">
            {isMine ? (
              <span className="text-signal">
                ● your laptop — overlay visible only here
              </span>
            ) : (
              <span>
                <span className="text-danger">●</span> interviewer&apos;s
                screen — 0 pixels of overlay captured
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Laptop base */}
      <div className="relative mx-auto h-4 w-[106%] -translate-x-[3%] rounded-b-2xl border border-t-0 border-line-strong bg-ink-3">
        <span className="absolute top-0 left-1/2 h-1 w-20 -translate-x-1/2 rounded-b-md bg-black/30" />
      </div>
    </div>
  );
}
