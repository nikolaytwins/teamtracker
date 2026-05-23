"use client";

import type { ProjectDetailLink, ProjectDetailFile } from "@/lib/v2/projects/project-detail-types";
import { V2Icons } from "@/components/v2/ui/icons";
import { V2FileUploadDropzone } from "@/components/v2/ui/file-upload-dropzone";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useState } from "react";

function linkInitial(url: string): string {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return host.slice(0, 1).toUpperCase();
  } catch {
    return "L";
  }
}

function fileExt(name: string, kind: string): string {
  const ext = name.split(".").pop()?.toUpperCase();
  if (ext && ext.length <= 4) return ext;
  return kind.slice(0, 3).toUpperCase();
}

const FILE_KIND_META: Record<string, { bg: string; color: string }> = {
  pdf: { bg: "#FEECEC", color: "#E11D48" },
  png: { bg: "#EDE9FE", color: "#7C3AED" },
  doc: { bg: "#DBE6FE", color: "#2A56EB" },
  zip: { bg: "#CCFBF1", color: "#0F766E" },
};

export function ProjectDetailFilesTab({
  projectId,
  links,
  files,
  onReload,
}: {
  projectId: string;
  links: ProjectDetailLink[];
  files: ProjectDetailFile[];
  onReload: () => Promise<void>;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/projects/${projectId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim(), title: linkTitle.trim() || undefined }),
      });
      setLinkUrl("");
      setLinkTitle("");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-5 py-3.5">
          <h4 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">
            Ссылки <span className="ml-1 font-normal text-[var(--v2-ink-400)]">{links.length}</span>
          </h4>
        </div>
        <div className="divide-y divide-[var(--v2-ink-100)]/70">
          {links.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--v2-ink-400)]">Нет ссылок</p>
          ) : (
            links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-3 transition hover:bg-[var(--v2-ink-50)]/60"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-brand-50)] text-[12px] font-bold text-[var(--v2-brand-700)]">
                  {linkInitial(l.url)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="v2-tight truncate text-[13px] font-medium text-[var(--v2-ink-900)]">{l.title}</span>
                    {l.isPrimary ? (
                      <span className="rounded bg-[var(--v2-brand-100)] px-1 py-px text-[9.5px] font-semibold tracking-wider text-[var(--v2-brand-700)]">
                        MAIN
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-[11px] text-[var(--v2-ink-500)]">
                    {l.createdByName.split(" ")[0]} · {l.updatedLabel}
                  </div>
                </div>
                <V2Icons.arrowExt className="h-[14px] w-[14px] text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-700)]" />
              </a>
            ))
          )}
        </div>
        <form onSubmit={addLink} className="border-t border-[var(--v2-ink-100)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL ссылки"
              className="v2-input min-w-[200px] flex-1 text-[13px]"
            />
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Название (необязательно)"
              className="v2-input min-w-[160px] flex-1 text-[13px]"
            />
            <button
              type="submit"
              disabled={saving || !linkUrl.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              <V2Icons.plus className="h-4 w-4" /> Добавить ссылку
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-5 py-3.5">
          <h4 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">
            Файлы <span className="ml-1 font-normal text-[var(--v2-ink-400)]">{files.length}</span>
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                <th className="py-2 pl-5 text-left font-semibold">Имя</th>
                <th className="py-2 text-left font-semibold">Размер</th>
                <th className="py-2 text-left font-semibold">Автор</th>
                <th className="py-2 text-left font-semibold">Изменён</th>
                <th className="pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--v2-ink-100)]/70">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-[13px] text-[var(--v2-ink-400)]">
                    Нет файлов
                  </td>
                </tr>
              ) : (
                files.map((f) => {
                  const meta = FILE_KIND_META[f.kind] ?? FILE_KIND_META.pdf;
                  return (
                    <tr key={f.id} className="transition hover:bg-[var(--v2-ink-50)]/60">
                      <td className="py-2.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex h-8 w-7 items-center justify-center rounded-md text-[9px] font-bold tracking-wide"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {fileExt(f.name, f.kind)}
                          </span>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="v2-tight font-medium text-[var(--v2-ink-900)] hover:text-[var(--v2-brand-700)]">
                            {f.name}
                          </a>
                        </div>
                      </td>
                      <td className="v2-tnum text-[var(--v2-ink-500)]">{f.sizeLabel}</td>
                      <td className="text-[var(--v2-ink-700)]">{f.createdByName.split(" ")[0]}</td>
                      <td className="text-[var(--v2-ink-500)]">{f.dateLabel}</td>
                      <td className="pr-5">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
                          title="Скачать"
                        >
                          <V2Icons.download className="h-[13px] w-[13px]" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--v2-ink-100)] px-5 py-4">
          <V2FileUploadDropzone
            uploadPath={`/api/v2/projects/${projectId}/files`}
            onUploaded={onReload}
          />
        </div>
      </section>
    </div>
  );
}
