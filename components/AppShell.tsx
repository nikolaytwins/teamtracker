"use client";

import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navigation />
      <main className="w-full min-h-screen pt-16 pb-8 pl-0 pr-4 sm:pr-6 lg:pt-6 lg:pl-[var(--sidebar-w)]">
        <div className="mx-auto w-full max-w-[min(100%,88rem)]">{children}</div>
      </main>
    </div>
  );
}
