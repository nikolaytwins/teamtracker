#!/usr/bin/env bash
# Запускать на VPS из корня репозитория (после git push с Mac).
# Пример: cd /opt/team-tracker && TEAM_TRACKER_ROOT_DOMAIN=1 ./deploy/update-production.sh
# Для префикса /pm-board: ./deploy/update-production.sh (без TEAM_TRACKER_ROOT_DOMAIN)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${DEPLOY_BRANCH:-main}"
SERVICE="${DEPLOY_SYSTEMD_SERVICE:-team-tracker}"

echo "==> $(date -u +%Y-%m-%dT%H:%M:%SZ) pull $BRANCH"
git fetch origin
git pull origin "$BRANCH"

echo "==> npm ci"
npm ci

echo "==> build (TEAM_TRACKER_ROOT_DOMAIN=${TEAM_TRACKER_ROOT_DOMAIN:-unset})"
npm run build

echo "==> restart $SERVICE"
if command -v systemctl >/dev/null 2>&1; then
  systemctl restart "$SERVICE"
  systemctl is-active --quiet "$SERVICE" || {
    echo "Service failed; last logs:" >&2
    journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
    exit 1
  }
else
  echo "systemctl not found; start the app manually (npm run start)" >&2
  exit 1
fi

echo "==> OK $(git rev-parse --short HEAD) $(git log -1 --oneline)"
