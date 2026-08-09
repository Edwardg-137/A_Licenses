# Changelog

## 2026-08-08 — Fase 0 + Fase 1: Setup del proyecto, modelo de datos y autenticación

- **Descripción:** Creación del monorepo (`backend/` NestJS + Prisma, `frontend/` Next.js + Tailwind), modelo de datos completo del MVP en Prisma, seed inicial (tenant Guatemala, Admin, L-01 con D-01…D-15), autenticación JWT + refresh rotatorio, guards por rol, gestión de usuarios por el Admin (aprobar solicitantes, crear internos, activar/desactivar) y páginas de login/registro/panel de usuarios.
- **Documentos:** `implementations/2026-08-fase0-fase1-setup-y-autenticacion.md`; creados `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-001…D-006).
- **Impacto:** Base técnica para las fases 2–6 del MVP.
- **Verificación:** ✅ Completada el mismo día. PostgreSQL 16 instalado localmente (winget), migración y seed aplicados, backend y frontend compilan, y las 10 pruebas funcionales del flujo de autenticación/usuarios pasaron (ver documento de implementación).

## 2026-08-08 — Correcciones de consistencia en `mvp_docs/`

- **Descripción:** Eliminada la versión duplicada/contradictoria del flujo en `03-flujo-expediente-digital.md`; numeración D-01…D-15 unificada en docs 04 y 07; decisiones registradas en los documentos de propuesta (stack confirmado, aprobación manual de colegiado, pago simulado en MVP).
- **Documentos:** `mvp_docs/00, 01, 02, 03, 04, 05, 06, 07`.
- **Impacto:** Documentación de propuesta consistente antes de iniciar el desarrollo. (Anterior al establecimiento de `Docs/`; se registra aquí como antecedente.)
