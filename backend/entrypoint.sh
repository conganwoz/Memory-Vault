#!/usr/bin/env bash
#
# Kindred backend container entrypoint.
#
#   1. Runs pending DB migrations (idempotent).
#   2. Optionally runs seeds when SEED_ON_START=true.
#   3. Starts the Phoenix release.
#
set -euo pipefail

echo "==> Running database migrations..."
/app/bin/kindred_backend eval "Kindred.Release.migrate()"

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "==> Seeding demo data..."
  /app/bin/kindred_backend eval "Kindred.Release.seeds()"
fi

echo "==> Starting Kindred backend on :${PORT:-4000}"
exec /app/bin/kindred_backend start
