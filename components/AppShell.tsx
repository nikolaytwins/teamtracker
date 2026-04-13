"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tt-mesh min-h-screen text-[var(--text)]">
      <Navigation />
      <main className="w-full min-h-screen pt-16 pb-10 pl-0 pr-4 sm:pr-6 lg:pt-8 lg:pl-[var(--sidebar-w)]">
        <motion.div
          className="mx-auto w-full max-w-[min(100%,88rem)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
