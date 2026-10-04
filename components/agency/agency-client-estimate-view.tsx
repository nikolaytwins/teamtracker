"use client";

import { useMemo, useState } from "react";
import type { PublicClientEstimate } from "@/lib/agency/client-share";
import "./agency-client-estimate-design.css";

const STATUS_LABELS: Record<string, string> = {
  not_paid: "Не оплачен",
  prepaid: "Предоплата",
  paid: "Оплачен",
};

function money(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

export function AgencyClientEstimateView({ data }: { data: PublicClientEstimate }) {
  const lastKey = data.months[data.months.length - 1]?.key ?? "";
  const [monthKey, setMonthKey] = useState(lastKey);
  const month = useMemo(
    () => data.months.find((m) => m.key === monthKey) ?? data.months[data.months.length - 1] ?? null,
    [data.months, monthKey]
  );

  if (!month) {
    return (
      <div className="agency-client-v3">
        <div className="page">
          <section className="card pad">
            <div className="brand">
              <span className="brand-mark" />
              <span className="brand-t">Twin Labs</span>
            </div>
            <h1>{data.name}</h1>
            <p className="lead">Смета пока пустая.</p>
          </section>
        </div>
      </div>
    );
  }

  const due = Math.max(0, month.total - month.paidAmount);
  const paid = month.status === "paid" || (month.total > 0 && month.paidAmount >= month.total);

  return (
    <div className="agency-client-v3">
      <div className="page">
        <section className="card pad">
          <div className="brand">
            <span className="brand-mark" />
            <span className="brand-t">Twin Labs</span>
          </div>
          <span className="kick">Проект</span>
          <h1>{data.name}</h1>
          <p className="lead">Выполненные работы и суммы по месяцам. Обновляется по мере выполнения задач.</p>
        </section>

        {data.months.length > 0 ? (
          <div className="months">
            {data.months.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`month${m.key === month.key ? " on" : ""}`}
                onClick={() => setMonthKey(m.key)}
              >
                {m.label}
                <span>{money(m.total)}</span>
              </button>
            ))}
          </div>
        ) : null}

        <section className="card pad">
          <div className="sum3">
            <div className="st">
              <div className="st-l">Работ за месяц</div>
              <div className="st-v">{month.lines.length}</div>
            </div>
            <div className="st st--acc">
              <div className="st-l">Сумма</div>
              <div className="st-v">{money(month.total)}</div>
            </div>
            <div className="st">
              <div className="st-l">Статус</div>
              <div className={`pill ${paid ? "pill--ok" : "pill--wait"}`}>
                <span className="dot" />
                {STATUS_LABELS[month.status] ?? month.status}
              </div>
            </div>
          </div>
        </section>

        <section className="card pad">
          <div className="headrow">
            <h2 className="sec-title">Список работ</h2>
            <span className="sec-sub">{month.label}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Услуга</th>
                <th className="right">Кол-во</th>
                <th className="right">Стоимость</th>
                <th className="right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {month.lines.map((line, i) => (
                <tr key={`${line.title}-${i}`}>
                  <td>
                    <div className="t-name">{line.title}</div>
                    {line.package ? <div className="sub">пакет</div> : null}
                  </td>
                  <td className="right">{line.package ? 1 : line.quantity}</td>
                  <td className="right">{money(line.unitPrice)}</td>
                  <td className="right">
                    <span className="sum">{money(line.sum)}</span>
                  </td>
                </tr>
              ))}
              {month.lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    За этот месяц работ пока нет
                  </td>
                </tr>
              ) : (
                <tr className="totrow">
                  <td>Итого</td>
                  <td />
                  <td />
                  <td className="right">{money(month.total)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="note">
            <svg className="svgi" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 8h.01" />
            </svg>
            <div>
              Работы по факту оцениваются пакетом: в сумму входит вся работа над задачей — подготовка, правки и
              финальная сдача.
            </div>
          </div>
        </section>

        <section className="pay">
          <div>
            <span className="kick">{paid ? "Оплачено" : "К оплате"}</span>
            <h3>{money(paid ? month.paidAmount || month.total : due)}</h3>
            <p>
              {paid
                ? "Счёт за этот месяц закрыт."
                : month.paidAmount > 0
                  ? `Уже оплачено ${money(month.paidAmount)}. Остаток указан выше.`
                  : "Счёт по выполненным работам за выбранный месяц."}
            </p>
          </div>
          <button type="button" className="btn btn--wh" onClick={() => window.print()}>
            Скачать счёт PDF
          </button>
        </section>

        <div className="foot">
          Twin Labs · вопросы по счёту — в общий чат проекта
          <br />
          Страница доступна по ссылке, обновляется автоматически.
        </div>
      </div>
    </div>
  );
}
