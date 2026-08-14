"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { S2Board, S2Entity } from "@/lib/v2/s2/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type MutateInput = {
  entity: S2Entity;
  action: "create" | "update" | "delete";
  id?: string;
  data?: Record<string, unknown>;
  force?: boolean;
};

type S2Ctx = {
  board: S2Board | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  mutate: (input: MutateInput) => Promise<{ warning?: string | null }>;
};

const Ctx = createContext<S2Ctx>({
  board: null,
  loading: true,
  error: null,
  reload: async () => {},
  mutate: async () => ({}),
});

export function useS2() {
  return useContext(Ctx);
}

export function S2Provider({ children }: { children: React.ReactNode }) {
  const [board, setBoard] = useState<S2Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ board: S2Board }>("/api/v2/personal/s2");
      setBoard(data.board);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mutate = useCallback(async (input: MutateInput) => {
    const data = await fetchJson<{ board: S2Board; warning?: string | null }>("/api/v2/personal/s2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setBoard(data.board);
    return { warning: data.warning };
  }, []);

  const value = useMemo(
    () => ({ board, loading, error, reload, mutate }),
    [board, loading, error, reload, mutate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
