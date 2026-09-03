#!/usr/bin/env python3
"""
Контекст Sofia Plan / dispatch из Team Tracker (tt.twinlabs.ru).

Перед советом о проекте, цене, сроке, загрузке или перепланировании
агент должен вызвать этот скрипт и опираться на вывод, а не на память.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

import requests

DEFAULT_URL = "https://tt.twinlabs.ru/api/integrations/sophia/dispatch/context"
ENV_FILE = Path("/etc/team-tracker.env")


def load_secret() -> str:
    secret = os.environ.get("TT_INTEGRATION_SECRET", "").strip()
    if len(secret) >= 16:
        return secret
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("TT_INTEGRATION_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def api_url() -> str:
    return os.environ.get("TT_DISPATCH_URL", DEFAULT_URL).strip() or DEFAULT_URL


def fetch_context(secret: str, year: int, month: int) -> dict:
    resp = requests.get(
        api_url(),
        params={"year": year, "month": month},
        headers={"x-tt-integration-secret": secret, "Content-Type": "application/json"},
        timeout=45,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"API {resp.status_code} — {resp.text[:300]}")
    return resp.json()


def fmt_rub(n: float | int) -> str:
    return f"{int(round(n)):,}".replace(",", " ") + " ₽"


def format_summary(ctx: dict) -> str:
    fin = ctx.get("finance") or {}
    plan = ctx.get("plan") or {}
    rules = (ctx.get("rules") or {}).get("rules") or {}
    pricing = rules.get("pricing") or {}
    capacity = rules.get("capacity") or {}

    lines: list[str] = []
    y, m = fin.get("year"), fin.get("month")
    lines.append(f"DISPATCH CONTEXT — {m:02d}.{y}" if y and m else "DISPATCH CONTEXT")
    lines.append("")
    lines.append("Деньги месяца:")
    lines.append(f"  надёжная прибыль: {fmt_rub(fin.get('reliableProfitRub', 0))}")
    lines.append(f"  плановая прибыль: {fmt_rub(fin.get('plannedProfitRub', 0))}")
    lines.append(f"  фактическая: {fmt_rub(fin.get('actualProfitRub', 0))}")
    lines.append("")
    lines.append("Пороги:")
    lines.append(f"  мин. надёжная: {fmt_rub(fin.get('reliableProfitMinRub', 0))}")
    lines.append(f"  цель плановая: {fmt_rub(fin.get('plannedProfitTargetRub', 0))}")
    lines.append("")
    lines.append("Ставки (правила):")
    lines.append(f"  нижний порог: {fmt_rub(pricing.get('minEffectiveRateRub', 4000))}/ч")
    lines.append(f"  целевая: {fmt_rub(pricing.get('targetEffectiveRateRub', 5000))}/ч")
    lines.append(f"  срочная: {fmt_rub(pricing.get('urgentEffectiveRateRub', 6000))}/ч")
    lines.append("")
    lines.append("Мощность:")
    lines.append(f"  плановых ч/день: {capacity.get('plannedHoursPerDay', '?')}")
    lines.append(f"  доля резерва: {capacity.get('reserveShare', '?')}")
    lines.append(f"  часов в активных проектах (остаток): {plan.get('totalPlannedHoursRemaining', '?')}")
    lines.append("")

    active = plan.get("activeProjects") or []
    risk = plan.get("approvalRiskProjects") or []
    if active:
        lines.append("Активные проекты:")
        for p in active[:12]:
            hrs = p.get("plannedHoursRemaining")
            dl = p.get("workDeadline") or "—"
            amt = p.get("effectiveTotalAmount") or p.get("totalAmount") or 0
            lines.append(
                f"  • {p.get('name', '?')} | {p.get('dispatchWorkStatus', '?')} | "
                f"дедлайн {dl} | ~{hrs if hrs is not None else '?'} ч | {fmt_rub(amt)}"
            )
    else:
        lines.append("Активные проекты: нет")

    if risk:
        lines.append("")
        lines.append("На согласовании (риск возврата):")
        for p in risk[:6]:
            lines.append(f"  • {p.get('name', '?')}")

    lines.append("")
    lines.append("Формат ответа пользователю:")
    lines.append("  **Главное решение:** …")
    lines.append("  **Запасной вариант:** …")
    lines.append("  **Почему:** 2–4 факта из данных выше")
    lines.append("  **Что изменится:** …")
    lines.append("  **Клиенту:** … (если нужно)")
    lines.append("")
    lines.append("Не создавай проект и не меняй план без явной команды «беру/добавь/перенеси».")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Team Tracker dispatch context for Sofia")
    parser.add_argument("--year", type=int, default=date.today().year)
    parser.add_argument("--month", type=int, default=date.today().month)
    parser.add_argument("--json", action="store_true", help="Сырой JSON")
    parser.add_argument(
        "--for-message",
        help="После контекста напомнить, что пользователь спросил (для агента)",
    )
    args = parser.parse_args()

    secret = load_secret()
    if len(secret) < 16:
        print("ERROR: TT_INTEGRATION_SECRET не настроен (/etc/team-tracker.env)")
        return 1

    try:
        ctx = fetch_context(secret, args.year, args.month)
    except requests.RequestException as exc:
        print(f"ERROR: сеть — {exc}")
        return 1
    except RuntimeError as exc:
        print(f"ERROR: {exc}")
        return 1

    if args.json:
        print(json.dumps(ctx, ensure_ascii=False, indent=2))
        return 0

    print(format_summary(ctx))
    if args.for_message:
        print("")
        print(f"Вопрос пользователя: {args.for_message.strip()}")
        print("Ответь по формату выше, опираясь только на контекст.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
