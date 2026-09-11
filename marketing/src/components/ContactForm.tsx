"use client";

import { useState } from "react";

const SUPPORT_EMAIL = "hello@hiresky.app";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${name || "the site"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm text-text-dim">
          Name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-sm border border-line-strong bg-ink-2 px-4 py-3 text-sm text-text placeholder:text-text-faint"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-text-dim">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-sm border border-line-strong bg-ink-2 px-4 py-3 text-sm text-text placeholder:text-text-faint"
          placeholder="you@email.com"
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm text-text-dim"
        >
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none rounded-sm border border-line-strong bg-ink-2 px-4 py-3 text-sm text-text placeholder:text-text-faint"
          placeholder="What's on your mind?"
        />
      </div>
      <button
        type="submit"
        className="self-start rounded-sm bg-signal px-6 py-3.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-[#f5bb63]"
      >
        Send message
      </button>
      <p className="font-mono text-xs text-text-faint">
        Opens your email client, addressed to {SUPPORT_EMAIL}
      </p>
    </form>
  );
}
