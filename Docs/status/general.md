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
| Fase 3 — Revisión, observaciones y correcciones | ✅ Completada y verificada |
| Fase 4 — Alineación, pago (simulado) e inspección final | ✅ Completada y verificada |
| Fase 5 — Emisión de licencia (PDF + QR) | ✅ Completada y verificada |
| Fase 6 — Dashboard y pulido | ⬜ No iniciada |

### Funcionalidades existentes (verificadas en ejecución)

- **Registro de solicitante** (profesional colegiado CIG/CAG): la cuenta queda `PENDING_APPROVAL` hasta aprobación manual del Admin.
- **Login** con JWT (15 min) + refresh token rotatorio (7 días, hasheado en BD, revocable).
- **Guards globales**: autenticación JWT en todos los endpoints (salvo `@Public()`) y autorización por rol (`@Roles(...)`).
- **Gestión de usuarios (solo ADMIN):** listar con filtros, crear usuarios internos (Revisor/Inspector), aprobar solicitantes, activar/desactivar.
- **Frontend:** páginas de login, registro, panel de administración de usuarios, asistente de nueva solicitud (onboarding pre-trámite + clasificación F08 + datos del proyecto), expediente con carga/verificación/envío de documentos, y bandeja del revisor con filtros.
- **Expedientes:** creación con clasificación automática F08 (vivienda unifamiliar ≤ 700 m², fuera de Centro Histórico), formulario del proyecto, carga de documentos con validación de MIME **por contenido** (detección de archivos falsos), versionado por reemplazo, "Verificar antes de enviar", envío con transición `BORRADOR → OBSERVADO_FORMATO / EN_REVISION_TECNICA`.
- **Documentos:** almacenamiento en disco local con nombres UUID (decisión D-007), descarga/preview autenticado con streaming; PDF/JPG se abren en pestaña nueva, **DWG solo descarga** (conversión a imagen pendiente de un servicio conversor externo).
- **Revisión técnica (ciclo de correcciones):** el revisor marca cada documento ✅ Conforme / ⚠️ Con observación / ❌ Requiere reemplazo, con texto y prioridad (Alta/Media/Baja); envía a corrección (`EN_CORRECCION`); el solicitante solo puede reemplazar los documentos observados y reenvía; el revisor distingue en verde los documentos reemplazados; máximo de rondas configurable (3 por defecto), en la ronda final solo cabe aprobar (`ALINEACION_PROGRAMADA`) o rechazar con dictamen (`RECHAZADO`). Historial de rondas visible para ambas partes (decisión D-010).
- **Alineación territorial:** el revisor solicita la inspección; el inspector propone hasta 3 fechas desde su agenda; el solicitante confirma una; el inspector registra el resultado con nota y **foto obligatoria**. Conforme → `PENDIENTE_DE_PAGO`; no conforme → regresa a `EN_REVISION_TECNICA` con observación general (D-011).
- **Pago de tasa municipal (F08):** cálculo automático configurable (`base + % sobre presupuesto estimado`, fórmula en `LicenseType.feeFormula`); vista con desglose; **pago en línea simulado** (banner de simulación) que genera comprobante PDF adjunto como D-15, o carga de comprobante externo; confirmación por revisor/Admin (D-012) → `LICENCIA_EMITIDA` (PDF de la licencia en Fase 5).
- **Recepción de obra:** el solicitante la solicita tras la emisión; mismo ciclo de agenda; resultado conforme → expediente `CERRADO`; no conforme → permanece en recepción con nota.
- **Emisión de licencia (opción 1):** al confirmar el pago se genera automáticamente el PDF oficial (`pdf-lib` + QR con `qrcode`), número correlativo `LC-GT-YYYY-NNNNNN`, registro `License` y notificación al solicitante/Admin. Descarga autenticada y verificación pública por token del QR (`/verificar/[token]`). Backfill `POST /applications/:id/issue-license` para expedientes pagados anteriores a la Fase 5.
- **Agenda del inspector** (`/inspector`): solicitudes pendientes, propuesta de fechas, registro de resultado con evidencia fotográfica.
- **Notificaciones in-app:** envío de expediente, observaciones, correcciones, aprobación, rechazo, inspección solicitada/fechas propuestas/visita confirmada, alineación conforme con monto, pago confirmado y resultado de recepción. Correo electrónico pendiente (decisión D-003).
- **Auditoría:** cada creación, carga/reemplazo de documento, envío y asignación queda en `AuditLog` inmutable.
- **Seed:** tenant "Municipalidad de Guatemala", **dos usuarios de prueba ACTIVE por cada rol** (Admin, Revisor, Inspector, Solicitante; ver credenciales más abajo), y tipo de licencia L-01 con los 15 requisitos documentales (D-01…D-15; D-15 con etapa `PAGO`).

