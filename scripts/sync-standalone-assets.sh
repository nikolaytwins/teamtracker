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
echo "OK: synced .next/static и public → .next/standalone"
