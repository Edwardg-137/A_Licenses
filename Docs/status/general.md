# PermisoGT — Estado General del Proyecto

> Última actualización: Agosto 2026

## Objetivo de la aplicación

Plataforma web de gestión de **expedientes digitales para licencias de construcción** en municipalidades de Guatemala. Digitaliza el trámite municipal (recepción del expediente, revisión técnica, observaciones/correcciones, inspección de alineación, pago y emisión de la licencia), que hoy es mayoritariamente presencial. Es complementaria (no competidora) del sistema VAC existente, que cubre los pre-trámites ante entes externos (MARN, CONRED, etc.).

La propuesta completa del producto está en `mvp_docs/` (visión, roles, flujo, requisitos, plan). El contexto legal del dominio está en `context_tramits/`.

## Alcance del MVP

Un solo tipo de licencia: **L-01 Obra Mayor — Vivienda Unifamiliar** (formulario F08, ≤ 700 m²) para la Municipalidad de Guatemala, con arquitectura multi-tenant preparada para más municipios.

## Estado actual de implementación

| Fase (plan `mvp_docs/06-plan-mvp.md`) | Estado |
| :--- | :--- |
| Fase 0 — Setup, modelo de datos, documentación | ✅ Completada y verificada |
| Fase 1 — Autenticación y gestión de usuarios | ✅ Completada y verificada |
| Fase 2 — Expediente, clasificación y documentos | ⬜ No iniciada |
| Fase 3 — Revisión, observaciones y correcciones | ⬜ No iniciada |
| Fase 4 — Alineación, pago (simulado) e inspección final | ⬜ No iniciada |
| Fase 5 — Emisión de licencia (PDF + QR) | ⬜ No iniciada |
| Fase 6 — Dashboard y pulido | ⬜ No iniciada |

### Funcionalidades existentes (verificadas en ejecución)

- **Registro de solicitante** (profesional colegiado CIG/CAG): la cuenta queda `PENDING_APPROVAL` hasta aprobación manual del Admin.
- **Login** con JWT (15 min) + refresh token rotatorio (7 días, hasheado en BD, revocable).
- **Guards globales**: autenticación JWT en todos los endpoints (salvo `@Public()`) y autorización por rol (`@Roles(...)`).
- **Gestión de usuarios (solo ADMIN):** listar con filtros, crear usuarios internos (Revisor/Inspector), aprobar solicitantes, activar/desactivar.
- **Frontend:** páginas de login, registro y panel de administración de usuarios.
- **Seed:** tenant "Municipalidad de Guatemala", Admin inicial y tipo de licencia L-01 con los 15 requisitos documentales (D-01…D-15).

### Limitaciones conocidas

- No hay envío real de correos (pendiente; en desarrollo se registrarán en consola).
- No hay Redis/BullMQ (pospuesto — ver decisión D-003).
- La fórmula de la tasa F08 usa valores provisionales en el seed; el arancel real está pendiente de conseguirse.
- El tenant es único (slug `guatemala` desde `.env`); el multi-municipio activo es de fase posterior.

## Tecnologías

- **Backend:** NestJS 10 (TypeScript), Prisma 5, PostgreSQL 16 (instalación local de Windows vía winget, servicio `postgresql-x64-16`, sin Docker), JWT (passport-jwt), bcryptjs.
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS 3, Zustand (estado de sesión persistido).

## Cómo levantar el entorno

El entorno ya está configurado en esta máquina (`.env` creados, base `permisogt` migrada y sembrada):

1. `backend/`: `npm run start:dev` (puerto 3001). Si es una máquina nueva: copiar `.env.example` → `.env`, `npm install`, `npx prisma migrate dev`, `npx prisma db seed`.
2. `frontend/`: `npm run dev` (puerto 3000). En máquina nueva: copiar `.env.local.example` → `.env.local` y `npm install`.
3. Ingresar con el Admin del seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`; por defecto `admin@permisogt.local` / `Admin123!`).
4. Credenciales de la BD local de desarrollo: `postgres` / `postgres` en `localhost:5432`.
