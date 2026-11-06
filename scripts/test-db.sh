#!/usr/bin/env bash
# Runs the database permission tests.
#
#   scripts/test-db.sh --fresh <postgres-url-to-an-EMPTY-plain-postgres-server-db>
#       Plain PostgreSQL (no Supabase): loads a stand-in for Supabase's auth schema,
#       applies every migration in order, loads the dev seed, then runs the tests.
#
#   scripts/test-db.sh <postgres-url-of-a-supabase-DEV-database>
#       A local `supabase start` stack or the Supabase dev project, with migrations
#       and seed already applied. Runs the tests only; they roll back and change nothing.
#
# Never point this at production: the tests rely on the dev seed users.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--fresh" ]]; then
  url="${2:?postgres url required}"
  psql "$url" -v ON_ERROR_STOP=1 -q -f db-tests/local-supabase-shim.sql
  for f in supabase/migrations/*.sql; do
    echo "applying $f"
    psql "$url" -v ON_ERROR_STOP=1 -q -f "$f"
  done
  psql "$url" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
else
  url="${1:?postgres url required}"
fi

psql "$url" -v ON_ERROR_STOP=1 -q -o /dev/null -f db-tests/access_rules.test.sql 2>&1 | sed 's/^psql:[^:]*:[0-9]*: NOTICE:  //'
