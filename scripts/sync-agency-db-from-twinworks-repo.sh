#!/usr/bin/env bash
# Копирует SQLite агентства из локального клона Twinworks → team-tracker/data/agency.db
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${TWINWORKS_DEV_DB:-$HOME/Desktop/cursor/twinworks/prisma/dev.db}"
DEST="$ROOT/data/agency.db"
if [[ ! -f "$SRC" ]]; then
  echo "Нет файла: $SRC"
  echo "Задайте TWINWORKS_DEV_DB=/путь/к/dev.db"
  exit 1
fi
mkdir -p "$ROOT/data"
if [[ -f "$DEST" ]]; then
  cp "$DEST" "$DEST.bak.$(date +%Y%m%d-%H%M%S)"
fi
cp "$SRC" "$DEST"
echo "OK: $DEST ← $SRC"
