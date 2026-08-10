#!/bin/sh
set -e

echo "[permisogt-backend] Esperando a PostgreSQL y aplicando migraciones..."

attempt=1
max_attempts=30

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[permisogt-backend] No se pudo conectar a la base tras $max_attempts intentos."
    exit 1
  fi
  echo "[permisogt-backend] BD no lista (intento $attempt/$max_attempts). Reintento en 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[permisogt-backend] Ejecutando seed..."
  npx prisma db seed
else
  echo "[permisogt-backend] Seed omitido (RUN_SEED=${RUN_SEED})."
fi

echo "[permisogt-backend] Arrancando API..."
exec "$@"
