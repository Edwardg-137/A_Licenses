# Registro de Decisiones Técnicas

## D-001 — Stack: Next.js + NestJS + PostgreSQL

- **Fecha:** 2026-08-08
- **Contexto:** El cliente tenía preferencia inicial por "Flutter Web / React". `mvp_docs/05-arquitectura-y-stack.md` evaluó ambas.
- **Problema:** Elegir el stack definitivo antes de iniciar el desarrollo.
- **Decisión:** React + Next.js 14 (frontend), NestJS 10 + Prisma + PostgreSQL (backend). Confirmada por el usuario.
- **Justificación:** Mejor ecosistema para tablas, gestión documental y SEO de vistas públicas (verificación QR de licencias); estructura modular de NestJS apta para multi-tenant.
- **Consecuencias:** Si se construye app móvil para inspectores (fase futura), sería un proyecto Flutter separado compartiendo la misma API.

## D-002 — Multi-tenant por columna `tenantId` (no schema por tenant)

- **Fecha:** 2026-08-08
- **Contexto:** `mvp_docs/05-arquitectura-y-stack.md` proponía un schema de PostgreSQL por municipalidad.
- **Problema:** Prisma no maneja bien schemas dinámicos por tenant (el schema del cliente es estático); implementarlo exigiría workarounds frágiles.
- **Decisión:** Aislamiento lógico por columna `tenantId` en todas las tablas de negocio, con filtrado obligatorio en la capa de servicios a partir del JWT. Aprobada por el usuario.
- **Justificación:** Es el patrón estándar con Prisma; misma garantía funcional de aislamiento para el tamaño esperado; simplifica migraciones y el MVP.
- **Consecuencias:** Toda query de negocio debe filtrar por `tenantId` (regla de revisión de código). Si algún municipio exigiera aislamiento físico, se evaluaría base de datos dedicada por instancia.

## D-003 — Posponer Redis/BullMQ; emails a consola en desarrollo

- **Fecha:** 2026-08-08
- **Contexto:** El stack propuesto incluía Redis + BullMQ para la cola de notificaciones. El usuario no tiene Docker y Redis no tiene distribución oficial para Windows.
- **Problema:** No hay forma sencilla de correr Redis en el entorno de desarrollo local.
- **Decisión:** Posponer Redis/BullMQ. En desarrollo, los correos se registran en consola; las notificaciones in-app van directas a la tabla `Notification`.
- **Justificación:** El volumen del MVP no requiere cola; el envío de email puede ser síncrono o diferido sin Redis.
- **Consecuencias:** Al desplegar a staging/producción (Railway/Render) se incorporará Redis administrado y se moverá el envío de correos a BullMQ.

## D-004 — Pago en línea simulado en el MVP

- **Fecha:** 2026-08-08
- **Contexto:** El pago real de tasas se hace en caja municipal; no hay integración disponible.
- **Problema:** El MVP necesita demostrar el flujo completo incluyendo pago.
- **Decisión:** Flujo de pago en línea **simulado**, claramente señalizado como simulación, que genera un comprobante; alternativa de subir comprobante externo. Campo `Payment.simulated` en el modelo. Decidido por el usuario.
- **Justificación:** Permite demostrar el flujo de punta a punta sin depender de la municipalidad.
- **Consecuencias:** La integración con el sistema de pago real es una fase posterior; el modelo ya lo soporta (`simulated = false`).

## D-005 — Verificación manual del número de colegiado

- **Fecha:** 2026-08-08
- **Contexto:** El registro de solicitantes exige colegiado activo (CIG/CAG), pero el MVP excluye integraciones con APIs externas.
- **Problema:** No se puede verificar automáticamente la vigencia del colegiado.
- **Decisión:** Las cuentas de solicitante nacen en estado `PENDING_APPROVAL`; el Admin municipal las revisa y aprueba manualmente. Decidido por el usuario.
- **Justificación:** Refleja el control real que ejerce la municipalidad sin bloquear el MVP.
- **Consecuencias:** Endpoint `PATCH /users/:id/approve` y sección de pendientes en el panel del Admin. La consulta a los validadores en línea de los colegios queda para fases posteriores.

## D-006 — bcryptjs en lugar de bcrypt nativo

- **Fecha:** 2026-08-08
- **Contexto:** Desarrollo en Windows sin toolchain de compilación garantizado.
- **Problema:** `bcrypt` nativo requiere node-gyp y suele fallar al instalar en Windows.
- **Decisión:** Usar `bcryptjs` (implementación JS pura, API compatible).
- **Justificación:** Elimina el riesgo de instalación; el costo de rendimiento es aceptable para el volumen del MVP.
- **Consecuencias:** Si el hashing se vuelve cuello de botella, se puede migrar a `bcrypt` o `argon2` sin cambiar el esquema (mismo formato de hash en el caso de bcrypt).
