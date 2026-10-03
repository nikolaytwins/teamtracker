"use client";

import "./moscow-design.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

export function MoscowPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="moscow-page flex min-h-0 flex-1 flex-col">
      <div className="msk-shell">
        <header className="msk-hero">
          <div className="msk-hero-inner">
            <span className="msk-kick">Москва · переходный период</span>
            <h1>{title}</h1>
            <p className="msk-lead">
              Материальная база, чтобы не предавать большое будущее. Сердце задаёт направление —
              реальность задаёт темп.
            </p>

            <div className="msk-creed">
              <p className="msk-creed-err">Ошибка — комфорт и кайф</p>
              <p className="msk-creed-god">
                Бог ждёт действий и активности от меня, а не удовольствия.
              </p>
              <p className="msk-creed-act">Мы фигачить должны</p>
            </div>

            <div className="msk-daily">
              <div className="msk-daily-main">
                <div className="msk-k">Каждый день</div>
                <ul className="msk-list">
                  <li>
                    <span className="msk-n">1</span>
                    <span>Ищу клиентов</span>
                  </li>
                  <li>
                    <span className="msk-n">2</span>
                    <span>Делаю 1 действие для будущего</span>
                  </li>
                </ul>
              </div>
              <div className="msk-focus">
                <div className="msk-k">В фокусе</div>
                <p className="msk-focus-t">
                  Поиск клиентов в агентство и работы за 150–180 тыс. ₽
                </p>
                <p className="msk-focus-s">
                  TwinLabs даёт cashflow. Найм — только если покупает время и устойчивость, не всю
                  жизнь.
                </p>
              </div>
            </div>
          </div>
        </header>

        <article className="msk-article msk-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {preserveSourceLineBreaks(body)}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
