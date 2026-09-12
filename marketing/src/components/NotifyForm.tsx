"use client";

import { useState } from "react";

const SUPPORT_EMAIL = "hello@hiresky.app";

export default function NotifyForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Add me to the HireSky waitlist");
    const body = encodeURIComponent(
      `Please add this address to the waitlist: ${email}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="min-w-[260px] max-w-[380px] flex-1">
      <form className="flex gap-2.5" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          className="flex-1 rounded-sm border border-line-strong bg-ink-2 px-3.5 py-3 text-sm text-text placeholder:text-text-faint"
        />
        <button
          type="submit"
          disabled={sent}
          className="rounded-sm bg-signal px-6 py-3 text-sm font-semibold whitespace-nowrap text-signal-ink transition-colors hover:bg-[#f5bb63] disabled:opacity-70"
        >
          {sent ? "Opening email…" : "Notify me"}
        </button>
      </form>
      <p className="mt-2 font-mono text-xs text-text-faint">
        Opens your email client, addressed to {SUPPORT_EMAIL}
      </p>
    </div>
  );
}
