"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-x-0 border-t-0">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl text-text">HireSky</span>
        </Link>

        <ul className="hidden items-center gap-8 text-sm text-text-dim md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-text">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="hidden rounded-sm border border-line-strong px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-text-dim sm:inline-block"
          >
            Get started
          </Link>
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-xl text-text md:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass border-x-0 border-b-0 px-6 pb-6 md:hidden">
          <ul className="flex flex-col gap-4 pt-2 text-sm text-text-dim">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-1 transition-colors hover:text-text"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="mt-2 inline-block rounded-sm border border-line-strong px-5 py-2.5 font-semibold text-text"
              >
                Get started
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
