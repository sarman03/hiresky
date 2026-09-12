import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroDemo from "@/components/HeroDemo";

const pipeline = [
  {
    n: "01",
    title: "Sync",
    body: "Add the interview to your HireSky calendar and it's ready before you are — no last-minute setup once the call starts.",
  },
  {
    n: "02",
    title: "Capture",
    body: "System audio loopback and voice-activity detection pick up what's actually being said — yours and theirs. A configurable screen region grabs whatever you're looking at: an editor, a whiteboard, a shared doc.",
  },
  {
    n: "03",
    title: "Understand",
    body: "Speech is transcribed locally with Whisper. The screen capture runs through OCR. Both feed the same prompt, so the model answers the question you asked about the thing you're looking at — not a guess.",
  },
  {
    n: "04",
    title: "Respond",
    body: "Gemini streams the answer token by token over a local WebSocket to the overlay. It appears while you're still listening, not after the call.",
  },
  {
    n: "05",
    title: "Review",
    body: "The transcript, a scored summary, and your trend over past sessions are waiting in your history the moment you hang up.",
  },
];

const features = [
  {
    title: "Screen-share immune",
    body: "Excluded at the operating-system's window-server level on both platforms — not a drawing trick a frame inspector can catch.",
  },
  {
    title: "Hears the room",
    body: "Loopback audio capture plus voice-activity detection means it reacts to what's said, without you touching a keyboard mid-call.",
  },
  {
    title: "Reads the screen",
    body: "Point it at a code editor, a spec doc, or a whiteboard. OCR turns whatever's visible into context the model can reason over.",
  },
  {
    title: "Streams, doesn't dump",
    body: "Tokens arrive as the model produces them, so you're reading an answer forty words in while it's still writing word fifty.",
  },
  {
    title: "Native on both platforms",
    body: "A borderless, always-on-top Swift overlay on macOS; a WPF overlay on Windows. Not a browser tab you have to keep in the corner.",
  },
  {
    title: "Yours to tune",
    body: "Swap the audio device, resize the OCR region, edit the model's system prompt — every stage is a small, independently configurable module.",
  },
];

