#!/bin/sh
set -eu

mkdir -p /app/prisma /app/storage/documents /app/storage/import /app/backups

if [ ! -f /app/prisma/dev.db ]; then
  echo "Initializing DOMUS database..."
  sqlite3 /app/prisma/dev.db < /app/prisma/bootstrap.sql
  (
    cd /app
    npx tsx prisma/seed.ts
  )
fi

exec "$@"
