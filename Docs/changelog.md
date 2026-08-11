# Changelog

## 2026-08-11 — Inc. A: clasificación F08/F02 y tipo L-02

- **Descripción:** Clasificador multi-formulario (D-016): F08/L-01 para residencial unifamiliar ≤700 m²; F02/L-02 para mixto/comercial/industrial (o residencial con cambio de uso) entre 31–700 m²; rechazo en línea si área >700 o Centro Histórico. Seed L-02 con D-01…D-15 (D-14=F02) y D-16…D-21 opcionales; `feeFormula` provisional distinta. Wizard frontend con usos ampliados y campos F02. L-01 sin cambio de comportamiento.
- **Documentos:** `implementations/2026-08-ampliacion-tipos-formularios-mapeo.md`; `status/general.md`, `structure.md`, `architecture.md`, `decisions.md` (D-016).
- **Verificación:** ✅ `tsc` backend/frontend OK; seed crea L-01 y L-02.
- **Impacto:** Amplía el alcance en línea a comercial/mixto vía F02; F11/F04 siguen pendientes.

## 2026-08-10 — Fase 6: Dashboard Admin, Swagger y checklist OWASP

- **Descripción:** Módulo `reports` con `GET /reports/dashboard` (solo ADMIN): KPIs, expedientes por estado, tiempo promedio por fase (auditoría), documentos más observados y actividad reciente. Frontend `/admin` con visualización de métricas. Swagger UI en `/api/docs` (`@nestjs/swagger@7`, D-015). Checklist OWASP Top 10 en `Docs/security/owasp-checklist.md`. UX: Header unificado en Admin, redirección post-login al dashboard.
- **Documentos:** `implementations/2026-08-fase6-dashboard-y-pulido.md`; `security/owasp-checklist.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-015).
- **Verificación:** ✅ Dashboard con datos reales; 403 para no-Admin; Swagger HTTP 200; frontend y backend compilan.
- **Impacto:** Cierra el plan MVP (fases 0–6). Residual: rate limiting, MFA, correo real y protección de Swagger en producción.

## 2026-08-10 — Fase 5: Emisión de licencia (PDF + QR) y verificación pública

- **Descripción:** Nuevo módulo `licenses`: al confirmar el pago se emite automáticamente la licencia oficial (opción 1 / D-014) con PDF generado por `pdf-lib`, QR embebido (`qrcode`), correlativo `LC-GT-YYYY-NNNNNN` y registro `License`. Endpoints de metadatos/descarga autenticados, verificación pública `@Public()` por token, y backfill `issue-license` para expedientes pagados previos. Frontend: descarga en vista de solicitante/revisor y página pública `/verificar/[token]`. Variable `PUBLIC_APP_URL`.
- **Documentos:** `implementations/2026-08-fase5-emision-de-licencia.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-014).
- **Verificación:** ✅ Emisión al confirmar pago, PDF válido, verificación pública, 404 de token inválido, idempotencia y backfill sobre expediente cerrado de Fase 4.
- **Impacto:** El MVP cubre el documento oficial de licencia verificable; queda la Fase 6 (dashboard y pulido).

## 2026-08-09 — Docker Compose (db + backend + frontend)

