"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{
    tasks: Array<{ id: string; title: string }>;
    projects: Array<{ id: string; name: string }>;
  }>({ tasks: [], projects: [] });
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults({ tasks: [], projects: [] });
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults({ tasks: [], projects: [] });
      return;
    }
    const t = setTimeout(() => {
      fetch(apiUrl(`/api/v2/search?q=${encodeURIComponent(q)}`), { credentials: "include" })
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults({ tasks: [], projects: [] }));
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[15vh]">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Закрыть" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
        <input
          autoFocus
          className="v2-input text-base"
          placeholder="Найти задачу или проект…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
          {results.tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--v2-ink-50)]"
                onClick={() => {
                  onClose();
                  router.push(appPath("/v2/home"));
                }}
              >
                Задача: {t.title}
              </button>
            </li>
          ))}
          {results.projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--v2-ink-50)]"
                onClick={() => {
                  onClose();
                  router.push(appPath(`/v2/projects?project=${p.id}`));
                }}
              >
                Проект: {p.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
