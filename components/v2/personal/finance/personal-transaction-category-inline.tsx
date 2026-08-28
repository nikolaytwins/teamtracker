"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalBudgetCategoryRow, PersonalTransactionRow } from "@/lib/v2/personal/types";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function PersonalTransactionCategoryInline({
  transactionId,
  categoryId,
  categoryName,
  categoryTint,
  year,
  month,
  categories,
  onSaved,
  onCategoryCreated,
  onError,
}: {
  transactionId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryTint: string | null;
  year: number;
  month: number;
  categories: PersonalBudgetCategoryRow[];
  onSaved?: (transaction: PersonalTransactionRow) => void;
  onCategoryCreated?: (category: PersonalBudgetCategoryRow) => void;
  onError?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setCreateOpen(false);
      setNewName("");
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const saveCategory = async (nextId: string | null) => {
    if (nextId === categoryId) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const { transaction } = await fetchJson<{ transaction: PersonalTransactionRow }>(
        `/api/v2/personal/finance/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget_category_id: nextId }),
        }
      );
      onSaved?.(transaction);
      setOpen(false);
      setCreateOpen(false);
      setNewName("");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Не удалось сменить категорию");
    } finally {
      setSaving(false);
    }
  };

  const submitNewCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { category } = await fetchJson<{ category: PersonalBudgetCategoryRow }>(
        "/api/v2/personal/finance/budget/categories",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month, name }),
        }
      );
      onCategoryCreated?.(category);
      await saveCategory(category.id);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Не удалось создать категорию");
    } finally {
      setCreating(false);
    }
  };

  const label = categoryName ?? "Без категории";
  const tint = categoryTint ?? "#94A3B8";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={saving}
        title="Нажмите, чтобы сменить категорию"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-[var(--v2-ink-100)] disabled:opacity-50"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tint }} />
        {label}
        <V2Icons.chev className="h-3 w-3 text-[var(--v2-ink-400)]" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[9999] min-w-[180px] overflow-hidden rounded-xl border border-[var(--v2-ink-200)] bg-white py-1 shadow-[var(--v2-shadow-pop)]"
              style={{ top: position.top, left: position.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveCategory(null)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition hover:bg-[var(--v2-ink-50)] ${
                  !categoryId ? "bg-[var(--v2-brand-50)] font-medium text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-700)]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-ink-300)]" />
                Без категории
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void saveCategory(c.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition hover:bg-[var(--v2-ink-50)] ${
                    categoryId === c.id
                      ? "bg-[var(--v2-brand-50)] font-medium text-[var(--v2-brand-700)]"
                      : "text-[var(--v2-ink-700)]"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.tint }} />
                  {c.name}
                </button>
              ))}
              <div className="mt-1 border-t border-[var(--v2-ink-100)] px-2 py-2">
                {createOpen ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Новая категория"
                      disabled={creating || saving}
                      className="h-8 w-full rounded-lg border border-[var(--v2-brand-300)] px-2 text-[12px] outline-none focus:ring-2 focus:ring-[var(--v2-brand-100)]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitNewCategory();
                        }
                        if (e.key === "Escape") {
                          setCreateOpen(false);
                          setNewName("");
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={creating || saving || !newName.trim()}
                        onClick={() => void submitNewCategory()}
                        className="h-7 flex-1 rounded-md bg-[var(--v2-brand-600)] px-2 text-[11px] font-medium text-white disabled:opacity-45"
                      >
                        {creating ? "…" : "Создать"}
                      </button>
                      <button
                        type="button"
                        disabled={creating || saving}
                        onClick={() => {
                          setCreateOpen(false);
                          setNewName("");
                        }}
                        className="h-7 rounded-md px-2 text-[11px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCreateOpen(true)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-[12px] font-medium text-[var(--v2-brand-700)] transition hover:bg-[var(--v2-brand-50)]"
                  >
                    <V2Icons.plus className="h-3.5 w-3.5" />
                    Новая категория
                  </button>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
