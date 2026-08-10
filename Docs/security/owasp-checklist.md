# Checklist OWASP Top 10 — PermisoGT MVP

> **Fecha:** Agosto 2026  
> **Alcance:** Revisión básica del estado de seguridad del MVP (no sustituye un pentest).  
> **Referencia:** [OWASP Top 10:2021](https://owasp.org/Top10/)

| # | Riesgo | Estado MVP | Evidencia / mitigación | Residual |
| :--- | :--- | :--- | :--- | :--- |
| A01 | Broken Access Control | **Mitigado (parcial)** | JWT global + `RolesGuard`; filtrado por `tenantId` en servicios; propietario vs staff en expedientes/documentos/licencias | Superadmin multi-tenant no ejercitado; revisión periódica de nuevos endpoints |
| A02 | Cryptographic Failures | **Mitigado (dev)** | Contraseñas con bcryptjs (costo 10); refresh tokens hasheados (SHA-256); JWT firmado | Secretos en `.env` local; HTTPS obligatorio en producción |
| A03 | Injection | **Mitigado** | Prisma parametrizado; `ValidationPipe` con `whitelist` + `forbidNonWhitelisted` | Evitar raw SQL futuro sin parámetros |
| A04 | Insecure Design | **Aceptable MVP** | Máquina de estados en servidor; no se confía en el cliente para transiciones | Fórmula de tasa provisional; pago simulado claramente marcado |
| A05 | Security Misconfiguration | **Parcial** | CORS restringido a `CORS_ORIGIN`; Swagger en `/api/docs` (desactivar o proteger en prod) | No hay rate limiting; Swagger expuesto en desarrollo |
| A06 | Vulnerable Components | **Parcial** | Dependencias fijadas donde hubo riesgo (`file-type@16`, multer 2.x) | Ejecutar `npm audit` en CI antes de producción |
| A07 | Identification & Auth Failures | **Mitigado (MVP)** | Access 15 min + refresh rotatorio/revocable; cuentas `PENDING_APPROVAL`/`DISABLED` no autentican; JWT revalida estado en BD | Sin MFA; sin bloqueo por intentos fallidos |
| A08 | Software & Data Integrity | **Parcial** | Auditoría inmutable de transiciones; MIME por contenido en uploads (D-009) | Fotos de inspección sin la misma validación MIME |
| A09 | Security Logging Failures | **Parcial** | `AuditLog` de acciones de negocio; logs de Nest en consola | Sin SIEM / alertas; correo aún no integrado |
| A10 | SSRF | **N/A MVP** | No hay fetch a URLs controladas por el usuario | Revisar si se añaden webhooks o previews remotos |

## Acciones recomendadas antes de producción

1. Forzar HTTPS y rotar todos los secretos JWT.
2. Deshabilitar o proteger Swagger (`/api/docs`) fuera de desarrollo.
3. Rate limiting en `/auth/login` y `/auth/register`.
4. Política de retención y backup de `uploads/` / S3.
5. Revisar `npm audit` y actualizar dependencias con vulnerabilidades altas.
6. Prueba de autorización cruzada (solicitante A no lee expediente de B; tenant A no ve tenant B).
