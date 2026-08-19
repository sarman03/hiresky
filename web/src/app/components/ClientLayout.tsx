"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes that shouldn't show the dashboard layout/sidebar and need their own styling (e.g. dark marketing page, auth screens)
  const isPublicRoute = pathname === "/landing" || pathname === "/login" || pathname === "/signup";

  if (isPublicRoute) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 text-white">
        {children}
      </div>
    );
  }

  // Dashboard layout
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8f8f9" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "28px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
