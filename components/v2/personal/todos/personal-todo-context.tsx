"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalTodoBootstrap, PersonalTodoProjectRow } from "@/lib/v2/personal/todo-types";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type PersonalTodoQuickAddHandle = {
  focus: () => void;
};

type PersonalTodoContextValue = {
  loading: boolean;
  error: string | null;
  projects: PersonalTodoProjectRow[];
  inboxProjectId: string;
  counts: PersonalTodoBootstrap["counts"];
  listNonce: number;
  parentCandidates: Array<{ id: string; title: string }>;
  setParentCandidates: (items: Array<{ id: string; title: string }>) => void;
  subtaskParentId: string | null;
  setSubtaskParentId: (id: string | null) => void;
  refreshBootstrap: () => Promise<void>;
  bumpList: () => void;
  focusQuickAdd: () => void;
  registerQuickAdd: (handle: PersonalTodoQuickAddHandle | null) => void;
};

const PersonalTodoContext = createContext<PersonalTodoContextValue | null>(null);

export function PersonalTodoProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<PersonalTodoProjectRow[]>([]);
  const [inboxProjectId, setInboxProjectId] = useState("");
  const [counts, setCounts] = useState<PersonalTodoBootstrap["counts"]>({ inbox: 0, today: 0, overdue: 0 });
  const [listNonce, setListNonce] = useState(0);
  const [parentCandidates, setParentCandidates] = useState<Array<{ id: string; title: string }>>([]);
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null);
  const quickAddHandleRef = useRef<PersonalTodoQuickAddHandle | null>(null);

  const bumpList = useCallback(() => setListNonce((n) => n + 1), []);

  const registerQuickAdd = useCallback((handle: PersonalTodoQuickAddHandle | null) => {
    quickAddHandleRef.current = handle;
  }, []);

  const focusQuickAdd = useCallback(() => {
    quickAddHandleRef.current?.focus();
  }, []);

  const refreshBootstrap = useCallback(async () => {
    const data = await fetchJson<PersonalTodoBootstrap>("/api/v2/personal/todos/bootstrap");
    setProjects(data.projects);
    setInboxProjectId(data.inboxProjectId);
    setCounts(data.counts);
    setError(null);
  }, []);

  useEffect(() => {
    refreshBootstrap()
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить данные"))
      .finally(() => setLoading(false));
  }, [refreshBootstrap]);

  const value = useMemo(
    () => ({
      loading,
      error,
      projects,
      inboxProjectId,
      counts,
      listNonce,
      parentCandidates,
      setParentCandidates,
      subtaskParentId,
      setSubtaskParentId,
      refreshBootstrap,
      bumpList,
      focusQuickAdd,
      registerQuickAdd,
    }),
    [loading, error, projects, inboxProjectId, counts, listNonce, parentCandidates, subtaskParentId, refreshBootstrap, bumpList, focusQuickAdd, registerQuickAdd]
  );

  return <PersonalTodoContext.Provider value={value}>{children}</PersonalTodoContext.Provider>;
}

export function usePersonalTodo() {
  const ctx = useContext(PersonalTodoContext);
  if (!ctx) throw new Error("usePersonalTodo must be used within PersonalTodoProvider");
  return ctx;
}
