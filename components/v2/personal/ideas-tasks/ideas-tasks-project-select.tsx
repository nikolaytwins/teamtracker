"use client";

import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalTodoProjectRow } from "@/lib/v2/personal/todo-types";
import { useState } from "react";

export function IdeasTasksProjectSelect({
  value,
  projects,
  onChange,
  ariaLabel = "Проект",
}: {
  value: string;
  projects: PersonalTodoProjectRow[];
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const { refreshBootstrap } = usePersonalTodo();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const title = name.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const res = await fetchJson<{ project: PersonalTodoProjectRow }>("/api/v2/personal/todos/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title }),
      });
      await refreshBootstrap();
      onChange(res.project.id);
      setName("");
      setCreating(false);
    } catch {
      /* keep the name field so the user can retry */
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <span className="proj-create">
        <input
          autoFocus
          value={name}
          disabled={saving}
          placeholder="Название проекта"
          aria-label="Название нового проекта"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              void create();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setCreating(false);
              setName("");
            }
          }}
        />
        <button type="button" disabled={!name.trim() || saving} onClick={() => void create()}>
          {saving ? "…" : "Ок"}
        </button>
      </span>
    );
  }

  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setCreating(true);
          return;
        }
        onChange(e.target.value);
      }}
    >
      <option value="">без проекта</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
      <option value="__new__">+ новый проект</option>
    </select>
  );
}
