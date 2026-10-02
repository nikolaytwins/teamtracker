#!/usr/bin/env bash
# Установка skill teamtracker-finance на VPS OpenClaw.
set -euo pipefail

SKILL_NAME=teamtracker-finance
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="/root/.openclaw/workspace/skills/${SKILL_NAME}"

mkdir -p "$DEST"
install -m 644 "$SRC_DIR/SKILL.md" "$DEST/SKILL.md"
install -m 755 "$SRC_DIR/finance.py" "$DEST/finance.py"

echo "Installed to $DEST"
python3 "$DEST/finance.py" --context | head -30