### Limitaciones conocidas

- No hay envío real de correos (pendiente; en desarrollo se registrarán en consola).
- No hay Redis/BullMQ (pospuesto — ver decisión D-003; Docker ya está disponible — D-013 — pero la cola de correos aún no se implementó).
- La fórmula de la tasa F08 usa valores provisionales en el seed; el arancel real está pendiente de conseguirse.
- El comprobante de pago simulado es un PDF mínimo generado en código (sin librería); la licencia oficial usa `pdf-lib` + QR.
- El certificado de recepción de obra como documento descargable queda fuera del MVP (el resultado conforme cierra el expediente).
- Las fotos de evidencia de inspección no pasan por validación de MIME por contenido (a diferencia de los documentos del expediente, D-009).
- El correo con la licencia adjunta está aplazado (D-003); la notificación es in-app y la descarga desde el portal.
- El tenant es único (slug `guatemala` desde `.env`); el multi-municipio activo es de fase posterior.

## Tecnologías

- **Backend:** NestJS 10 (TypeScript), Prisma 5, PostgreSQL 16, JWT (passport-jwt), bcryptjs.
- **Frontend:** Next.js 14 (App Router, `output: 'standalone'` para Docker), React 18, Tailwind CSS 3, Zustand (estado de sesión persistido).
- **Contenedores:** Docker Compose (servicios `db`, `backend`, `frontend`) — decisión D-013. Alternativa: Postgres/Node nativos en Windows.

## Cómo ejecutar la plataforma

> Guía completa: **[`README.md`](../../README.md)** (Docker recomendado y modo nativo).

### Opción A — Docker Compose (recomendada)

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución. Liberar puertos **3000**, **3001** y **5433** (o ajustar en `.env`).

```powershell
cd c:\building_permits
copy .env.example .env   # opcional; hay defaults
docker compose up --build
```

Portal: **http://localhost:3000** · API: **http://localhost:3001/api**

Solo base de datos (desarrollo híbrido con Node en el host, `DATABASE_URL` → `localhost:5433`):

```powershell
docker compose up db -d
```

### Opción B — En esta máquina (Node + PostgreSQL local ya configurados)

PostgreSQL 16 local (servicio `postgresql-x64-16`, credenciales `postgres`/`postgres`), base `permisogt` migrada/sembrada y `.env` existentes:

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

Creadas por el seed (`backend/prisma/seed.ts`) para testing manual de cada rol. Hay **dos cuentas ACTIVE por rol**:

#### Set A

| Rol | Correo | Contraseña | Qué puede hacer hoy |
| :--- | :--- | :--- | :--- |
| Administrador | `admin@permisogt.local` | `Admin123!` | Panel de usuarios: aprobar solicitantes, crear Revisores/Inspectores, activar/desactivar |
| Revisor Municipal | `revisor@permisogt.local` | `Revisor123` | Bandeja con filtros; revisión documental (✅/⚠️/❌ con texto y prioridad), enviar a corrección, aprobar técnicamente o rechazar con dictamen |
| Inspector | `inspector@permisogt.local` | `Inspector123` | Agenda de inspecciones: proponer fechas, registrar resultado con foto (alineación y recepción de obra) |
| Solicitante | `solicitante@permisogt.local` | `Solicita123` | Crear expedientes F08, cargar/verificar documentos, enviar a revisión; atender observaciones; confirmar fecha de visita; pagar (simulado o comprobante externo); solicitar recepción de obra |

#### Set B

| Rol | Correo | Contraseña | Notas |
| :--- | :--- | :--- | :--- |
| Administrador | `admin2@permisogt.local` | `Admin456!` | Segunda cuenta ADMIN |
| Revisor Municipal | `revisor2@permisogt.local` | `Revisor456` | Segunda cuenta REVISOR |
| Inspector | `inspector2@permisogt.local` | `Inspector456` | Segunda cuenta INSPECTOR |
| Solicitante | `solicitante2@permisogt.local` | `Solicita456` | Profesional CIG (`CIG-8832`); el Set A usa CAG |

Adicionalmente existen dos cuentas creadas durante las pruebas de la Fase 1: `arquitecto@test.gt` (Solicitante, contraseña `Secreto123`) y `revisor@muniguate.gt` (Revisor, contraseña `Revisor123`).

Para probar el **flujo de aprobación de solicitantes**, registra una cuenta nueva desde `/registro`: quedará pendiente hasta que el Admin la apruebe en `/admin/usuarios`.

Si la base ya estaba sembrada antes de añadir el Set B, vuelve a ejecutar `npx prisma db seed` desde `backend/` para crear las cuentas nuevas (el seed usa `upsert` y no altera las existentes).