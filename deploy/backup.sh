#!/usr/bin/env bash
# Daily Postgres backup for MARGI: compressed dump, keeps the last 7 days.
# Cron example (as the deploy user):  0 3 * * * /opt/margi/app/deploy/backup.sh >> /opt/margi/backups/backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/margi/app}"
BACKUP_DIR="${BACKUP_DIR:-/opt/margi/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/margi-$STAMP.sql.gz"

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T margi-postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip -9 > "$TARGET"

# A dump that is suspiciously small means the export failed; do not keep it.
if [ "$(stat -c%s "$TARGET")" -lt 2048 ]; then
  rm -f "$TARGET"
  echo "backup too small, removed" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'margi-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "ok $TARGET"
