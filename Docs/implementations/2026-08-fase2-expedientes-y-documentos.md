# Fase 2 — Expediente, Clasificación F08 y Documentos

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completado y verificado (2026-08-09)
> **Fuente de alcance:** `mvp_docs/06-plan-mvp.md` Fase 2, `mvp_docs/03-flujo-expediente-digital.md` §1–§4

## Objetivo

Implementar el corazón del expediente digital: onboarding pre-trámite orientativo, clasificación automática del proyecto (F08), formulario de solicitud L-01, carga de los 15 documentos con validación automática (presencia + MIME real + integridad), "Verificar antes de enviar", envío del expediente y bandeja del revisor.

## Diseño de la solución

### Clasificación automática

Antes de crear el expediente, el sistema evalúa: uso del inmueble, área de construcción y ubicación en Centro Histórico. Regla del MVP:

- `uso = RESIDENCIAL` **y** `área ≤ 700 m²` **y** `no Centro Histórico` → formulario **F08** (se permite crear el expediente).
- En cualquier otro caso → mensaje informativo de que el trámite no está disponible en la plataforma aún y debe proceder presencialmente (no se crea expediente).

La misma regla se aplica en el endpoint de creación (validación en servidor, nunca solo en cliente).

### Formulario del proyecto (formData)

Campos según `mvp_docs/04-tipos-licencia-y-requisitos.md` §2.2: dirección exacta, zona, área de construcción (m²), niveles, uso, finca/folio/libro del RGP, NIT del propietario. El colegiado responsable se toma del perfil del solicitante autenticado. Municipio fijo: Guatemala (tenant único del MVP). Se guarda en `Application.formData` (JSONB).

### Documentos y almacenamiento

- **Upload** (`POST /applications/:id/documents?requirementId=`): multipart, solo el propietario y solo en estado `BORRADOR` u `OBSERVADO_FORMATO`. Al reemplazar un documento se incrementa `version` y el anterior queda `isCurrent = false`.
- **Validación de formato real:** detección de MIME por contenido con `file-type` (v16, última versión CommonJS) comparado contra `allowedMimeTypes` del requisito; nunca se confía en la extensión del cliente. Límite de 25 MB por archivo.
- **Almacenamiento:** disco local `backend/uploads/<tenantId>/<applicationId>/<uuid>.<ext>` en desarrollo (decisión D-007). El nombre de almacenamiento es un UUID impredecible; el nombre original solo se guarda como metadato.
- **Descarga/preview** (`GET /documents/:id/download`): endpoint autenticado que hace streaming del archivo (solo propietario o personal municipal del mismo tenant). El frontend abre PDF/JPG en pestaña nueva vía Blob URL; **DWG solo ofrece descarga** (la conversión a imagen requiere un servicio externo — ODA Converter o similar — y queda como pendiente documentado).

### Validación automática del expediente

- `POST /applications/:id/validate` — "Verificar antes de enviar": devuelve el informe por documento **sin cambiar el estado**.
- `POST /applications/:id/submit` — desde `BORRADOR` u `OBSERVADO_FORMATO`: ejecuta la misma validación; si todo es conforme → `EN_REVISION_TECNICA` (+ notificación a solicitante, admins y revisores); si falla → `OBSERVADO_FORMATO` + notificación al solicitante con el detalle.
- **Cambio de modelo:** `DocumentRequirement` gana el campo `stage` (`INGRESO` | `PAGO`). El requisito D-15 (comprobante de pago) se siembra con `stage = PAGO` y **no** se exige al enviar el expediente — se carga en la fase de pago (Fase 4).
- El detalle del expediente (`GET /applications/:id`) incluye el informe de validación calculado en vivo, para que el estado `OBSERVADO_FORMATO` sea visible tras recargar.

### Bandeja del revisor

`GET /applications` con filtros `status`, `from`, `to` (fechas). Solicitantes solo ven los propios; REVISOR/INSPECTOR/ADMIN ven todos los del tenant. Endpoint adicional `PATCH /applications/:id/assign` (solo ADMIN) para asignar revisor. La vista de detalle del revisor en esta fase es de **solo lectura** (descarga/preview de documentos); las observaciones llegan en la Fase 3.

