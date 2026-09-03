#!/usr/bin/env bash
# Применить SQL-миграцию к Supabase Postgres.
# Требует SUPABASE_DATABASE_URL в окружении (Settings → Database → Connection string → URI).
set -euo pipefail
FILE="${1:?Usage: apply-supabase-sql.sh path/to/migration.sql}"
if [[ -z "${SUPABASE_DATABASE_URL:-}" ]]; then
  echo "ERROR: задайте SUPABASE_DATABASE_URL (postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres)"
  exit 1
fi
psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$FILE"
echo "OK: $FILE"
