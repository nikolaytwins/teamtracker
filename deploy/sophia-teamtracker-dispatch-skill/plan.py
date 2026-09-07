#!/usr/bin/env python3
"""
Чтение и запись календаря плана Team Tracker (tt.twinlabs.ru) для Софии.

Использовать только по явной команде пользователя
(«добавь в план», «перенеси», «поставь стратегию» и т.п.).
Перед записью желательно прочитать календарь / dispatch-контекст.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import requests

DEFAULT_BASE = "https://tt.twinlabs.ru/api/integrations/sophia/plan"
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


def base_url() -> str:
    return (os.environ.get("TT_PLAN_URL") or DEFAULT_BASE).strip().rstrip("/")


def headers(secret: str) -> dict[str, str]:
    return {"x-tt-integration-secret": secret, "Content-Type": "application/json"}


def request_json(method: str, path: str, secret: str, **kwargs) -> dict:
    url = f"{base_url()}{path}"
    resp = requests.request(method, url, headers=headers(secret), timeout=45, **kwargs)
    if resp.status_code >= 400:
        raise RuntimeError(f"API {resp.status_code} — {resp.text[:400]}")
    if not resp.content:
        return {"ok": True}
    return resp.json()


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def fmt_item(it: dict) -> str:
    mins = it.get("planned_minutes")
    hrs = f"{mins / 60:g} ч" if isinstance(mins, (int, float)) and mins else "—"
    return (
        f"  • {it.get('id')} | {it.get('plan_date') or 'backlog'} | "
        f"{it.get('kind')} | {it.get('title')} | {hrs}"
    )


def cmd_calendar(args: argparse.Namespace, secret: str) -> int:
    data = request_json(
        "GET",
        "",
        secret,
        params={"from": args.from_date, "to": args.to_date, "calendar": "1"},
    )
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0

    items = data.get("items") or []
    modes = data.get("dayModes") or []
    backlog = data.get("backlog") or []
    print(f"PLAN CALENDAR — {args.from_date} … {args.to_date}")
    print("")
    if modes:
        print("Режимы дней:")
        for m in modes:
            print(f"  • {m.get('plan_date')}: {m.get('mode')}")
        print("")
    print(f"Блоки ({len(items)}):")
    if not items:
        print("  (пусто)")
    else:
        for it in items:
            print(fmt_item(it))
    if backlog:
        print("")
        print(f"Бэклог ({len(backlog)}):")
        for it in backlog[:20]:
            print(fmt_item(it))
    return 0


def cmd_create(args: argparse.Namespace, secret: str) -> int:
    minutes = args.minutes
    if minutes is None and args.hours is not None:
        minutes = int(round(float(args.hours) * 60))
    body = {
        "kind": args.kind,
        "title": args.title,
        "plan_date": args.date,
        "planned_minutes": minutes,
        "project_id": args.project_id,
        "event_time": args.time,
        "duration_label": args.duration_label,
    }
    body = {k: v for k, v in body.items() if v is not None}
    data = request_json("POST", "/items", secret, json=body)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    it = data.get("item") or {}
    print("CREATED")
    print(fmt_item(it))
    return 0


def cmd_update(args: argparse.Namespace, secret: str) -> int:
    body: dict = {}
    if args.title is not None:
        body["title"] = args.title
    if args.kind is not None:
        body["kind"] = args.kind
    if args.date is not None:
        body["plan_date"] = args.date
    if args.project_id is not None:
        body["project_id"] = args.project_id or None
    if args.time is not None:
        body["event_time"] = args.time or None
    if args.duration_label is not None:
        body["duration_label"] = args.duration_label or None
    if args.minutes is not None:
        body["planned_minutes"] = args.minutes
    elif args.hours is not None:
        body["planned_minutes"] = int(round(float(args.hours) * 60))
    if not body:
        print("ERROR: нечего обновлять — укажи поля")
        return 1
    data = request_json("PATCH", f"/items/{args.id}", secret, json=body)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    it = data.get("item") or {}
    print("UPDATED")
    print(fmt_item(it))
    return 0


def cmd_delete(args: argparse.Namespace, secret: str) -> int:
    data = request_json("DELETE", f"/items/{args.id}", secret)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    print(f"DELETED {args.id}")
    return 0


def cmd_day_mode(args: argparse.Namespace, secret: str) -> int:
    data = request_json(
        "PATCH",
        "/day-mode",
        secret,
        json={"plan_date": args.date, "mode": args.mode},
    )
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    print(f"DAY MODE {args.date} → {args.mode}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    today = date.today()
    week_from = monday_of(today).isoformat()
    week_to = (monday_of(today) + timedelta(days=13)).isoformat()

    p = argparse.ArgumentParser(description="Team Tracker plan calendar for Sofia")
    p.add_argument("--json", action="store_true", help="Сырой JSON")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("calendar", help="Прочитать блоки и режимы дней")
    c.add_argument("--from", dest="from_date", default=week_from)
    c.add_argument("--to", dest="to_date", default=week_to)
    c.set_defaults(func=cmd_calendar)

    c = sub.add_parser("create", help="Создать блок в плане")
    c.add_argument("--title", required=True)
    c.add_argument("--date", required=True, help="YYYY-MM-DD")
    c.add_argument("--kind", default="task", choices=["task", "call", "personal"])
    c.add_argument("--hours", type=float, default=None)
    c.add_argument("--minutes", type=int, default=None)
    c.add_argument("--project-id", default=None)
    c.add_argument("--time", default=None, help="HH:MM")
    c.add_argument("--duration-label", default=None)
    c.set_defaults(func=cmd_create)

    c = sub.add_parser("update", help="Изменить / перенести блок")
    c.add_argument("--id", required=True)
    c.add_argument("--title", default=None)
    c.add_argument("--date", default=None)
    c.add_argument("--kind", default=None, choices=["task", "call", "personal"])
    c.add_argument("--hours", type=float, default=None)
    c.add_argument("--minutes", type=int, default=None)
    c.add_argument("--project-id", default=None)
    c.add_argument("--time", default=None)
    c.add_argument("--duration-label", default=None)
    c.set_defaults(func=cmd_update)

    c = sub.add_parser("delete", help="Удалить блок")
    c.add_argument("--id", required=True)
    c.set_defaults(func=cmd_delete)

    c = sub.add_parser("day-mode", help="Режим дня: strategy|creative|rest|normal")
    c.add_argument("--date", required=True)
    c.add_argument("--mode", required=True, choices=["strategy", "creative", "rest", "normal"])
    c.set_defaults(func=cmd_day_mode)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    secret = load_secret()
    if len(secret) < 16:
        print("ERROR: TT_INTEGRATION_SECRET не настроен (/etc/team-tracker.env)")
        return 1
    try:
        return args.func(args, secret)
    except requests.RequestException as exc:
        print(f"ERROR: сеть — {exc}")
        return 1
    except RuntimeError as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
