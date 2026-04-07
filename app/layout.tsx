import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Tracker — профиль, канбан и агентство",
  description: "Профиль, таймтрекер, канбан проектов и учёт агентства",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
