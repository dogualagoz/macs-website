#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
    echo "HATA: DATABASE_URL tanimli degil" >&2
    exit 1
fi

bun src/db/migrate.ts
exec "$@"
