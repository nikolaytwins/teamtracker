#!/usr/bin/env python3
"""
Финансовый помощник Team Tracker (tt.twinlabs.ru) для Telegram/VK Софии.

Примеры:
  python3 finance.py --message "заработал 250 тысяч"
  python3 finance.py --available 200000
  python3 finance.py --available 280000 --apply
  python3 finance.py --context
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import requests

DEFAULT_URL = "https://tt.twinlabs.ru/api/integrations/sophia/finance"
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
    return os.environ.get("TT_FINANCE_URL", DEFAULT_URL).strip() or DEFAULT_URL


def api_headers(secret: str) -> dict[str, str]:
    return {
        "x-tt-integration-secret": secret,
        "Content-Type": "application/json",
    }


def rub(n: float | int) -> str:
    return f"{int(round(n)):,}".replace(",", " ") + " ₽"


def print_plan(plan: dict) -> None:
    print(f"MODE: {plan.get('mode_label') or plan.get('mode')}")
    print(f"AVAILABLE: {rub(plan.get('available_rub') or 0)}")
    print(f"SUMMARY: {plan.get('summary') or ''}")
    for line in plan.get("lines") or []:
        amount = line.get("amount_rub") or 0
        if amount <= 0 and line.get("key") not in ("payments", "free"):
            continue
        note = f" — {line['note']}" if line.get("note") else ""
        fund = f" [{line['fund_key']}]" if line.get("fund_key") else ""
        print(f"  - {line.get('label')}: {rub(amount)}{fund}{note}")


def cmd_context(secret: str) -> int:
    resp = requests.get(api_url(), headers=api_headers(secret), timeout=30)
    if resp.status_code >= 400:
        print(f"ERROR: API {resp.status_code} — {resp.text[:300]}")
        return 1
    data = resp.json()
    ctx = data.get("context") or {}
    print(f"OK: cushion={rub(ctx.get('cushion_rub') or 0)} capital={rub(ctx.get('capital_rub') or 0)}")
    print(ctx.get("free_hint") or "")
    for f in ctx.get("funds") or []:
        key = f.get("fund_key") or "-"
        print(f"  {f.get('name')} [{key}]: {rub(f.get('amount_rub') or 0)}")
    print("RULES:")
    for r in data.get("rules") or []:
        print(f"  - {r}")
    return 0


def cmd_allocate(secret: str, available: int | None, message: str | None, apply: bool) -> int:
    body: dict = {"apply": apply}
    if available is not None:
        body["available_rub"] = available
    if message:
        body["message"] = message
    resp = requests.post(api_url(), headers=api_headers(secret), json=body, timeout=30)
    if resp.status_code >= 400:
        try:
            err = resp.json()
            print(f"ERROR: {err.get('error') or resp.text[:300]}")
            if err.get("hint"):
                print(f"HINT: {err['hint']}")
        except Exception:
            print(f"ERROR: API {resp.status_code} — {resp.text[:300]}")
        return 1
    data = resp.json()
    plan = data.get("plan") or {}
    print_plan(plan)
    if data.get("applied"):
        print("APPLIED:")
        for row in data.get("rows") or data.get("applied_rows") or []:
            print(
                f"  {row.get('name')}: {rub(row.get('before') or 0)} → {rub(row.get('after') or 0)} (+{rub(row.get('delta') or 0)})"
            )
        for s in data.get("skipped") or []:
            print(f"  SKIP: {s}")
        print("OK: записано в фонды")
    else:
        print("OK: план готов (без записи). Для записи добавь --apply после одобрения.")
    return 0


def looks_like_finance(message: str) -> bool:
    m = message.lower()
    if re.search(r"\d", m) and re.search(
        r"заработ|доступн|получил|доход|прибыл|разлож|куда\s+клад|фонд|подушк|свободн",
        m,
    ):
        return True
    if re.search(r"финанс|бюджет|куда\s+деньг|разложи", m):
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Team Tracker finance skill")
    parser.add_argument("--context", action="store_true", help="Текущие фонды и правила")
    parser.add_argument("--available", type=int, help="Доступная сумма в рублях")
    parser.add_argument("--message", type=str, help="Фраза пользователя целиком")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Записать план в фонды (только после явного одобрения)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Проверить, похоже ли сообщение на финансы (exit 0/1)",
    )
    args = parser.parse_args()

    if args.check:
        msg = args.message or ""
        if looks_like_finance(msg):
            print("MATCH")
            return 0
        print("SKIP")
        return 2

    secret = load_secret()
    if len(secret) < 16:
        print("ERROR: TT_INTEGRATION_SECRET не настроен (/etc/team-tracker.env)")
        return 1

    try:
        if args.context:
            return cmd_context(secret)
        if args.available is None and not args.message:
            print("ERROR: укажи --available или --message")
            return 1
        return cmd_allocate(secret, args.available, args.message, args.apply)
    except requests.RequestException as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
