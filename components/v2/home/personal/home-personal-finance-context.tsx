"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";

type Ctx = {
  dashboard: HomePersonalFinancePayload | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const HomePersonalFinanceCtx = createContext<Ctx>({
  dashboard: null,
  loading: true,
  error: null,
  reload: async () => undefined,
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

  const reload = useCallback(async () => {
    try {
      const data = await fetchJson<HomePersonalFinancePayload>("/api/v2/home/finance");
      setDashboard(data);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void reload().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить финансы");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <HomePersonalFinanceCtx.Provider value={{ dashboard, loading, error, reload }}>
      {children}
    </HomePersonalFinanceCtx.Provider>
  );
}

export function useHomePersonalFinance() {
  return useContext(HomePersonalFinanceCtx);
}
