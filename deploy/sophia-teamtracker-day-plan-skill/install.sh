#!/usr/bin/env bash
# Установка skill teamtracker-day-plan на VPS OpenClaw.
set -euo pipefail

SKILL_NAME=teamtracker-day-plan
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="/root/.openclaw/workspace/skills/${SKILL_NAME}"

mkdir -p "$DEST"
install -m 644 "$SRC_DIR/SKILL.md" "$DEST/SKILL.md"
install -m 755 "$SRC_DIR/day_plan.py" "$DEST/day_plan.py"

echo "Installed to $DEST"
python3 "$DEST/day_plan.py" --context | head -40
