"use client";

import { useState } from "react";

export default function NotifyForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="flex min-w-[260px] max-w-[380px] flex-1 gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        setTimeout(() => setSent(false), 3000);
        e.currentTarget.reset();
      }}
    >
      <input
        type="email"
        required
        placeholder="you@email.com"
        aria-label="Email address"
        className="flex-1 rounded-sm border border-line-strong bg-ink-2 px-3.5 py-3 text-sm text-text placeholder:text-text-faint"
      />
      <button
        type="submit"
        disabled={sent}
        className="rounded-sm bg-signal px-6 py-3 text-sm font-semibold whitespace-nowrap text-signal-ink transition-colors hover:bg-[#f5bb63] disabled:opacity-70"
      >
        {sent ? "You're on the list" : "Notify me"}
      </button>
    </form>
  );
}
