import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotifyForm from "@/components/NotifyForm";

export const metadata: Metadata = {
  title: "Pricing — HireSky",
  description:
    "HireSky plans for students prepping for one interview, students in an active interview loop, and bootcamps or career centers rolling it out to a cohort. Final pricing is being finalized — join the list to lock in early rates.",
};

const plans = [
  {
    name: "STARTER",
    forWhom:
      "For one interview at a time — a single upcoming interview you want to walk into prepared.",
    features: [
      "Screen-share-immune overlay, macOS or Windows",
      "Live audio transcription",
      "Fixed monthly call minutes",
      "Community support",
    ],
    cta: "Get notified",
    featured: false,
  },
  {
    name: "PRO",
    forWhom:
      "For students in an active interview loop — multiple rounds a week, with no usage anxiety.",
    features: [
      "Everything in Starter",
      "Screen OCR context (editors, docs, whiteboards)",
      "Unlimited call minutes",
      "Priority model latency",
      "Custom system prompt / persona",
    ],
    cta: "Get notified",
    featured: true,
  },
  {
    name: "TEAM",
    forWhom:
      "For bootcamps, coding schools, and career centers rolling HireSky out to a whole cohort.",
    features: [
      "Everything in Pro, per seat",
      "Centralized billing",
      "Usage analytics across the cohort",
      "Priority support",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const faqs = [
  {
    q: "Why isn't pricing live yet?",
    a: "Our cost per call is driven by transcription and model usage, both of which we're still measuring against real call lengths. We'd rather ship accurate tiers than guess and re-price on you later.",
  },
  {
    q: "Will early users be grandfathered in?",
    a: "Yes — anyone on the notify list before public pricing locks in the early rate for as long as they keep the subscription active.",
  },
  {
    q: "Is there a free tier?",
    a: "Starter is built to cover a single occasional call. Exact minutes included will be confirmed alongside pricing.",
  },
  {
    q: "Does Team require a minimum cohort size?",
    a: "Not decided yet — tell us your cohort size on this page or reach out directly and we'll scope it with you.",
  },
];

export default function Pricing() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:px-8 sm:pt-20">
        <div className="max-w-xl">
          <span className="font-mono text-sm text-signal">PRICING</span>
          <h1 className="mt-4 font-display text-4xl text-text sm:text-5xl">
            Three shapes of usage. Final numbers land at launch.
          </h1>
          <p className="mt-4 text-text-dim">
            We&apos;re still tuning rates against real transcription and
            model cost, so the amounts below are placeholders — not a quote.
            What won&apos;t change is what each tier includes.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-md border p-7 ${
                plan.featured
                  ? "glass-signal"
                  : "border-line-strong bg-ink-2/40"
              }`}
            >
              <span className="font-mono text-xs text-text-dim">
                {plan.name}
              </span>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="font-display text-4xl text-text">—</span>
                <span className="rounded-full border border-signal/40 px-2.5 py-0.5 font-mono text-[11px] text-signal">
                  TBA
                </span>
              </div>
              <p className="mt-4 text-sm text-text-dim">{plan.forWhom}</p>
              <ul className="mt-5 mb-6 flex-1 divide-y divide-line text-sm text-text-dim">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 py-2.5 first:pt-0">
                    <span className="font-mono text-signal">＋</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#notify"
                className={`rounded-sm px-5 py-3 text-center text-sm font-semibold transition-colors ${
                  plan.featured
                    ? "bg-signal text-signal-ink hover:bg-[#f5bb63]"
                    : "border border-line-strong text-text hover:border-text-dim"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div
          id="notify"
          className="dark-scope relative mt-22 overflow-hidden rounded-md"
        >
          <Image
            src="/images/code-dark-2.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-ink/80" />
          <div className="glass relative flex flex-wrap items-center justify-between gap-8 border-0 p-9">
            <div>
              <h3 className="font-display text-2xl text-text">
                Lock in early pricing.
              </h3>
              <p className="mt-1.5 text-sm text-text-dim">
                We&apos;ll email the people on this list before rates go
                public — with a discount for being early.
              </p>
            </div>
            <NotifyForm />
          </div>
        </div>

        <div className="mt-18 grid gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <h2 className="font-display text-3xl text-text">
            Questions people ask before the numbers exist.
          </h2>
          <div className="flex flex-col">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-line py-5 first:pt-0">
                <h3 className="font-semibold text-text">{f.q}</h3>
                <p className="mt-2 text-sm text-text-dim">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-text-dim">
            Have a question that&apos;s not here?{" "}
            <Link href="/contact" className="text-signal hover:underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
