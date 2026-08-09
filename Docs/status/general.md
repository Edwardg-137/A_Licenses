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
| Fase 2 — Expediente, clasificación y documentos | ✅ Completada y verificada |
| Fase 3 — Revisión, observaciones y correcciones | ⬜ No iniciada |
| Fase 4 — Alineación, pago (simulado) e inspección final | ⬜ No iniciada |
| Fase 5 — Emisión de licencia (PDF + QR) | ⬜ No iniciada |
| Fase 6 — Dashboard y pulido | ⬜ No iniciada |

### Funcionalidades existentes (verificadas en ejecución)

- **Registro de solicitante** (profesional colegiado CIG/CAG): la cuenta queda `PENDING_APPROVAL` hasta aprobación manual del Admin.
- **Login** con JWT (15 min) + refresh token rotatorio (7 días, hasheado en BD, revocable).
- **Guards globales**: autenticación JWT en todos los endpoints (salvo `@Public()`) y autorización por rol (`@Roles(...)`).
- **Gestión de usuarios (solo ADMIN):** listar con filtros, crear usuarios internos (Revisor/Inspector), aprobar solicitantes, activar/desactivar.
- **Frontend:** páginas de login, registro, panel de administración de usuarios, asistente de nueva solicitud (onboarding pre-trámite + clasificación F08 + datos del proyecto), expediente con carga/verificación/envío de documentos, y bandeja del revisor con filtros.
- **Expedientes:** creación con clasificación automática F08 (vivienda unifamiliar ≤ 700 m², fuera de Centro Histórico), formulario del proyecto, carga de documentos con validación de MIME **por contenido** (detección de archivos falsos), versionado por reemplazo, "Verificar antes de enviar", envío con transición `BORRADOR → OBSERVADO_FORMATO / EN_REVISION_TECNICA`.
- **Documentos:** almacenamiento en disco local con nombres UUID (decisión D-007), descarga/preview autenticado con streaming; PDF/JPG se abren en pestaña nueva, **DWG solo descarga** (conversión a imagen pendiente de un servicio conversor externo).
- **Notificaciones in-app:** envío de expediente, observación por formato, expediente en revisión y asignación de revisor. Correo electrónico pendiente (decisión D-003).
- **Auditoría:** cada creación, carga/reemplazo de documento, envío y asignación queda en `AuditLog` inmutable.
- **Seed:** tenant "Municipalidad de Guatemala", usuarios de prueba de cada rol, y tipo de licencia L-01 con los 15 requisitos documentales (D-01…D-15; D-15 con etapa `PAGO`).

### Limitaciones conocidas

- No hay envío real de correos (pendiente; en desarrollo se registrarán en consola).
- No hay Redis/BullMQ (pospuesto — ver decisión D-003).
- La fórmula de la tasa F08 usa valores provisionales en el seed; el arancel real está pendiente de conseguirse.
- El tenant es único (slug `guatemala` desde `.env`); el multi-municipio activo es de fase posterior.

## Tecnologías

- **Backend:** NestJS 10 (TypeScript), Prisma 5, PostgreSQL 16 (instalación local de Windows, servicio `postgresql-x64-16`, sin Docker), JWT (passport-jwt), bcryptjs.
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS 3, Zustand (estado de sesión persistido).

## Cómo ejecutar la plataforma

### En esta máquina (entorno ya configurado)

PostgreSQL 16 ya está instalado (servicio `postgresql-x64-16`, credenciales `postgres`/`postgres`), la base `permisogt` ya está migrada y sembrada, y los `.env` ya existen. Solo hay que levantar los dos procesos, cada uno en su terminal:

```powershell
# Terminal 1 — API (puerto 3001)
cd c:\building_permits\backend
npm run start:dev

# Terminal 2 — Portal web (puerto 3000)
cd c:\building_permits\frontend
npm run dev
```

Luego abrir **http://localhost:3000**.

### En una máquina nueva (setup desde cero)

1. Instalar PostgreSQL 16 (`winget install -e --id PostgreSQL.PostgreSQL.16`) y crear la base:
   `CREATE DATABASE permisogt;`
2. `backend/`: copiar `.env.example` → `.env` (ajustar `DATABASE_URL`), luego:
   `npm install` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run start:dev`
3. `frontend/`: copiar `.env.local.example` → `.env.local`, luego:
   `npm install` → `npm run dev`

### Credenciales de prueba (solo entorno de desarrollo)

Creadas por el seed (`backend/prisma/seed.ts`) para testing manual de cada rol:

| Rol | Correo | Contraseña | Qué puede hacer hoy |
| :--- | :--- | :--- | :--- |
| Administrador | `admin@permisogt.local` | `Admin123!` | Panel de usuarios: aprobar solicitantes, crear Revisores/Inspectores, activar/desactivar |
| Revisor Municipal | `revisor@permisogt.local` | `Revisor123` | Bandeja de expedientes con filtros y detalle de documentos (solo lectura; observaciones en Fase 3) |
| Inspector | `inspector@permisogt.local` | `Inspector123` | (Su agenda de visitas llega en la Fase 4) |
| Solicitante | `solicitante@permisogt.local` | `Solicita123` | Crear expedientes F08, cargar/verificar documentos, enviar a revisión |

Adicionalmente existen dos cuentas creadas durante las pruebas de la Fase 1: `arquitecto@test.gt` (Solicitante, contraseña `Secreto123`) y `revisor@muniguate.gt` (Revisor, contraseña `Revisor123`).

Para probar el **flujo de aprobación de solicitantes**, registra una cuenta nueva desde `/registro`: quedará pendiente hasta que el Admin la apruebe en `/admin/usuarios`.
