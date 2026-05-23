import type { Metadata } from "next";
import { V2AppShell } from "@/components/v2/shell/v2-app-shell";
import "./v2.css";

export const metadata: Metadata = {
  title: "Тим v2",
  description: "Team Tracker v2",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2-root min-h-screen">
      <V2AppShell>{children}</V2AppShell>
    </div>
  );
}
