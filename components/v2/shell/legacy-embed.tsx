"use client";

import { appPath } from "@/lib/api-url";
import Link from "next/link";

export function V2LegacyEmbed({ title, v1Path }: { title: string; v1Path: string }) {
  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <h1 className="text-sm font-semibold">{title}</h1>
        <Link href={appPath(v1Path)} target="_blank" className="text-xs text-[var(--v2-brand-600)] hover:underline">
          Открыть в v1 ↗
        </Link>
      </div>
      <iframe title={title} src={appPath(v1Path)} className="min-h-0 flex-1 border-0 bg-white" />
    </div>
  );
}
