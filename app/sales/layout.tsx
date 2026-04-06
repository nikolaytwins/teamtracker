"use client";

import Navigation from "@/components/Navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/sales/leads", label: "Лиды" },
  { href: "/sales/profi", label: "Profi.ru" },
  { href: "/sales/threads", label: "Threads" },
  { href: "/sales/analytics", label: "Аналитика" },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-500 pt-3">Продажи</p>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`py-3 px-1 border-b-2 text-sm font-medium ${
                  pathname === tab.href
                    ? "border-violet-500 text-violet-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
