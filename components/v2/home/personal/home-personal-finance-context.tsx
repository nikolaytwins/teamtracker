"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalFinanceDashboard } from "@/lib/v2/personal/types";

type Ctx = {
  dashboard: PersonalFinanceDashboard | null;
  loading: boolean;
  error: string | null;
};

const HomePersonalFinanceCtx = createContext<Ctx>({
  dashboard: null,
  loading: true,
  error: null,
});

export function HomePersonalFinanceProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<PersonalFinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJson<PersonalFinanceDashboard>("/api/v2/personal/finance/dashboard");
        if (!cancelled) {
          setDashboard(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить финансы");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <HomePersonalFinanceCtx.Provider value={{ dashboard, loading, error }}>
      {children}
    </HomePersonalFinanceCtx.Provider>
  );
}

export function useHomePersonalFinance() {
  return useContext(HomePersonalFinanceCtx);
}
