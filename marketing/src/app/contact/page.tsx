import type { Metadata } from "next";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — HireSky",
  description:
    "Questions about HireSky, a bug to report, or a team rollout to scope — reach out.",
};

export default function Contact() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:px-8 sm:pt-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <span className="font-mono text-sm text-signal">CONTACT</span>
            <h1 className="mt-4 font-display text-4xl text-text sm:text-5xl">
              Tell us what&apos;s on your screen.
            </h1>
            <p className="mt-4 max-w-[52ch] text-text-dim">
              A bug, a platform you need supported, a team rollout to scope
              — whatever it is, this reaches a person, not a queue.
            </p>

            <div className="mt-10 glass overflow-hidden rounded-md">
              <div className="dark-scope relative aspect-[16/9]">
                <Image
                  src="/images/code-dark-1.jpg"
                  alt="A code editor at night"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
                <div className="p-5">
                  <span className="font-mono text-xs text-text-faint">
                    RESPONSE TIME
                  </span>
                  <p className="mt-1 text-sm text-text">Within 1 business day</p>
                </div>
                <div className="p-5">
                  <span className="font-mono text-xs text-text-faint">
                    PLATFORMS
                  </span>
                  <p className="mt-1 text-sm text-text">macOS &amp; Windows</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-md p-8">
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
