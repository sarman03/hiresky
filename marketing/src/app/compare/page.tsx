import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "How HireSky compares — HireSky",
  description:
    "How HireSky's architecture and pricing differ from other AI meeting and interview assistants, based on what each product publishes about itself.",
};

const rows: [string, string, string, string][] = [
  [
    "Built for",
    "Interviews specifically — calendar sync, live assist, transcript + scoring afterward",
    "General meetings — sales calls, standups, homework, interviews",
    "Live interviews specifically",
  ],
  [
    "Platform",
    "Native macOS and Windows apps",
    "Desktop app + mobile, distributed via app stores",
    "Runs in the browser",
  ],
  [
    "Screen awareness",
    "Built-in OCR — reads a code editor, doc, or whiteboard as context",
    "Not a stated feature",
    "Not a stated feature",
  ],
  [
    "Screen-share exclusion",
    "OS compositor flag, on both platforms, at every price",
    "Available, gated to the top pricing tier",
    "Stated as a feature; mechanism not published",
  ],
  [
    "Pricing shape",
    "One flat price — a day pass or a monthly plan",
    "Free tier, then two paid tiers by feature access",
    "Subscription plans and separate pay-as-you-go credit packs",
  ],
  [
    "States its own limits",
    "Yes — a phone or camera pointed at the screen still records it",
    "Not stated",
    "Not stated",
  ],
];

export default function Compare() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:px-8 sm:pt-20">
        <div className="max-w-2xl">
          <span className="font-mono text-sm text-signal">COMPARE</span>
          <h1 className="mt-4 font-display text-4xl text-text sm:text-5xl">
            How HireSky compares.
          </h1>
          <p className="mt-4 text-text-dim">
            Cluely and Parakeet AI are the two products people most often ask
            about. This is a straight comparison of what each one publishes
            about itself — not a takedown. All three are reasonable tools;
            they&apos;re just built around different bets.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-ink-2">
                <th className="px-5 py-4 text-left font-mono text-xs font-normal tracking-wide text-text-faint">
                  &nbsp;
                </th>
                <th className="px-5 py-4 text-left font-display text-base font-normal text-signal">
                  HireSky
                </th>
                <th className="px-5 py-4 text-left font-mono text-xs font-normal tracking-wide text-text-faint">
                  Cluely
                </th>
                <th className="px-5 py-4 text-left font-mono text-xs font-normal tracking-wide text-text-faint">
                  Parakeet AI
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, hiresky, cluely, parakeet]) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <td className="px-5 py-4 align-top font-mono text-xs text-text-faint">
                    {label}
                  </td>
                  <td className="px-5 py-4 align-top text-text">{hiresky}</td>
                  <td className="px-5 py-4 align-top text-text-dim">
                    {cluely}
                  </td>
                  <td className="px-5 py-4 align-top text-text-dim">
                    {parakeet}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 font-mono text-xs text-text-faint">
          Based on each product&apos;s own site as of {" "}
          {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
          . Products change — check theirs directly before deciding.
        </p>

        <div className="mt-16 max-w-2xl">
          <h2 className="font-display text-2xl text-text">
            The actual difference
          </h2>
          <p className="mt-3 text-text-dim">
            Cluely and Parakeet both solve the moment of the call. HireSky
            tries to be honest about the fact that an interview isn&apos;t
            just a call — it&apos;s a thing on your calendar beforehand and a
            transcript you should learn from afterward. And the one place a
            recruiter or interviewer would actually check for a hidden
            tool — a screen recording — is the one place HireSky is
            engineered, not just marketed, to never appear.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap gap-3.5">
          <Link
            href="/pricing"
            className="rounded-sm bg-signal px-6 py-3.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-[#f5bb63]"
          >
            See HireSky pricing
          </Link>
          <Link
            href="/#privacy"
            className="rounded-sm border border-line-strong px-6 py-3.5 text-sm font-semibold text-text transition-colors hover:border-text-dim"
          >
            How the invisibility works
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