- **Descripción:** Se añadió el stack containerizado oficial: `docker-compose.yml` con PostgreSQL 16 (puerto host 5433), API NestJS y portal Next.js (`output: 'standalone'`). El backend aplica migraciones y seed al arrancar. Documentado como vía recomendada de instalación; el modo nativo Windows sigue disponible.
- **Documentos:** `implementations/2026-08-docker-compose.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-013); `README.md`; `.env.example` (raíz).
- **Verificación:** ✅ Build de imágenes, Postgres healthy, migrate + seed, login JWT OK, frontend HTTP 200.
- **Impacto:** Onboarding reproducible vía GitHub; no cambia la lógica de negocio del MVP.

## 2026-08-09 — Segundo set de usuarios de prueba y README de instalación

- **Descripción:** El seed crea ahora dos usuarios ACTIVE por cada rol (Admin, Revisor, Inspector, Solicitante). Se documentaron las credenciales del Set B en `Docs/status/general.md` y se añadió `README.md` en la raíz con una guía detallada de instalación (Git, Node.js, PostgreSQL, clonado, configuración de `.env`, migraciones, seed y arranque de backend/frontend) pensada para que otra persona pueda levantar el proyecto desde cero.
- **Documentos:** `README.md` (nuevo); `status/general.md`, `status/structure.md`; `backend/prisma/seed.ts`.
- **Impacto:** Facilita el onboarding de desarrolladores y el testing con cuentas paralelas por rol; no cambia la arquitectura ni el comportamiento de la API.

## 2026-08-09 — Fase 4: Alineación territorial, pago (simulado) y recepción de obra

- **Descripción:** Nuevos módulos backend `inspections` (solicitud de alineación por revisor, propuesta de hasta 3 fechas por inspector, confirmación por solicitante, resultado con foto obligatoria; recepción de obra post-licencia con el mismo ciclo) y `payments` (cálculo de tasa F08 configurable `base + % sobre presupuesto`, pago en línea simulado con comprobante PDF generado en código adjuntado como D-15, carga de comprobante externo, confirmación municipal → `LICENCIA_EMITIDA`). Ajustes: carga de D-15 habilitada solo en `PENDIENTE_DE_PAGO`; observaciones generales (alineación no conforme) no bloquean la aprobación y se resuelven al re-aprobar (D-011); el documento D-15 vigente es la fuente de verdad del comprobante (D-012); campo opcional `presupuestoEstimadoQ` en el formulario del proyecto. Frontend: agenda del inspector (`/inspector`), tarjetas de inspección/pago/recepción en la vista del solicitante, solicitud de alineación y confirmación de pago en la del revisor.
- **Documentos:** `implementations/2026-08-fase4-alineacion-pago-y-recepcion.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-011, D-012).
- **Verificación:** ✅ 17 pruebas E2E: ciclo feliz completo hasta `CERRADO`, rama alineación NO_CONFORME con re-aprobación, fórmula de tasa con y sin presupuesto (Q 850.00 = 500 + 0.1%×350,000), pago simulado y comprobante externo, integridad del PDF generado, casos negativos (duplicados, fecha no propuesta, doble pago, carga bloqueada).
- **Impacto:** El ciclo de vida del expediente funciona de punta a punta (borrador → cierre). Solo falta la emisión formal del documento de licencia (Fase 5) y el dashboard (Fase 6).

## 2026-08-09 — Fase 3: Revisión técnica, observaciones y correcciones

- **Descripción:** Nuevo módulo backend `review` (marcar documentos ✅/⚠️/❌ con texto y prioridad, `send-to-correction`, `approve-review`, `reject` con dictamen, `resubmit` del solicitante) con las reglas de rondas de la decisión D-010 (resolución por requisito, ronda final solo aprobar/rechazar). Carga restringida en `EN_CORRECCION` a documentos observados. Detalle del expediente enriquecido con observaciones, `maxCorrectionRounds` y bandera `replacedAfterObservation`. Frontend: interfaz de revisión del revisor (marcado por documento, barra de acciones, dictamen), vista del solicitante en corrección (observaciones, candado en documentos no observados, botón de reenvío), componente compartido `RoundsHistory` y avisos por estado (revisión, alineación programada, rechazado con dictamen).
- **Documentos:** `implementations/2026-08-fase3-revision-y-correcciones.md`; `status/general.md`, `status/structure.md`, `status/architecture.md`, `status/decisions.md` (D-010).
- **Verificación:** ✅ 14 pruebas E2E del ciclo completo (2 rondas de corrección, bloqueo de ronda final, aprobación, rechazo, casos negativos de permisos y validaciones); backend y frontend compilan sin errores.
- **Impacto:** El ciclo de observaciones/correcciones del flujo municipal queda completo; el expediente puede llegar hasta `ALINEACION_PROGRAMADA` (o `RECHAZADO`). Base para la Fase 4 (alineación, pago e inspección final).

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
