#!/usr/bin/env bash
# Установка skill teamtracker-dispatch на VPS OpenClaw.
set -euo pipefail

SKILL_NAME=teamtracker-dispatch
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="/root/.openclaw/workspace/skills/${SKILL_NAME}"

mkdir -p "$DEST"
install -m 644 "$SRC_DIR/SKILL.md" "$DEST/SKILL.md"
install -m 755 "$SRC_DIR/dispatch.py" "$DEST/dispatch.py"

echo "Installed to $DEST"
python3 "$DEST/dispatch.py" --year "$(date +%Y)" --month "$(date +%-m)" | head -20
