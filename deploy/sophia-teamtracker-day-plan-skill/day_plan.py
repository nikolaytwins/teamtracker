#!/usr/bin/env python3
"""
Планирование недели Team Tracker для Telegram/VK Софии.

Примеры:
  python3 day_plan.py --context
  python3 day_plan.py --message "распланируй неделю, свидание в субботу"
  python3 day_plan.py --message "распланируй неделю" --apply
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import requests

DEFAULT_URL = "https://tt.twinlabs.ru/api/integrations/sophia/day-plan"
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
    return os.environ.get("TT_DAY_PLAN_URL", DEFAULT_URL).strip() or DEFAULT_URL


def api_headers(secret: str) -> dict[str, str]:
    return {
        "x-tt-integration-secret": secret,
        "Content-Type": "application/json",
    }


def print_plan(plan: dict) -> None:
    print(f"WEEK: {plan.get('week_start')} … {plan.get('week_end')}")
    print(f"SUMMARY: {plan.get('summary') or ''}")
    print("CHECKLIST:")
    for row in plan.get("checklist") or []:
        mark = "OK" if row.get("ok") else "GAP"
        print(f"  [{mark}] {row.get('label')}: {row.get('plan_date') or '—'} {row.get('note') or ''}")
    print("ENTRIES:")
    for e in plan.get("entries") or []:
        print(f"  - {json.dumps(e, ensure_ascii=False)}")


def cmd_context(secret: str, message: str | None) -> int:
    params = {}
    if message:
        params["message"] = message
    resp = requests.get(api_url(), headers=api_headers(secret), params=params, timeout=30)
    if resp.status_code >= 400:
        print(f"ERROR: API {resp.status_code} — {resp.text[:300]}")
        return 1
    data = resp.json()
    ctx = data.get("context") or {}
    print(f"OK: week {ctx.get('week_start')} … {ctx.get('week_end')}")
    print(ctx.get("free_hint") or "")
    for row in ctx.get("checklist") or []:
        mark = "OK" if row.get("ok") else "GAP"
        print(f"  [{mark}] {row.get('label')}: {row.get('plan_date') or '—'}")
    print("RULES:")
    for r in data.get("rules") or []:
        print(f"  - {r}")
    return 0


def cmd_plan(secret: str, message: str, apply: bool) -> int:
    body = {"message": message, "apply": apply}
    resp = requests.post(api_url(), headers=api_headers(secret), json=body, timeout=45)
    if resp.status_code >= 400:
        try:
            err = resp.json()
            print(f"ERROR: {err.get('error') or resp.text[:300]}")
        except Exception:
            print(f"ERROR: API {resp.status_code} — {resp.text[:300]}")
        return 1
    data = resp.json()
    plan = data.get("day_plan") or {}
    print_plan(plan)
    if data.get("applied"):
        print("APPLIED MODES:")
        for m in data.get("day_modes") or []:
            print(f"  {m.get('plan_date')}: {m.get('mode')}")
        print("APPLIED ITEMS:")
        for it in data.get("created_items") or []:
            print(f"  {it.get('plan_date')} · {it.get('title')}")
        for s in data.get("skipped") or []:
            print(f"  SKIP: {s}")
        print("OK: записано в план")
    else:
        print("OK: план готов (без записи). Для записи добавь --apply после одобрения.")
    return 0


def looks_like_day_plan(message: str) -> bool:
    m = message.lower()
    return bool(
        re.search(
            r"распланир|раскид|недел|стратег|творч|свидан|выходн|нетворк|мероприят|"
            r"план\s+дня|планирован\w*\s+недел|рабоч\w*\s+дн",
            m,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Team Tracker day-plan skill")
    parser.add_argument("--context", action="store_true")
    parser.add_argument("--message", type=str, help="Фраза пользователя")
    parser.add_argument("--apply", action="store_true", help="Записать в календарь после одобрения")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if args.check:
        msg = args.message or ""
        if looks_like_day_plan(msg):
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
            return cmd_context(secret, args.message)
        if not args.message:
            print("ERROR: укажи --message")
            return 1
        return cmd_plan(secret, args.message, args.apply)
    except requests.RequestException as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