const faqs = [
  {
    q: "Can the interviewer or a screen recorder tell it's running?",
    a: "No — the overlay is excluded at the OS compositor level on both macOS and Windows, not just drawn with low opacity. It never enters the frame that Zoom, Meet, Teams, or OBS capture.",
  },
  {
    q: "Does it work for coding interviews, not just behavioral ones?",
    a: "Yes — the same plan covers both. Point it at a code editor and the OCR context feeds the model exactly what's on screen, not just the audio.",
  },
  {
    q: "What's the one thing it can't get around?",
    a: "A phone or webcam physically pointed at your screen still records whatever's on it — compositor-level exclusion can't stop optics. Use HireSky in line with the policies of whatever call you're on.",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-14 border-b border-line px-6 pt-16 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="font-mono text-sm text-signal">
              ● Built for student interviews · macOS &amp; Windows
            </span>
            <h1 className="reveal mt-4 font-display text-5xl leading-[1.05] text-text sm:text-6xl lg:text-7xl">
              A copilot for your interview,
              <br />
              visible to <em className="text-signal not-italic italic">only one</em> of
              you.
            </h1>
            <p
              className="reveal mt-6 max-w-[54ch] text-lg text-text-dim"
              style={{ animationDelay: "0.12s" }}
            >
              HireSky listens to your interview call, reads what&apos;s on
              your screen, and streams the answer to a native overlay only
              you can see. It sits at the operating-system level — so the
              call platform, and anyone recording it, renders nothing where
              it sits.
            </p>
            <div
              className="reveal mt-8 flex flex-wrap gap-3.5"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                href="/pricing"
                className="rounded-sm bg-signal px-6 py-3.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-[#f5bb63]"
              >
                Get started
              </Link>
              <a
                href="#how-it-works"
                className="rounded-sm border border-line-strong px-6 py-3.5 text-sm font-semibold text-text transition-colors hover:border-text-dim"
              >
                See how it works
              </a>
            </div>
          </div>

          <HeroDemo />
        </section>

        {/* Trust bar */}
        <section className="border-b border-line px-6 py-7 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 sm:justify-between">
            <span className="font-mono text-xs tracking-wide text-text-faint">
              WORKS ALONGSIDE
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-display text-lg text-text-dim">
              <span>Zoom</span>
              <span className="text-line-strong">/</span>
              <span>Google Meet</span>
              <span className="text-line-strong">/</span>
              <span>Microsoft Teams</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-line px-6 py-10 sm:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <div className="font-display text-4xl text-text">0px</div>
              <div className="mt-1.5 font-mono text-xs text-text-faint">
                OVERLAY IN CAPTURED FRAME
              </div>
            </div>
            <div>
              <div className="font-display text-4xl text-text">&lt;2s</div>
              <div className="mt-1.5 font-mono text-xs text-text-faint">
                AUDIO → ANSWER ON SCREEN
              </div>
            </div>
            <div>
              <div className="font-display text-4xl text-text">2</div>
              <div className="mt-1.5 font-mono text-xs text-text-faint">
                CONTEXT SOURCES: AUDIO + SCREEN
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-b border-line px-6 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
              <h2 className="font-display text-4xl text-text sm:text-5xl">
                Before, during, and after the call.
              </h2>
              <p className="max-w-[56ch] text-text-dim">
                No copy-pasting a question into a chat window mid-interview.
                HireSky stays attached to the whole thing — from the calendar
                invite to the scored transcript afterward.
              </p>
            </div>

            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
              {pipeline.map((step) => (
                <div key={step.n} className="border-t-2 border-signal-dim/40 pt-5">
                  <div className="font-mono text-sm text-signal-dim">
                    {step.n}
                  </div>
                  <h3 className="mt-3 font-display text-2xl text-text">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-text-dim">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-b border-line px-6 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
              <h2 className="font-display text-4xl text-text sm:text-5xl">
                Built for the moment you can&apos;t pause.
              </h2>
              <p className="max-w-[56ch] text-text-dim">
                Every part of HireSky exists to answer one question: what
                shows up on your screen, and what doesn&apos;t show up on
                anyone else&apos;s.
              </p>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="bg-ink p-8">
                  <h3 className="text-[1.1rem] font-semibold text-text">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-text-dim">{f.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="dark-scope relative aspect-[16/10] overflow-hidden rounded-md">
                <Image
                  src="/images/code-dark-1.jpg"
                  alt="A code editor, the kind of on-screen context HireSky's OCR pipeline reads"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
                <div className="glass absolute right-4 bottom-4 left-4 rounded-sm p-4">
                  <span className="font-mono text-[11px] text-signal">
                    OCR CONTEXT
                  </span>
                  <p className="mt-1 text-sm text-text">
                    Whatever&apos;s on screen becomes part of the prompt.
                  </p>
                </div>
              </div>
              <div className="dark-scope relative aspect-[16/10] overflow-hidden rounded-md">
                <Image
                  src="/images/code-dark-2.jpg"
                  alt="Source code on a dark editor theme"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
                <div className="glass absolute right-4 bottom-4 left-4 rounded-sm p-4">
                  <span className="font-mono text-[11px] text-signal">
                    LOW-LATENCY STREAM
                  </span>
                  <p className="mt-1 text-sm text-text">
                    Tokens land on the overlay as Gemini writes them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section
          id="privacy"
          className="border-b border-line px-6 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="font-mono text-sm text-signal">
                HOW THE INVISIBILITY ACTUALLY WORKS
              </span>
              <h2 className="mt-4 font-display text-4xl text-text sm:text-5xl">
                Not hidden. Excluded.
              </h2>
              <p className="mt-4 max-w-[58ch] text-text-dim">
                Most &quot;hidden window&quot; tricks just lower opacity or
                move off-screen — a screen recorder still sees them.
                HireSky&apos;s overlay instead sets a flag the OS compositor
                itself checks before it writes a capture frame. The window is
                present, focused, and visible to your eyes on the physical
                display; it simply never enters the buffer that Zoom, Meet,
                Teams, or OBS read from.
              </p>

              <div className="mt-6 border-l-2 border-danger py-1 pl-4">
                <span className="font-mono text-xs text-danger">
                  ONE HONEST LIMIT
                </span>
                <p className="mt-1 max-w-[58ch] text-sm text-text-dim">
                  A phone or webcam physically pointed at your screen will
                  still record whatever is on it — compositor flags
                  can&apos;t stop optics. Use HireSky in line with the
                  policies of whatever call you&apos;re on.
                </p>
              </div>

              <div className="glass mt-8 divide-y divide-line rounded-md overflow-hidden">
                {[
                  ["Platforms", "macOS and Windows, native apps on both"],
                  ["Enforced by", "The OS compositor, not the app itself"],
                  ["Tested against", "Zoom, Google Meet, Microsoft Teams, OBS"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[110px_1fr] gap-4 px-5 py-4 text-sm"
                  >
                    <span className="font-mono text-xs text-text-faint">
                      {k}
                    </span>
                    <span className="text-text">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dark-scope relative aspect-[3/4] overflow-hidden rounded-md">
              <Image
                src="/images/glass-reflection.jpg"
                alt="A person working reflected in glass panelling, echoing HireSky's visible-to-you-only overlay"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="border-b border-line px-6 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.7fr_1.3fr]">
            <h2 className="font-display text-3xl text-text sm:text-4xl">
              Quick answers.
            </h2>
            <div className="flex flex-col">
              {faqs.map((f) => (
                <div key={f.q} className="border-b border-line py-5 first:pt-0 last:border-0">
                  <h3 className="font-semibold text-text">{f.q}</h3>
                  <p className="mt-2 text-sm text-text-dim">{f.a}</p>
                </div>
              ))}
              <p className="pt-5 text-sm text-text-dim">
                More on{" "}
                <Link href="/pricing" className="text-signal hover:underline">
                  pricing
                </Link>{" "}
                and{" "}
                <Link href="/contact" className="text-signal hover:underline">
                  contact
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="px-6 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-10">
            <h2 className="max-w-[14ch] font-display text-4xl text-text sm:text-5xl">
              Your next interview is already on the calendar.
            </h2>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/pricing"
                className="rounded-sm bg-signal px-6 py-3.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-[#f5bb63]"
              >
                See plans
              </Link>
              <Link
                href="/contact"
                className="rounded-sm border border-line-strong px-6 py-3.5 text-sm font-semibold text-text transition-colors hover:border-text-dim"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
