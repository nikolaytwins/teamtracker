#!/usr/bin/env python3
"""
Запись в дневник Team Tracker (tt.twinlabs.ru) из Telegram/VK Софии.

Триггеры:
  - строка с #тегами внизу;
  - префикс «дневник:» (+ опционально --tag-hints);
  - --body + --tag-hints / --tags.

API сопоставляет подсказки с существующими тегами (в т.ч. с эмодzi).
"""
from __future__ import annotations

import argparse
import json
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


def api_url() -> str:
    return os.environ.get("TT_DIARY_URL", DEFAULT_URL).strip() or DEFAULT_URL


def api_headers(secret: str) -> dict[str, str]:
    return {
        "x-tt-integration-secret": secret,
        "Content-Type": "application/json",
    }


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


def split_diary_prefix(msg: str) -> tuple[str, str]:
    if msg.lower().startswith("дневник:"):
        return msg.split(":", 1)[1].strip(), msg
    return msg.strip(), msg


def fetch_tags(secret: str) -> list[dict]:
    resp = requests.get(
        f"{api_url()}?tags=1",
        headers=api_headers(secret),
        timeout=30,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"API {resp.status_code} — {resp.text[:200]}")
    data = resp.json()
    return data.get("tags") or []


def print_tags(secret: str) -> int:
    try:
        tags = fetch_tags(secret)
    except (requests.RequestException, RuntimeError) as exc:
        print(f"ERROR: {exc}")
        return 1
    if not tags:
        print("TAGS: (пусто)")
        return 0
    for t in tags:
        name = t.get("name", "")
        count = t.get("count", 0)
        print(f"{name}\t({count})")
    return 0


def post_entry(
    secret: str,
    *,
    message: str = "",
    body: str = "",
    tag_hints: list[str] | None = None,
    tags: list[str] | None = None,
    allow_new_tags: bool = False,
) -> int:
    payload: dict = {"preferExistingTags": True, "allowNewTags": allow_new_tags}
    if message:
        payload["message"] = message
    if body:
        payload["body"] = body
    if tag_hints:
        payload["tagHints"] = tag_hints
    if tags:
        payload["tags"] = tags

    try:
        resp = requests.post(
            api_url(),
            json=payload,
            headers=api_headers(secret),
            timeout=30,
        )
    except requests.RequestException as exc:
        print(f"ERROR: сеть — {exc}")
        return 1

    if resp.status_code >= 400:
        try:
            data = resp.json()
        except json.JSONDecodeError:
            data = {}
        detail = data.get("error") or resp.text[:240]
        if data.get("ambiguous"):
            parts = []
            for item in data["ambiguous"]:
                hint = item.get("hint", "?")
                cands = " | ".join(item.get("candidates") or [])
                parts.append(f"{hint} → {cands}")
            print(f"ERROR: неоднозначный тег — {'; '.join(parts)}")
            return 1
        if data.get("unmatched"):
            print(f"ERROR: не нашла тег — {', '.join(data['unmatched'])}")
            if data.get("tags"):
                sample = ", ".join(t.get("name", "") for t in data["tags"][:12])
                print(f"HINT: существующие теги: {sample}")
            return 1
        print(f"ERROR: API {resp.status_code} — {detail}")
        return 1

    data = resp.json()
    obs_tags = data.get("observation", {}).get("tags") or []
    tag_str = " ".join(f"#{t}" for t in obs_tags)
    if tag_str:
        print(f"OK: записала в дневник Team Tracker. {tag_str}")
    else:
        print("OK: записала в дневник Team Tracker.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--message", help="Полное сообщение пользователя")
    parser.add_argument("--body", help="Текст записи (без тегов)")
    parser.add_argument(
        "--tag-hints",
        help="Подсказки для сопоставления с существующими тегами (через запятую)",
    )
    parser.add_argument(
        "--tags",
        help="Явные теги или подсказки (через запятую); сопоставляются с каталогом",
    )
    parser.add_argument(
        "--list-tags",
        action="store_true",
        help="Вывести существующие теги дневника",
    )
    parser.add_argument(
        "--allow-new-tags",
        action="store_true",
        help="Разрешить создать новый тег, если нет совпадения",
    )
    args = parser.parse_args()

    secret = load_secret()
    if len(secret) < 16:
        print("ERROR: TT_INTEGRATION_SECRET не настроен")
        return 1

    if args.list_tags:
        return print_tags(secret)

    hints = []
    if args.tag_hints:
        hints.extend(h.strip() for h in args.tag_hints.split(",") if h.strip())
    if args.tags:
        hints.extend(t.strip() for t in args.tags.split(",") if t.strip())

    if args.body:
        return post_entry(
            secret,
            body=args.body,
            tag_hints=hints or None,
            allow_new_tags=args.allow_new_tags,
        )

    msg = (args.message or "").strip()
    if not msg:
        print("SKIP: пустое сообщение")
        return 0

    is_diary_prefix = msg.lower().startswith("дневник:")
    has_footer = has_tag_footer(msg)

    if not has_footer and not is_diary_prefix and not hints:
        print("SKIP: нет строки с тегами внизу")
        return 0

    if is_diary_prefix and not has_footer:
        body_text, _ = split_diary_prefix(msg)
        if not body_text and not hints:
            print("SKIP: пустой текст дневника")
            return 0
        return post_entry(
            secret,
            body=body_text or msg,
            tag_hints=hints or None,
            allow_new_tags=args.allow_new_tags,
        )

    return post_entry(
        secret,
        message=msg,
        tag_hints=hints or None,
        allow_new_tags=args.allow_new_tags,
    )


if __name__ == "__main__":
    sys.exit(main())
