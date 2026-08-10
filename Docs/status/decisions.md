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

## D-007 — Almacenamiento de archivos en disco local durante desarrollo

- **Fecha:** 2026-08-09
- **Contexto:** `mvp_docs/05-arquitectura-y-stack.md` prevé S3/MinIO con URLs prefirmadas; el entorno de desarrollo es Windows local sin Docker ni MinIO.
- **Problema:** Dónde guardar los documentos del expediente en desarrollo sin levantar infraestructura extra.
- **Decisión:** Disco local (`backend/uploads/<tenantId>/<applicationId>/<uuid>.<ext>`) detrás de un `StorageService` que es el único punto de contacto con el sistema de archivos. Descarga por endpoint autenticado con streaming (equivalente funcional a la URL prefirmada).
- **Justificación:** Cero infraestructura adicional; el aislamiento en `StorageService` hace trivial la migración a S3/MinIO en staging/producción.
- **Consecuencias:** `uploads/` no se versiona; nombres de archivo UUID impredecibles; el nombre original solo existe como metadato en BD. En producción se reemplaza la implementación, no la interfaz.

## D-008 — `file-type` fijado en v16 (última versión CommonJS)

- **Fecha:** 2026-08-09
- **Contexto:** Desde v17, `file-type` es ESM-only y no puede cargarse con `require()` desde el build CommonJS de NestJS sin workarounds frágiles.
- **Problema:** Compatibilidad del sistema de detección de MIME con el build del backend.
- **Decisión:** Fijar `file-type@16.5.4` (sin `^`, para no saltar a v17+) + `@types/file-type` (v16 no incluye tipos propios).
- **Justificación:** Mantiene el build CJS simple y estable; la API v16 cubre PDF/JPG/PNG y los formatos del MVP.
- **Consecuencias:** Carencias de v16 (no detecta DWG, lanza End-Of-Stream con buffers cortos) se compensan en código (D-009). Si se migra el backend a ESM/Nest 11+, se podrá actualizar a la versión actual.

## D-009 — Reglas de detección de MIME por contenido

- **Fecha:** 2026-08-09
- **Contexto:** La validación automática del MVP exige verificar el formato real del archivo, no la extensión (`mvp_docs/03` §4, OE-04).
- **Problema:** `file-type` v16 no cubre DWG y falla (End-Of-Stream) con buffers muy cortos; además hay que decidir qué hacer cuando el contenido contradice al cliente.
- **Decisión:** (1) si el contenido detectado **contradice** el MIME declarado, se rechaza con HTTP 400 (archivo falso); (2) si el contenido **no es reconocible**, se acepta el MIME del cliente (el revisor humano lo valida); (3) DWG se detecta por la firma ASCII `AC` + versión → `image/vnd.dwg`; (4) buffers cortos se respaldan con firmas mínimas (`%PDF`, JPEG `FFD8FF`, PNG).
- **Justificación:** Equilibrio entre seguridad (bloquea suplantación de formato) y pragmatismo (no bloquea formatos sin firma estándar).
- **Consecuencias:** Un JPG/PNG renombrado no puede hacerse pasar por PDF. Los archivos sospechosos pero no reconocibles quedan a criterio de la revisión técnica.

## D-010 — Ciclo de vida de las observaciones del revisor

- **Fecha:** 2026-08-09
- **Contexto:** La `Observation` referencia a la versión concreta del documento observada (`ApplicationDocument`), pero el solicitante corrige **subiendo una versión nueva** (distinto `documentId`) y el revisor confirma sobre esa versión. Además, `mvp_docs/03` §5 exige que en la última ronda el revisor solo pueda aprobar o rechazar.
- **Problema:** (1) ¿Cuándo se considera resuelta una observación si el documento al que apunta ya no es el vigente? (2) ¿Qué puede hacer el revisor en la ronda final?
- **Decisión:**
  1. Las observaciones se resuelven por **requisito** (`document.requirementId`), no por versión: marcar ✅ Conforme resuelve todas las pendientes de ese requisito (de cualquier ronda); una observación nueva sobre el mismo requisito sustituye (resuelve) a las anteriores pendientes.
  2. Enviar a corrección exige observaciones sin resolver **de la ronda actual** (`correctionRound + 1`) y está bloqueado cuando `correctionRound + 1 >= maxCorrectionRounds` (ronda final: solo aprobar o rechazar).
  3. Aprobar exige **cero observaciones sin resolver de cualquier ronda**: el revisor debe confirmar explícitamente cada documento corregido.
  4. El rechazo con dictamen (mín. 20 caracteres) está disponible en cualquier ronda, no solo la final, para casos inviables desde el inicio.
- **Justificación:** Coherencia del historial de rondas (ninguna observación queda "colgada") y fidelidad al flujo aprobado, sin impedir rechazos tempranos fundamentados.
- **Consecuencias:** El estado `ALINEACION_PROGRAMADA` solo se alcanza con expediente completamente conforme. El reenvío del solicitante exige que ningún documento vigente siga marcado (los reemplazos nacen como `PENDIENTE`).

## D-011 — Observaciones generales (sin documento) no bloquean la aprobación

