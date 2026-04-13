import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход — Team Tracker",
  description: "Вход для сотрудников",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
