"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

export function PersonalFinanceRulesClient({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#F7F8FC_0%,#FFFFFF_28%)]">
      <div className="mx-auto max-w-[760px] px-5 pb-24 pt-6 sm:px-8">
        <Link
          href={appPath("/v2/personal/finance/accounts")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-ink-800)]"
        >
          <V2Icons.chevL className="h-3.5 w-3.5" />
          Счета и фонды
        </Link>

        <article className="mt-6 overflow-hidden rounded-[28px] bg-white px-6 py-8 shadow-[var(--v2-shadow-soft)] sm:px-10 sm:py-10">
          <h1 className="v2-tighter text-[28px] font-bold leading-[1.15] text-[var(--v2-ink-900)] sm:text-[32px]">
            {title}
          </h1>
          <p className="v2-tight mt-2 text-[13.5px] text-[var(--v2-ink-500)]">
            Распределение в конце месяца: ₽, USD, AED и GEL
          </p>

          <div className="mt-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => {
                  const text = String(children);
                  if (text.trim() === title.trim()) return null;
                  return (
                    <h1 className="v2-tight mb-4 mt-8 text-[24px] font-bold text-[var(--v2-ink-900)] first:mt-0">
                      {children}
                    </h1>
                  );
                },
                h2: ({ children }) => (
                  <h2 className="v2-tight mb-3 mt-10 border-b border-[var(--v2-ink-100)] pb-2 text-[20px] font-bold text-[var(--v2-ink-900)] first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="v2-tight mb-2 mt-7 text-[16px] font-bold text-[var(--v2-ink-800)]">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="v2-tight mb-4 whitespace-pre-wrap text-[15.5px] leading-[1.75] text-[var(--v2-ink-700)]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--v2-ink-700)]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--v2-ink-700)]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--v2-ink-900)]">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto rounded-xl border border-[var(--v2-ink-100)]">
                    <table className="w-full min-w-[480px] border-collapse text-left text-[14px] text-[var(--v2-ink-700)]">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-[var(--v2-ink-50)] text-[12px] font-semibold uppercase tracking-wide text-[var(--v2-ink-500)]">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="border-b border-[var(--v2-ink-100)] px-4 py-3">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-[var(--v2-ink-100)] px-4 py-3 align-top">{children}</td>
                ),
                tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
              }}
            >
              {preserveSourceLineBreaks(body)}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
