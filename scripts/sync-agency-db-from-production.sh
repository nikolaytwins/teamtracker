#!/usr/bin/env bash
# Скачивает dev.db с сервера Twinworks в data/agency.db (нужен ssh-доступ).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-root@178.72.168.156}"
REMOTE="${REMOTE_TW_DEV_DB:-/root/.openclaw/workspace/twinworks/prisma/dev.db}"
DEST="$ROOT/data/agency.db"
mkdir -p "$ROOT/data"
TMP="$DEST.tmp.$$"
scp "$HOST:$REMOTE" "$TMP"
if [[ -f "$DEST" ]]; then
  cp "$DEST" "$DEST.bak.$(date +%Y%m%d-%H%M%S)"
fi
mv "$TMP" "$DEST"
echo "OK: $DEST ← $HOST:$REMOTE"
