import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

export const metadata: Metadata = {
  title: "HireSky Dashboard",
  description: "Centralized Web Platform for HireSky Interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0c" }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
