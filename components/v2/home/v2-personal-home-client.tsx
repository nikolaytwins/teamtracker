"use client";

import { HomePersonalFinanceProvider } from "@/components/v2/home/personal/home-personal-finance-context";
import { HomeFinanceHero } from "@/components/v2/home/personal/home-finance-hero";
import { HomeSprintBody } from "@/components/v2/home/personal/home-sprint-body";
import type { HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";

export function V2PersonalHomeClient({ initialFinance }: { initialFinance?: HomePersonalFinancePayload | null }) {
  return (
    <HomePersonalFinanceProvider initial={initialFinance}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-4 px-3 pb-10 pt-4 sm:gap-5 sm:px-5 sm:pt-5 lg:gap-7 lg:px-9 lg:pb-24 lg:pt-7">
          <HomeFinanceHero />
          <HomeSprintBody />
        </div>
      </div>
    </HomePersonalFinanceProvider>
  );
}
