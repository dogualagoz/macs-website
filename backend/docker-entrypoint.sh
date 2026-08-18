#!/bin/sh
# Container basladiginda: DB'yi bekle -> alembic upgrade head -> uygulamayi calistir.
# Veri kaybi olmaz: alembic yalnizca eksik migration'lari uygular, tablolari silmez.
set -e

if [ -z "$DATABASE_URL" ]; then
    echo "HATA: DATABASE_URL tanimli degil" >&2
    exit 1
fi

echo "[entrypoint] Veritabani bekleniyor..."
attempt=0
until python -c "import os, psycopg2; psycopg2.connect(os.environ['DATABASE_URL']).close()" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        echo "[entrypoint] HATA: veritabanina 60 denemede baglanilamadi" >&2
        exit 1
    fi
    sleep 2
done
echo "[entrypoint] Veritabani hazir."

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    echo "[entrypoint] alembic upgrade head"
    alembic upgrade head
else
    echo "[entrypoint] RUN_MIGRATIONS=0, migration atlandi"
fi

exec "$@"
