import { Unbounded } from "next/font/google";
import Link from "next/link";
import { appPath } from "@/lib/api-url";
import { LIFE_ARTICLES } from "@/lib/v2/personal/seeds/life-map-seed";
import "./life-map-article.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["200", "300", "400", "600", "800"],
  display: "swap",
  variable: "--font-unbounded",
});

export function LifeMapIndex() {
  return (
    <div className={`tt-lm-page tt-lm ${unbounded.variable}`}>
      <div className="tt-lm-wrap">
        <header className="tt-lm-index-head">
          <div className="tt-lm-kicker">Карта жизни</div>
          <h1>Статьи</h1>
          <p>Открой нужный текст — он на своей странице.</p>
        </header>
        <div className="tt-lm-grid">
          {LIFE_ARTICLES.map((article) => (
            <Link key={article.href} href={appPath(article.href)} className="tt-lm-card">
              {article.hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={appPath(article.hero)} alt="" />
              ) : (
                <div className="tt-lm-card-cover">{article.cover ?? article.label}</div>
              )}
              <div className="tt-lm-card-b">
                <div className="tt-lm-kicker">{article.label}</div>
                <h2>{article.title}</h2>
                <p>{article.lead}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
