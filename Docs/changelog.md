# Changelog

## 2026-08-09 — Fase 2: Expedientes, clasificación F08 y documentos

- **Descripción:** Módulos `applications`, `documents` y `notifications`. Clasificación automática F08 (≤700 m² residencial, fuera de Centro Histórico), formulario del proyecto, carga de documentos con detección de MIME por contenido (rechaza archivos falsos), versionado por reemplazo, "Verificar antes de enviar", envío con transición a revisión técnica u observado por formato, bandeja del revisor con filtros, asignación de revisor por el Admin, notificaciones in-app y auditoría. Frontend: asistente de nueva solicitud (onboarding + clasificación + formulario), expediente con tarjetas de documentos, bandeja y detalle del revisor. `DocumentRequirement.stage` separa los documentos de ingreso del comprobante de pago (D-15).
- **Documentos:** `implementations/2026-08-fase2-expedientes-y-documentos.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-007…D-009).
- **Verificación:** ✅ 15 pruebas de API extremo a extremo exitosas (crear, cargar, validar, enviar, bandeja, asignar, descargar, casos negativos); ambos proyectos compilan sin errores.
- **Impacto:** El flujo central del MVP ya funciona de extremo a extremo hasta revisión técnica; base para la Fase 3 (observaciones y correcciones).

## 2026-08-09 — Usuarios de prueba de cada rol y guía de ejecución documentada

- **Descripción:** El seed (`backend/prisma/seed.ts`) ahora crea los 4 usuarios de prueba ACTIVE (Admin, Revisor, Inspector, Solicitante) además del tenant y los requisitos L-01. Se documentó en `status/general.md` la guía completa de ejecución (esta máquina y setup desde cero) y la tabla de credenciales de prueba. Login de las 4 cuentas verificado contra la API.
- **Documentos:** `status/general.md`, `status/structure.md`, `backend/prisma/seed.ts`, `backend/.env.example`.
- **Impacto:** Facilita el testing manual de la plataforma; cambio de infraestructura/datos, no de arquitectura (no requirió documento de implementación propio).

## 2026-08-08 — Fase 0 + Fase 1: Setup del proyecto, modelo de datos y autenticación

- **Descripción:** Creación del monorepo (`backend/` NestJS + Prisma, `frontend/` Next.js + Tailwind), modelo de datos completo del MVP en Prisma, seed inicial (tenant Guatemala, Admin, L-01 con D-01…D-15), autenticación JWT + refresh rotatorio, guards por rol, gestión de usuarios por el Admin (aprobar solicitantes, crear internos, activar/desactivar) y páginas de login/registro/panel de usuarios.
- **Documentos:** `implementations/2026-08-fase0-fase1-setup-y-autenticacion.md`; creados `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-001…D-006).
- **Impacto:** Base técnica para las fases 2–6 del MVP.
- **Verificación:** ✅ Completada el mismo día. PostgreSQL 16 instalado localmente (winget), migración y seed aplicados, backend y frontend compilan, y las 10 pruebas funcionales del flujo de autenticación/usuarios pasaron (ver documento de implementación).

## 2026-08-08 — Correcciones de consistencia en `mvp_docs/`

- **Descripción:** Eliminada la versión duplicada/contradictoria del flujo en `03-flujo-expediente-digital.md`; numeración D-01…D-15 unificada en docs 04 y 07; decisiones registradas en los documentos de propuesta (stack confirmado, aprobación manual de colegiado, pago simulado en MVP).
- **Documentos:** `mvp_docs/00, 01, 02, 03, 04, 05, 06, 07`.
- **Impacto:** Documentación de propuesta consistente antes de iniciar el desarrollo. (Anterior al establecimiento de `Docs/`; se registra aquí como antecedente.)
