'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const tabs = [
    { href: '/agency', label: 'Проекты' },
    { href: '/agency/statistics', label: 'Статистика' },
  ]

  return (
    <AppShell>
      <div className="bg-[var(--bg)] border-b border-[var(--border)] rounded-xl">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`py-4 px-1 border-b-2 text-sm font-medium ${
                  pathname === tab.href ||
                  (tab.href === '/agency' && pathname?.startsWith('/agency/projects')) ||
                  (tab.href === '/agency/statistics' && pathname?.startsWith('/agency/statistics'))
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--text)] hover:border-[var(--border)]'
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
    </AppShell>
  )
}
