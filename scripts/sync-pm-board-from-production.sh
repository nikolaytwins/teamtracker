#!/usr/bin/env bash
# Канбан на сервере лежит отдельно — подтянуть pm-board.db в data/pm-board.db
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-root@178.72.168.156}"
REMOTE="${REMOTE_PM_BOARD_DB:-/root/.openclaw/workspace/agency-pm-board/data/pm-board.db}"
DEST="$ROOT/data/pm-board.db"
mkdir -p "$ROOT/data"
TMP="$DEST.tmp.$$"
scp "$HOST:$REMOTE" "$TMP"
if [[ -f "$DEST" ]]; then
  cp "$DEST" "$DEST.bak.$(date +%Y%m%d-%H%M%S)"
fi
mv "$TMP" "$DEST"
echo "OK: $DEST ← $HOST:$REMOTE"
