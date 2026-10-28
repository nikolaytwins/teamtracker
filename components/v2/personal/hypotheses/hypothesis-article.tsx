"use client";

import { Unbounded } from "next/font/google";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { appPath } from "@/lib/api-url";
import "./hypothesis-article.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "800"],
  display: "swap",
  variable: "--font-unbounded",
});

export function HypothesisArticle({
  title,
  body,
  hero,
}: {
  title: string;
  body: string;
  hero?: string;
}) {
  return (
    <div className={`hy-art ${unbounded.variable}`}>
      <div className="hy-art-wrap">
        <Link href={appPath("/v2/personal/articles")} className="hy-art-back">
          ← Все статьи
        </Link>
        {hero ? (
          <div className="hy-art-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appPath(hero)} alt="" />
          </div>
        ) : null}
        <article className="hy-art-doc">
          <h1>{title}</h1>
          <div className="hy-art-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
