"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";

type Ctx = {
  dashboard: HomePersonalFinancePayload | null;
  loading: boolean;
  error: string | null;
};

const HomePersonalFinanceCtx = createContext<Ctx>({
  dashboard: null,
  loading: true,
  error: null,
});

export function HomePersonalFinanceProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: HomePersonalFinancePayload | null;
}) {
  const [dashboard, setDashboard] = useState<HomePersonalFinancePayload | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJson<HomePersonalFinancePayload>("/api/v2/home/finance");
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
