"use client";

import { HomePersonalFinanceProvider } from "@/components/v2/home/personal/home-personal-finance-context";
import { HomeFinanceHero } from "@/components/v2/home/personal/home-finance-hero";
import { HomeSprintBody } from "@/components/v2/home/personal/home-sprint-body";
import type { HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";

export function V2PersonalHomeClient({ initialFinance }: { initialFinance?: HomePersonalFinancePayload | null }) {
  return (
    <HomePersonalFinanceProvider initial={initialFinance}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
          <HomeFinanceHero />
          <HomeSprintBody />
        </div>
      </div>
    </HomePersonalFinanceProvider>
  );
}
