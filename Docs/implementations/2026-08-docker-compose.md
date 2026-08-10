# Docker Compose — Entorno reproducible del stack

> **Fecha:** Agosto 2026  
> **Estado:** ✅ Completada y verificada  
> **Motivación:** Docker Desktop ya está disponible en el equipo de desarrollo; se necesita una forma reproducible de levantar PostgreSQL + API + portal y versionarla en GitHub.

## Objetivo

Incorporar Docker al monorepo para que cualquier persona (o CI) pueda arrancar PermisoGT con un solo comando, sin depender de una instalación local de PostgreSQL, y publicar esa configuración en el repositorio.

## Problema identificado

Hasta ahora el entorno asumía PostgreSQL 16 instalado en Windows (servicio `postgresql-x64-16`) y procesos Node nativos. Eso dificulta el onboarding y no aprovecha Docker Desktop ya instalado. La decisión D-003 pospuso Redis precisamente por la ausencia de Docker; esta entrega **no** implementa aún Redis/BullMQ (sigue sin correo real), solo containeriza lo que el MVP ya usa.

## Solución propuesta

1. **`docker-compose.yml`** en la raíz con tres servicios: `db` (PostgreSQL 16), `backend` (NestJS), `frontend` (Next.js).
2. **Dockerfiles** multi-etapa / productivos para backend y frontend.
3. **Entrypoint del backend:** espera a la BD, ejecuta `prisma migrate deploy` y, si `RUN_SEED=true`, el seed; luego arranca la API.
4. **Puerto host de Postgres `5433`** (contenedor sigue en `5432`) para coexistir con un PostgreSQL local en `5432`.
5. **`.env.example`** en la raíz con variables del compose.
6. Next.js con `output: 'standalone'` para una imagen frontend ligera.
7. El modo híbrido sigue válido: solo `docker compose up db -d` y correr Nest/Next en el host apuntando a `localhost:5433`.

## Arquitectura

```
[Navegador :3000] → frontend (Next.js)
                 → backend :3001 /api (NestJS)
                      → db :5432 interno (Postgres 16)
                      → volumen uploads
```

`NEXT_PUBLIC_API_URL` se fija en **build** del frontend a `http://localhost:3001/api` (el navegador habla con los puertos publicados en el host, no con los nombres DNS internos de Compose).

## Componentes afectados

| Archivo | Cambio |
| :--- | :--- |
| `docker-compose.yml` | Nuevo |
| `.env.example` (raíz) | Nuevo |
| `backend/Dockerfile`, `backend/docker-entrypoint.sh`, `backend/.dockerignore` | Nuevos |
| `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/public/` | Nuevos |
| `frontend/next.config.mjs` | `output: 'standalone'` |
| `Docs/status/*`, `changelog.md`, `README.md` | Actualización |
| `Docs/status/decisions.md` | D-013 |

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| Conflicto de puerto 5432 con Postgres local | Mapear host `5433→5432` |
| Seed requiere `ts-node` | Imagen backend instala deps de desarrollo necesarias para migrate/seed en el entrypoint; el proceso runtime es `node dist/main.js` |
| `NEXT_PUBLIC_*` en build time | Build-arg documentado en compose y README |
| Volúmenes persistentes con datos viejos | Documentar `docker compose down -v` para reset |

## Plan de implementación

1. Este documento.
2. Archivos Docker + ajuste Next standalone.
3. Probar `docker compose up --build`.
4. Actualizar Docs/README; registrar D-013.
5. Commit y push a GitHub.

## Compatibilidad

- No cambia el esquema Prisma ni la API.
- El flujo nativo (`npm run start:dev` + Postgres local en 5432) sigue documentado.
- Redis/BullMQ siguen pospuestos (D-003); Docker solo desbloquea esa vía a futuro.

## Estado de verificación

✅ Verificado el 2026-08-09/10 con Docker Desktop 29.6.2 + Compose v5.3.1:

1. `docker compose up --build` — imágenes backend/frontend construidas; Postgres healthy.
2. Entrypoint: `prisma migrate deploy` + seed (8 usuarios) + Nest escuchando en `:3001`.
3. Login API: `POST /api/auth/login` con `admin@permisogt.local` → JWT OK.
4. Frontend standalone respondiendo HTTP 200 (en la prueba local el puerto host 3000 estaba ocupado por un Next nativo; el contenedor se mapeó a 3002 sin cambiar el default del compose).

Ajustes durante la verificación:

- `npm ci --include=dev` en la imagen runtime del backend (Prisma CLI + ts-node para migrate/seed).
- Seed con `ts-node --project prisma/tsconfig.json --transpile-only` (evita error de `moduleResolution`/`NodeNext` en Node 20).
- Puerto host de Postgres `5433` para coexistir con PostgreSQL local en `5432`.
