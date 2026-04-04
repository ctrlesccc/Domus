#!/bin/sh
set -eu

DB_PATH="/app/prisma/dev.db"

mkdir -p /app/prisma /app/storage/documents /app/storage/import /app/backups

needs_init="false"

if [ ! -s "$DB_PATH" ]; then
  needs_init="true"
elif ! sqlite3 "$DB_PATH" "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
  needs_init="true"
fi

if [ "$needs_init" = "true" ]; then
  echo "Initializing DOMUS database..."
  sqlite3 "$DB_PATH" < /opt/domus/bootstrap.sql
  (
    cd /app
    npx tsx prisma-seed/seed.ts
  )
fi

if ! sqlite3 "$DB_PATH" "SELECT role FROM users LIMIT 1;" >/dev/null 2>&1; then
  echo "Applying DOMUS user/audit migration..."
  sqlite3 "$DB_PATH" < /opt/domus/migrate_v6.sql
fi

if ! sqlite3 "$DB_PATH" "SELECT plannedChargeDay FROM obligations LIMIT 1;" >/dev/null 2>&1; then
  echo "Applying DOMUS obligations/dossiers migration..."
  sqlite3 "$DB_PATH" < /opt/domus/migrate_v7.sql
fi

exec "$@"
