"use client";

import { uploadFiles } from "@/lib/v2/client/upload-files";
import { V2Icons } from "@/components/v2/ui/icons";
import { useRef, useState } from "react";

export function V2FileUploadDropzone({
  uploadPath,
  onUploaded,
  compact = false,
  disabled = false,
  className = "",
}: {
  uploadPath: string;
  onUploaded: () => void | Promise<void>;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList || disabled || uploading) return;
    const files = Array.from(fileList).filter((f) => f.size > 0);
    if (!files.length) return;

    setUploading(true);
    setError(null);
    try {
      await uploadFiles<{ files: unknown[] }>(uploadPath, files);
      await onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить файлы");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !uploading) {
            e.dataTransfer.dropEffect = "copy";
            setDragging(true);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`relative cursor-pointer rounded-xl border border-dashed text-center transition ${
          compact ? "px-3 py-4" : "px-5 py-8"
        } ${
          dragging
            ? "border-[var(--v2-brand-500)] bg-[var(--v2-brand-50)]/70"
            : "border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/40 hover:border-[var(--v2-ink-300)] hover:bg-[var(--v2-ink-50)]/80"
        } ${disabled || uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className={`mx-auto flex flex-col items-center gap-2 ${compact ? "gap-1.5" : ""}`}>
          <span
            className={`inline-flex items-center justify-center rounded-xl bg-white text-[var(--v2-brand-700)] shadow-sm ${
              compact ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            {uploading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--v2-brand-200)] border-t-[var(--v2-brand-700)]" />
            ) : (
              <V2Icons.upload className={compact ? "h-4 w-4" : "h-5 w-5"} />
            )}
          </span>
          <div>
            <p className={`font-medium text-[var(--v2-ink-900)] ${compact ? "text-[12px]" : "text-[13px]"}`}>
              {uploading ? "Загрузка…" : "Перетащите файлы сюда"}
            </p>
            <p className={`mt-0.5 text-[var(--v2-ink-500)] ${compact ? "text-[11px]" : "text-[12px]"}`}>
              или <span className="text-[var(--v2-brand-700)]">выберите на компьютере</span>
              {!compact ? " · можно несколько сразу" : ""}
            </p>
          </div>
        </div>
      </div>
      {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}
