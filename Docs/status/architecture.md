# Arquitectura Técnica

> Última actualización: Agosto 2026

## Visión general

Monorepo con dos aplicaciones independientes que se comunican por HTTP:

```
[Next.js :3000] ──HTTP/JSON──► [NestJS :3001 /api] ──Prisma──► [PostgreSQL local]
```

- **Frontend (Next.js, App Router):** páginas cliente (`'use client'`); el estado de sesión vive en Zustand persistido en localStorage.
- **Backend (NestJS):** API REST con prefijo `/api`, validación global con `class-validator` (`whitelist` + `forbidNonWhitelisted`), CORS restringido al origen del frontend.
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

## Flujo de datos del expediente (diseño; fases 2+)

La máquina de estados del expediente (`ApplicationStatus`) sigue `mvp_docs/03-flujo-expediente-digital.md`:
`BORRADOR → EN_VALIDACION → (OBSERVADO_FORMATO) → EN_REVISION_TECNICA ⇄ EN_CORRECCION → ALINEACION_PROGRAMADA → PENDIENTE_DE_PAGO → LICENCIA_EMITIDA → RECEPCION_DE_OBRA → CERRADO`, con salida a `RECHAZADO` tras superar las rondas de corrección.

El modelo de datos ya soporta ese flujo completo: requisitos configurables por tipo de licencia, documentos versionados por reemplazo, observaciones por ronda, inspecciones con fechas propuestas/confirmadas, pago con bandera `simulated` (decisión D-004), licencia con correlativo + token QR, y `AuditLog` de solo inserción.

## Servicios externos

Ninguno activo en esta fase. Previstos: SMTP/SendGrid para correos (con cola BullMQ cuando haya Redis — decisión D-003), S3/MinIO para archivos en producción (en desarrollo se usará disco local `backend/uploads/`).

## Configuración

Toda la configuración vive en variables de entorno (`backend/.env`, `frontend/.env.local`); hay plantillas `.example` versionadas. Configuración de negocio por municipio (fórmula de tasa, máximo de rondas) en JSONB: `Tenant.settings` y `LicenseType.feeFormula`.
