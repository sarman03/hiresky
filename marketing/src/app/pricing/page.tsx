import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotifyForm from "@/components/NotifyForm";

export const metadata: Metadata = {
  title: "Pricing — HireSky",
  description:
    "HireSky pricing: a 24-hour day pass or a monthly plan, both covering technical and coding interviews. Not publicly launched yet — join the list to be first in when it opens.",
};

const plans = [
  {
    name: "DAY PASS",
    price: "₹299",
    cadence: "/24h",
    forWhom:
      "For one interview at a time — a single upcoming round you want to walk into prepared.",
    features: [
      "Screen-share-immune overlay, macOS or Windows",
      "Live audio transcription",
      "Covers technical and coding interview formats",
      "24 hours of access from first use",
    ],
    cta: "Get notified",
    featured: false,
  },
  {
    name: "MONTHLY",
    price: "₹1,999",
    cadence: "/mo",
    forWhom:
      "For students in an active interview loop — multiple rounds a week, with no usage anxiety.",
    features: [
      "Everything in Day Pass",
      "Screen OCR context (editors, docs, whiteboards)",
      "Unlimited interviews for 30 days",
      "Covers technical and coding interview formats",
    ],
    cta: "Get notified",
    featured: true,
  },
  {
    name: "TEAM",
    price: "Custom",
    cadence: "",
    forWhom:
      "For bootcamps, coding schools, and career centers rolling HireSky out to a whole cohort.",
    features: [
      "Everything in Monthly, per seat",
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
    q: "Is this pricing final?",
    a: "Yes — Day Pass and Monthly are the real prices you'll pay at launch, not a placeholder. Team pricing is scoped per cohort since seat count varies.",
  },
  {
    q: "Will early users be grandfathered in?",
    a: "Yes — anyone on the notify list before public launch locks in these rates for as long as they keep the subscription active.",
  },
  {
    q: "Is there a free tier?",
    a: "Not currently. Every session runs on either the Day Pass or the Monthly plan — there's no limited free usage to fall back on.",
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
            Simple pricing. Not live yet.
          </h1>
          <p className="mt-4 text-text-dim">
            The amounts below are what you&apos;ll actually pay — not a
            placeholder. HireSky just hasn&apos;t opened to the public yet.
            One plan covers both technical and coding interview formats, no
            separate add-on required.
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
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-4xl text-text">
                  {plan.price}
                </span>
                {plan.cadence && (
                  <span className="font-mono text-sm text-text-faint">
                    {plan.cadence}
                  </span>
                )}
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
                Be first in when it opens.
              </h3>
              <p className="mt-1.5 text-sm text-text-dim">
                We&apos;ll email the people on this list the moment HireSky
                is publicly available — at the prices shown above, locked
                in for as long as you keep the subscription active.
              </p>
            </div>
            <NotifyForm />
          </div>
        </div>

        <div className="mt-18 grid gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <h2 className="font-display text-3xl text-text">
            Questions people ask before launch.
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
