"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { V2Icons } from "@/components/v2/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandPalette({
  open,
  onClose,
  onCreateTask,
}: {
  open: boolean;
  onClose: () => void;
  onCreateTask?: (title: string) => void;
}) {
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

  const trimmed = q.trim();
  const hasResults = results.tasks.length > 0 || results.projects.length > 0;

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
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed && onCreateTask) {
              e.preventDefault();
              onCreateTask(trimmed);
              onClose();
            }
          }}
        />
        <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
          {onCreateTask ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium text-[var(--v2-brand-700)] hover:bg-[var(--v2-brand-50)]"
                onClick={() => {
                  onCreateTask(trimmed);
                  onClose();
                }}
              >
                <V2Icons.plus className="h-4 w-4 shrink-0" />
                {trimmed ? `Создать задачу «${trimmed}»` : "Новая задача…"}
              </button>
            </li>
          ) : null}
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
          {!hasResults && trimmed.length >= 2 ? (
            <li className="px-3 py-2 text-[var(--v2-ink-500)]">Ничего не найдено</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