- **Fecha:** 2026-08-09
- **Contexto:** En Fase 4, una alineación NO_CONFORME crea una `Observation` sin documento (es del expediente completo). D-010 exige cero observaciones sin resolver para aprobar, pero una observación general no tiene forma manual de resolverse (no hay documento que marcar como conforme).
- **Problema:** Con la regla original, el expediente quedaría atascado tras una alineación no conforme.
- **Decisión:** `approve-review` exige cero pendientes **documentales** (`documentId != null`); las observaciones **generales** (`documentId = null`) no bloquean y se resuelven automáticamente al aprobar la revisión siguiente (el revisor las da por atendidas al re-aprobar). Se muestran con etiqueta "General" en el historial.
- **Justificación:** El revisor siempre las ve en el historial antes de aprobar; forzar una resolución manual sin artefacto asociado añadiría fricción sin valor.
- **Consecuencias:** El ciclo "alineación no conforme → revisión → re-aprobación → nueva inspección" funciona sin estados muertos. La regla queda como extensión de D-010.

## D-012 — El documento D-15 vigente es la fuente de verdad del comprobante de pago

- **Fecha:** 2026-08-09
- **Contexto:** Hay dos vías de pago (D-004): pago simulado (genera PDF y lo adjunta) o comprobante externo subido como D-15. `Payment.receiptPath` solo lo fija la vía simulada.
- **Problema:** Confirmar el pago exigiendo `receiptPath` hacía imposible confirmar pagos con comprobante externo (detectado en la verificación E2E).
- **Decisión:** La confirmación de pago exige que exista el **documento D-15 vigente** en el expediente (no el campo `receiptPath`). Si el comprobante fue externo, `receiptPath` se rellena desde el `storagePath` del documento al confirmar.
- **Justificación:** Una sola regla para ambas vías; el expediente documental sigue siendo la referencia completa.
- **Consecuencias:** `Payment.receiptPath` queda como copia de conveniencia. El revisor puede ver el D-15 desde el expediente antes de confirmar.

## D-014 — Emisión automática de la licencia al confirmar el pago

- **Fecha:** 2026-08-10
- **Contexto:** Fase 5. El flujo del MVP llega a `LICENCIA_EMITIDA` al confirmar el pago; el documento de propuesta describe también que “el revisor emite la resolución final”.
- **Problema:** ¿La generación del PDF + QR es un paso manual del revisor o ocurre al confirmar el pago?
- **Decisión (opción 1, confirmada por el usuario):** al confirmar el pago, `PaymentsService` llama a `LicensesService.issueForApplication`, que genera el PDF (`pdf-lib` + QR con `qrcode`), asigna correlativo `LC-GT-YYYY-NNNNNN`, guarda el archivo y crea el registro `License`. Existe `POST /applications/:id/issue-license` solo como **backfill** idempotente para expedientes ya pagados sin documento (p. ej. pruebas de Fase 4).
- **Justificación:** Evita un paso manual adicional; alinea el estado `LICENCIA_EMITIDA` con la existencia real del PDF; el revisor ya autorizó al confirmar el cobro.
- **Consecuencias:** `PUBLIC_APP_URL` define la base del enlace embebido en el QR. La verificación pública (`GET /licenses/verify/:token`) es `@Public()`. El correo con adjunto sigue aplazado (D-003).

## D-013 — Docker Compose como forma oficial de levantar el stack

- **Fecha:** 2026-08-09
- **Contexto:** El entorno se basaba en PostgreSQL instalado en Windows y procesos Node nativos. Docker Desktop quedó disponible en el equipo de desarrollo.
- **Problema:** Onboarding frágil y poco reproducible; dificulta compartir el mismo entorno vía GitHub.
- **Decisión:** Añadir `docker-compose.yml` con servicios `db` (Postgres 16), `backend` (NestJS) y `frontend` (Next.js standalone). El puerto host de Postgres es **5433** para no chocar con una instalación local en 5432. Sigue siendo válido el modo híbrido (`docker compose up db -d` + Nest/Next en el host).
- **Justificación:** Un solo comando reproduce migraciones, seed y arranque; alinea el repo con el despliegue containerizado futuro.
- **Consecuencias:** Hay que liberar los puertos 3000/3001/5433 (o cambiarlos en `.env`). Redis/BullMQ siguen fuera del MVP (D-003), aunque Docker ya no es el bloqueador. `NEXT_PUBLIC_API_URL` se fija en el **build** de la imagen frontend.

## D-015 — Swagger UI en desarrollo; proteger o desactivar en producción

- **Fecha:** 2026-08-10
- **Contexto:** Fase 6 exige documentación técnica de la API (OpenAPI).
- **Problema:** Cómo exponer la documentación sin filtrar el superficie de ataque en producción.
- **Decisión:** Integrar `@nestjs/swagger@7` + `swagger-ui-express` en `/api/docs` para desarrollo y staging. En producción se debe desactivar el setup o protegerlo (red privada / auth básica).
- **Justificación:** Cumple el entregable del plan sin acoplar generadores externos; v7 es compatible con NestJS 10.
- **Consecuencias:** Queda registrado en el checklist OWASP (A05). No se anotan todos los DTOs en esta fase; los tags del DocumentBuilder organizan los módulos.
