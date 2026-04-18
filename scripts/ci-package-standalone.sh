#!/usr/bin/env bash
# Упаковывает результат `next build` с output: "standalone" в один архив для выкладки на VPS (без сборки на сервере).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ST="$ROOT/.next/standalone"
if [[ ! -f "$ST/server.js" ]]; then
  echo "Ожидается .next/standalone/server.js после сборки (next.config: output standalone)." >&2
  exit 1
fi
mkdir -p "$ST/.next/static"
cp -a "$ROOT/.next/static/." "$ST/.next/static/"
mkdir -p "$ST/public"
cp -a "$ROOT/public/." "$ST/public/"
cd "$ST"
OUT="$ROOT/deploy-standalone.tgz"
tar -czf "$OUT" .
echo "OK: $OUT ($(du -h "$OUT" | cut -f1))"
