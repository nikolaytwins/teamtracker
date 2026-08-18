#!/usr/bin/env python3
"""
Запись в дневник Team Tracker (tt.twinlabs.ru) из Telegram Софии.
Срабатывает, если внизу сообщения строка с #тегами или сообщение начинается с «дневник:».

Usage:
  python3 diary.py --message "сегодня хороший день\n#vibecoding #arkalium"
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import requests

HASHTAG_RE = re.compile(r"#([\w\u0400-\u04FF-]+)", re.UNICODE)
DEFAULT_URL = "https://tt.twinlabs.ru/api/integrations/sophia/diary"
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


def has_tag_footer(message: str) -> bool:
    lines = message.strip().split("\n")
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:
        return False
    line = lines[-1].strip()
    tags = HASHTAG_RE.findall(line)
    if not tags:
        return False
    remainder = HASHTAG_RE.sub("", line).strip()
    return not remainder


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--message", required=True, help="Текст сообщения пользователя")
    args = parser.parse_args()

    msg = args.message.strip()
    if not msg:
        print("SKIP: пустое сообщение")
        return 0

    is_diary_prefix = msg.lower().startswith("дневник:")
    if not has_tag_footer(msg) and not is_diary_prefix:
        print("SKIP: нет строки с тегами внизу")
        return 0

    body = msg.split(":", 1)[1].strip() if is_diary_prefix else msg

    secret = load_secret()
    if len(secret) < 16:
        print("ERROR: TT_INTEGRATION_SECRET не настроен")
        return 1

    url = os.environ.get("TT_DIARY_URL", DEFAULT_URL).strip() or DEFAULT_URL
    try:
        resp = requests.post(
            url,
            json={"message": body},
            headers={
                "x-tt-integration-secret": secret,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        print(f"ERROR: сеть — {exc}")
        return 1

    if resp.status_code >= 400:
        detail = resp.text[:240].replace("\n", " ")
        print(f"ERROR: API {resp.status_code} — {detail}")
        return 1

    data = resp.json()
    tags = data.get("observation", {}).get("tags") or []
    tag_str = " ".join(f"#{t}" for t in tags)
    if tag_str:
        print(f"OK: записала в дневник Team Tracker. {tag_str}")
    else:
        print("OK: записала в дневник Team Tracker.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