### Notificaciones y auditoría

Módulo `notifications` (in-app; correo pendiente — decisión D-003): expediente enviado, fallo de validación, expediente en revisión, asignación de revisor. Cada transición queda en `AuditLog` (solo inserción) con usuario, acción y estados origen/destino.

### Frontend

- `/solicitante` — mis expedientes con estado y acceso al detalle; botón "Nueva solicitud".
- `/solicitante/nueva` — paso 1: checklist de onboarding pre-trámite con enlaces (POT/vu.muniguate.com, BIAWEB/VAC, SAT, solvencias); paso 2: clasificación (área, uso, Centro Histórico); paso 3: datos del proyecto → crea el borrador.
- `/solicitante/expedientes/[id]` — edición del formulario (solo en Borrador), tarjetas de los 15 requisitos con carga/reemplazo, informe de validación por documento, botones "Verificar antes de enviar" y "Enviar expediente".
- `/revisor` — bandeja con filtros por estado y rango de fechas.
- `/revisor/expedientes/[id]` — detalle de solo lectura con documentos (preview PDF/JPG, descarga DWG).
- Header compartido con navegación por rol y cierre de sesión.

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| `file-type` v17+ es ESM-only y rompe el build CommonJS de Nest | Se fija la dependencia en v16 (última CJS) — decisión D-008 |
| Previsualización DWG no viable sin conversor externo | DWG queda descarga-only en el MVP; pendiente documentado |
| D-15 exigible al enviar haría imposible todo envío | Campo `stage` en el requisito; D-15 se exige en fase de pago |

## Resultado de la verificación (2026-08-09)

Migración `add-requirement-stage` aplicada y seed re-ejecutado (D-15 → `PAGO`). Backend y frontend compilan sin errores. Pruebas extremo a extremo contra la API (todas exitosas):

1. Login del solicitante y catálogo: L-01 con sus 15 requisitos.
2. Creación de expediente válido → `BORRADOR`, formulario F08.
3. Proyecto de 900 m² → rechazado con HTTP 400 (clasificación).
4. Carga de los 14 documentos INGRESO → todos aceptados como `application/pdf`.
5. "Verificar antes de enviar" → 14/14 conformes.
6. Envío → transición a `EN_REVISION_TECNICA`.
7. Bandeja del revisor con filtro por estado → expediente visible.
8. Asignación del revisor por el Admin → notificación registrada.
9. Notificaciones in-app del solicitante.
10. Descarga de documento por el revisor (streaming autenticado, `application/pdf`).
11. Archivo con extensión `.jpg` y contenido PNG → rechazado con HTTP 400 (detección por contenido).
12. Planos con firma DWG (`AC10xx`) → aceptados como `image/vnd.dwg`.
13. Reemplazo de documento → versión incrementada (v3), la anterior deja de ser vigente.
14. Envío sin documentos → `OBSERVADO_FORMATO` con los 14 documentos observados.
15. Carga de documentos en un expediente ya enviado → rechazada con HTTP 400.

**Correcciones hechas durante la verificación:**
- `file-type` v16 lanza `End-Of-Stream` con buffers muy cortos: se agregó detección por firmas mínimas (`%PDF`, JPEG `FFD8FF`, PNG) como respaldo y manejo controlado (decisión D-009).
- `file-type` v16 no reconoce DWG: se detecta por la firma ASCII `AC` + versión (decisión D-009).
- Multer 1.x tenía vulnerabilidades reportadas por npm: se actualizó a `multer@2`.

## Plan de implementación

1. ✅ Este documento.
2. ✅ Migración: `stage` en `DocumentRequirement`; seed actualizado (D-15 → PAGO).
3. ✅ Backend: módulos `applications`, `documents`, `notifications`; registro en `AppModule`.
4. ✅ Frontend: páginas y componentes listados arriba.
5. ✅ Verificación: pruebas de API extremo a extremo y build de ambos proyectos.
6. ✅ Actualización de `Docs/status/` y `changelog.md`.
