"use client";

import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navigation />
      <main className="mx-auto w-full max-w-[1800px] px-4 pb-6 pt-20 lg:pt-6 lg:pr-[19rem]">{children}</main>
    </div>
  );
}
