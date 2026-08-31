#!/usr/bin/env bash
# После `next build` с output: "standalone" копирует static и public внутрь `.next/standalone` (без этого CSS/JS с _next/static не отдаются).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ST="$ROOT/.next/standalone"
if [[ ! -f "$ST/server.js" ]]; then
  echo "Нет $ST/server.js — сначала next build с output standalone в next.config." >&2
  exit 1
fi
mkdir -p "$ST/.next/static"
cp -a "$ROOT/.next/static/." "$ST/.next/static/"
mkdir -p "$ST/public"
if [[ -d "$ROOT/public" ]]; then
  cp -a "$ROOT/public/." "$ST/public/"
fi
# Статьи Стратегии (markdown) — runtime fs.read из content/
if [[ -d "$ROOT/content/strategy/articles" ]]; then
  mkdir -p "$ST/content/strategy"
  rm -rf "$ST/content/strategy/articles"
  cp -a "$ROOT/content/strategy/articles" "$ST/content/strategy/articles"
fi
if [[ -d "$ROOT/content/personal" ]]; then
  mkdir -p "$ST/content"
  rm -rf "$ST/content/personal"
  cp -a "$ROOT/content/personal" "$ST/content/personal"
fi
echo "OK: synced .next/static, public, content/strategy и content/personal → .next/standalone"
