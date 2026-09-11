import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "HireSky — the copilot only you can see",
  description:
    "HireSky helps students walk into interviews prepared. It listens to the call, reads your screen, and streams live answers to a native overlay that Zoom, Meet, and OBS cannot capture.",
};

const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('hiresky-theme');
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-ink text-text font-body antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
