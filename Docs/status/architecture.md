# Arquitectura Técnica

> Última actualización: Agosto 2026

## Visión general

Monorepo con dos aplicaciones que se comunican por HTTP. En desarrollo se pueden correr de dos formas (decisión D-013):

**A) Docker Compose (recomendada)**

```
[Navegador] → frontend:3000 → backend:3001/api → db:5432 (Postgres en red Compose)
                              ↑ puerto host 5433 si se conecta desde el host
```

**B) Procesos nativos**

```
[Next.js :3000] ──HTTP/JSON──► [NestJS :3001 /api] ──Prisma──► [PostgreSQL local :5432]
```

- **Frontend (Next.js, App Router):** páginas cliente (`'use client'`); el estado de sesión vive en Zustand persistido en localStorage. Build Docker usa `output: 'standalone'`.
- **Backend (NestJS):** API REST con prefijo `/api`, validación global con `class-validator` (`whitelist` + `forbidNonWhitelisted`), CORS restringido al origen del frontend. En contenedor, el entrypoint aplica `prisma migrate deploy` y el seed si `RUN_SEED=true`.
- **Base de datos (PostgreSQL):** acceso exclusivo vía Prisma (`PrismaService` global).
## Multi-tenancy

Aislamiento por **columna `tenantId`** en todas las tablas de negocio (decisión D-002). En el MVP existe un único tenant (slug `guatemala`, configurado en `DEFAULT_TENANT_SLUG`); todos los servicios filtran por el `tenantId` del usuario autenticado, nunca por parámetros del cliente.

## Autenticación y autorización

- **Login:** credenciales verificadas con bcryptjs (hash costo 10). Los usuarios `PENDING_APPROVAL` o `DISABLED` no pueden autenticarse.
- **Access token:** JWT firmado con `JWT_ACCESS_SECRET`, expiración 15 min. Payload: `sub` (userId), `tenantId`, `role`, `email`.
- **Refresh token:** cadena aleatoria de 48 bytes; en BD solo se guarda su SHA-256 (`RefreshToken.tokenHash`). Expira a los 7 días, es revocable y **rota en cada uso** (el usado se revoca y se emite uno nuevo).
- **Guards globales** (registrados en `AppModule` con `APP_GUARD`):
  1. `JwtAuthGuard` — todo endpoint exige JWT salvo los marcados `@Public()` (register, login, refresh).
  2. `RolesGuard` — endpoints con `@Roles(...)` exigen el rol indicado (ej. todo `/users` requiere `ADMIN`).
- La estrategia JWT re-consulta el usuario en BD en cada request para rechazar cuentas desactivadas con tokens aún vigentes.

## Flujo de datos del expediente

La máquina de estados del expediente (`ApplicationStatus`) sigue `mvp_docs/03-flujo-expediente-digital.md`:
`BORRADOR → (OBSERVADO_FORMATO) → EN_REVISION_TECNICA ⇄ EN_CORRECCION → ALINEACION_PROGRAMADA → PENDIENTE_DE_PAGO → LICENCIA_EMITIDA → RECEPCION_DE_OBRA → CERRADO`, con salida a `RECHAZADO` tras superar las rondas de corrección.

**Implementado (Fases 2–4):** `BORRADOR → (OBSERVADO_FORMATO) → EN_REVISION_TECNICA ⇄ EN_CORRECCION → ALINEACION_PROGRAMADA → PENDIENTE_DE_PAGO → LICENCIA_EMITIDA → RECEPCION_DE_OBRA → CERRADO`, y la salida a `RECHAZADO` (con dictamen). La validación automática es síncrona al enviar (por eso `EN_VALIDACION` no aparece como estado persistido: dura segundos). Responsables de transición: `applications` (ingreso), `review` (revisión y correcciones, D-010/D-011), `inspections` (alineación y recepción de obra, con agenda inspector↔solicitante y resultado con foto) y `payments` (cálculo F08 configurable, pago simulado con comprobante PDF o comprobante externo D-15, confirmación — D-012). Toda transición registra auditoría y notificación.

### Documentos

- **Upload:** multipart (Multer 2, memoria, límite 25 MB) → detección de MIME por contenido → persistencia en disco vía `StorageService` → registro versionado (`ApplicationDocument`, uno solo `isCurrent` por requisito).
- **Validación de formato real (D-009):** `file-type` v16 para buffers normales; respaldo de firmas mínimas (`%PDF`, JPEG, PNG) para archivos cortos; firma ASCII `AC` para DWG. Si el contenido detectado contradice lo declarado por el cliente, se rechaza con HTTP 400.
- **Descarga:** `GET /documents/:id/download` autenticado, streaming con `Content-Disposition: inline` (el navegador muestra PDF/JPG y descarga DWG). Propietario o personal municipal del mismo tenant.
- **Etapas de exigencia:** `DocumentRequirement.stage` = `INGRESO` (se valida al enviar) o `PAGO` (D-15, se exige en Fase 4).

### Notificaciones y auditoría

`NotificationsService` es el punto único de notificación (in-app hoy; el correo se conectará aquí cuando haya SMTP — D-003). `AuditLog` es de solo inserción: cada transición/carga registra tenant, usuario, acción y estados origen/destino.

## Servicios externos

Ninguno activo en esta fase. Previstos: SMTP/SendGrid para correos (con cola BullMQ cuando haya Redis — decisión D-003), S3/MinIO para archivos en producción (en desarrollo, disco local `backend/uploads/` — decisión D-007).

## Configuración

Toda la configuración vive en variables de entorno (`backend/.env`, `frontend/.env.local`); hay plantillas `.example` versionadas. Configuración de negocio por municipio (fórmula de tasa, máximo de rondas) en JSONB: `Tenant.settings` y `LicenseType.feeFormula`.
