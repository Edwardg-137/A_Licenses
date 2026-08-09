# Fase 0 + Fase 1 — Setup del Proyecto, Modelo de Datos y Autenticación

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completado y verificado

## Objetivo

Establecer la base técnica del MVP de PermisoGT (ver `mvp_docs/06-plan-mvp.md`):

- **Fase 0:** estructura del monorepo, modelo de datos completo del MVP (Prisma + PostgreSQL), configuración de ambientes y documentación oficial (`Docs/`).
- **Fase 1:** autenticación y gestión de usuarios: registro de solicitante (con aprobación manual del Admin), login con JWT + Refresh Token, guards por rol y endpoints de administración de usuarios internos.

## Problema identificado

No existe código; solo documentación de propuesta (`mvp_docs/`) y contexto de dominio (`context_tramits/`). Se necesita la base sobre la cual construir las fases 2–6 del MVP.

## Solución propuesta

### Estructura del monorepo

```
c:\building_permits\
├── Docs/                  → Documentación oficial (este protocolo)
├── context_tramits/       → Contexto de dominio (solo lectura)
├── mvp_docs/              → Propuesta del MVP (solo lectura)
├── backend/               → API NestJS + Prisma + PostgreSQL
└── frontend/              → Next.js (App Router) + Tailwind
```

### Modelo de datos (Prisma)

Se modela el MVP completo desde el inicio (aunque las fases 2+ aún no tengan endpoints), para que las migraciones futuras sean incrementales:

- `Tenant` — municipalidad (multi-tenant por columna `tenantId`, ver decisión D-002).
- `User` — con rol (`SOLICITANTE`, `REVISOR`, `INSPECTOR`, `ADMIN`, `SUPERADMIN`) y estado (`PENDING_APPROVAL`, `ACTIVE`, `DISABLED`). El registro de solicitantes crea la cuenta en `PENDING_APPROVAL`.
- `RefreshToken` — tokens de refresco hasheados (SHA-256), revocables.
- `LicenseType` + `DocumentRequirement` — tipos de licencia configurables (L-01 con requisitos D-01…D-15 sembrados por seed).
- `Application` — expediente con máquina de estados (`BORRADOR` → … → `LICENCIA_EMITIDA`), ronda de corrección y datos del proyecto en JSONB.
- `ApplicationDocument`, `Observation`, `Inspection`, `Payment` (con bandera `simulated`), `License`, `Notification`, `AuditLog`.

### Autenticación (Fase 1)

- **Registro** (`POST /auth/register`): solo rol Solicitante; requiere colegiado (CIG/CAG). La cuenta queda `PENDING_APPROVAL` hasta aprobación del Admin.
- **Login** (`POST /auth/login`): email + contraseña (bcryptjs). Devuelve access token JWT (15 min) + refresh token (7 días) persistido hasheado.
- **Refresh** (`POST /auth/refresh`) y **Logout** (`POST /auth/logout`, revoca el refresh token).
- **Guards:** `JwtAuthGuard` global + `RolesGuard` con decorador `@Roles(...)`. Los usuarios `PENDING_APPROVAL`/`DISABLED` no pueden autenticarse.
- **Gestión de usuarios** (`/users`, solo ADMIN): listar por tenant, crear usuarios internos (revisor/inspector), aprobar solicitantes, activar/desactivar.

### Frontend (Fase 1)

Páginas mínimas: login, registro de solicitante, y panel de Admin para gestión de usuarios (aprobar/crear/desactivar). Cliente API con manejo de tokens en memoria + refresh automático.

## Componentes afectados

Todo es nuevo: `backend/`, `frontend/`, `Docs/`.

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| PostgreSQL local no verificado (sin Docker) | `.env.example` documenta la conexión; migración se ejecuta cuando el entorno esté disponible |
| Redis no disponible en Windows sin Docker | Se pospone BullMQ; en desarrollo los emails se registran en consola (decisión D-003) |
| bcrypt nativo falla al compilar en Windows | Se usa `bcryptjs` (JS puro) |

## Estado de verificación

✅ **Verificado el 2026-08-08.** Entorno: PostgreSQL 16.14 instalado localmente vía winget (servicio `postgresql-x64-16`), Node v24.14.1. Migración inicial y seed aplicados sin errores. Backend y frontend compilan sin errores.

Pruebas funcionales ejecutadas contra la API (todas exitosas):

1. Login del Admin del seed → rol ADMIN.
2. Registro de solicitante → estado `PENDING_APPROVAL`.
3. Login del solicitante sin aprobar → rechazado con HTTP 403.
4. Admin lista pendientes y aprueba la cuenta.
5. Login del solicitante aprobado → rol SOLICITANTE.
6. `GET /auth/me` con token del solicitante.
7. Solicitante intenta `GET /users` → rechazado con HTTP 403 (guard de roles).
8. Refresh token → nuevo access token emitido.
9. Reuso del refresh token ya rotado → rechazado con HTTP 401.
10. Creación de usuario interno Revisor por el Admin → estado ACTIVE.

**Corrección durante la verificación:** `prisma/seed.ts` estaba en el `include` del `tsconfig.json`, lo que desplazaba la salida del build a `dist/src/`; se removió del `include` (el seed lo compila `ts-node` directamente).

## Plan de implementación

1. ✅ Documentación (`Docs/`) y este documento.
2. ✅ Estructura del backend: NestJS, Prisma schema, módulos `auth` y `users`, seed.
3. ✅ Estructura del frontend: Next.js, páginas de login/registro/admin.
4. ✅ Instalación de dependencias, PostgreSQL 16 local y migración inicial.
5. ✅ Verificación funcional del flujo: registro → aprobación → login → CRUD usuarios.
6. ✅ `Docs/status/` y este documento actualizados con el resultado.
