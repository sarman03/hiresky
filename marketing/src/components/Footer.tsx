import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-xl text-text">HireSky</span>
          </Link>
          <p className="mt-4 text-sm text-text-dim">
            A copilot for your interview, visible to only one of you. Built
            for students getting ready for their next one.
          </p>
          <p className="mt-4 font-mono text-xs text-text-faint">
            macOS &amp; Windows · MIT-licensed core
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div>
            <div className="mb-3 font-mono text-xs text-text-faint">
              PRODUCT
            </div>
            <ul className="flex flex-col gap-2.5 text-text-dim">
              <li>
                <a href="/#how-it-works" className="hover:text-text">
                  How it works
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-text">
                  Features
                </a>
              </li>
              <li>
                <a href="/#privacy" className="hover:text-text">
                  Privacy
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-text">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 font-mono text-xs text-text-faint">
              COMPANY
            </div>
            <ul className="flex flex-col gap-2.5 text-text-dim">
              <li>
                <Link href="/contact" className="hover:text-text">
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  className="hover:text-text"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 font-mono text-xs text-text-faint">
              PLATFORMS
            </div>
            <ul className="flex flex-col gap-2.5 text-text-dim">
              <li>macOS</li>
              <li>Windows</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl border-t border-line pt-6 font-mono text-xs text-text-faint">
        © {new Date().getFullYear()} HireSky. Use responsibly and in line
        with the policies of any call you're on.
      </div>
    </footer>
  );
}
