"use client";

import { apiUrl } from "@/lib/api-url";
import { useCallback, useEffect, useRef, useState } from "react";

type ClientSuggestion = { id: string; display_name: string };

export function ClientNameInput({
  value,
  onChange,
  onClientIdChange,
}: {
  value: string;
  onChange: (name: string) => void;
  onClientIdChange: (id: string | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v2/clients?q=${encodeURIComponent(trimmed)}`), {
        credentials: "include",
      });
      const data = (await res.json()) as { clients?: ClientSuggestion[] };
      setSuggestions(data.clients ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (open) void fetchSuggestions(value);
    }, 200);
    return () => clearTimeout(t);
  }, [value, open, fetchSuggestions]);

  function pick(client: ClientSuggestion) {
    onChange(client.display_name);
    onClientIdChange(client.id);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <input
        className="v2-input"
        placeholder="Имя и фамилия"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onClientIdChange(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
      />
      {open && value.trim() && (suggestions.length > 0 || loading) ? (
        <ul
          className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[var(--v2-ink-200)] bg-white py-1 shadow-[var(--v2-shadow-pop)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading && suggestions.length === 0 ? (
            <li className="v2-tight px-3 py-2 text-[12px] text-[var(--v2-ink-400)]">Поиск…</li>
          ) : null}
          {suggestions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="v2-tight block w-full px-3 py-2 text-left text-[13px] text-[var(--v2-ink-800)] hover:bg-[var(--v2-ink-50)]"
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  pick(c);
                }}
              >
                {c.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="v2-tight mt-1.5 text-[11px] text-[var(--v2-ink-400)]">
        Повторный ввод того же имени привяжет проект к существующей карточке клиента
      </p>
    </div>
  );
}
