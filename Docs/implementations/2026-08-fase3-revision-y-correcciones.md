# Fase 3 — Revisión Técnica, Observaciones y Correcciones

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completada y verificada
> **Fuente de alcance:** `mvp_docs/06-plan-mvp.md` Fase 3, `mvp_docs/03-flujo-expediente-digital.md` §4–§5

## Objetivo

Implementar el ciclo de revisión técnica: el revisor marca cada documento (Conforme / Con observación / Requiere reemplazo) con observaciones estructuradas (texto + prioridad), envía el expediente a corrección, el solicitante reemplaza solo los documentos observados, y el ciclo se repite hasta un máximo de rondas configurable (defecto 3). En la ronda final el revisor decide: aprobar (avanza a alineación territorial) o rechazar con dictamen.

## Diseño de la solución

### Modelo (sin migración: el esquema ya lo soporta)

- `ApplicationDocument.reviewStatus`: `PENDIENTE | CONFORME | CON_OBSERVACION | REQUIERE_REEMPLAZO`.
- `Observation`: vinculada al documento (opcional), con `round`, `priority` (ALTA/MEDIA/BAJA), `text`, `authorId`, `resolvedAt`.
- `Application.correctionRound` + `LicenseType.maxCorrectionRounds` gobiernan las rondas; `rejectedReason` guarda el dictamen de rechazo.

### Reglas del ciclo

- **Ronda actual de revisión** = `correctionRound + 1`. Las observaciones creadas en una revisión llevan ese número de ronda.
- **Marcar documento** (`POST /applications/:id/review-document`, rol REVISOR/ADMIN, estado `EN_REVISION_TECNICA`):
  - `CONFORME`: marca el documento y resuelve las observaciones pendientes de esa ronda para ese documento.
  - `CON_OBSERVACION` / `REQUIERE_REEMPLAZO`: exige texto y prioridad; crea la `Observation` y marca el documento.
- **Enviar a corrección** (`POST /applications/:id/send-to-correction`): exige al menos una observación sin resolver de la ronda actual y que **no** sea la ronda final. Efectos: `status = EN_CORRECCION`, `correctionRound + 1`, notificación al solicitante, auditoría.
- **Aprobar revisión técnica** (`POST /applications/:id/approve-review`): bloqueado si hay observaciones sin resolver en la ronda actual. Efectos: `status = ALINEACION_PROGRAMADA` (la programación de la visita se implementa en Fase 4), notificación al solicitante.
- **Rechazar** (`POST /applications/:id/reject`): disponible en cualquier ronda de revisión con dictamen obligatorio (mín. 20 caracteres) — el documento del flujo lo exige en la ronda final; se permite antes para casos inviables, quedando registrado el dictamen. Efectos: `status = RECHAZADO`, `rejectedReason`, notificación.
- **Ronda final:** cuando `correctionRound + 1 >= maxCorrectionRounds`, `send-to-correction` queda bloqueado: el revisor solo puede aprobar o rechazar (coincide con `03-flujo` §5).
- **Reenvío del solicitante** (`POST /applications/:id/resubmit`, estado `EN_CORRECCION`): exige que todos los documentos observados hayan sido reemplazados (su versión nueva nace con `reviewStatus = PENDIENTE`) y que la validación automática de formato siga pasando para todos los documentos de etapa INGRESO. Efectos: `status = EN_REVISION_TECNICA`, notificación al revisor asignado (o a todos los revisores si no hay asignado).

### Restricción de carga en corrección (módulo `documents`)

En estado `EN_CORRECCION` solo se pueden reemplazar los documentos cuyo `reviewStatus` es `CON_OBSERVACION` o `REQUIERE_REEMPLAZO`; el resto queda bloqueado (coincide con `03-flujo` §4).

### "Reemplazado" en verde para el revisor

El detalle del expediente marca cada documento vigente con `replacedAfterObservation: true` cuando fue cargado después de la última observación de su requisito, para que el revisor distinga lo que cambió respecto a la ronda anterior.

### Historial de rondas

El detalle incluye todas las observaciones ordenadas por ronda con autor y estado de resolución; el frontend las muestra agrupadas como "Historial de rondas", visible para solicitante y personal municipal.

### Frontend

- **Revisor** (`/revisor/expedientes/[id]`): por cada documento, botones Conforme / Observar / Requiere reemplazo (los dos últimos abren formulario con texto + prioridad); insignias de estado por documento y "Reemplazado" en verde; barra de acciones: Aprobar revisión técnica, Enviar a corrección, Rechazar (con dictamen); historial de rondas.
- **Solicitante** (`/solicitante/expedientes/[id]`): en `EN_CORRECCION`, panel de observaciones recibidas, carga habilitada solo en documentos observados (el resto con candado), botón "Reenviar correcciones" habilitado cuando todos fueron reemplazados; historial de rondas visible; en `RECHAZADO` se muestra el dictamen.

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| Ambigüedad "ronda 3" del doc de flujo | Regla explícita: se puede enviar a corrección mientras `correctionRound + 1 < maxCorrectionRounds`; en la ronda final solo aprobar/rechazar |
| Rechazo antes de la ronda final (no previsto explícitamente) | Permitido con dictamen obligatorio; queda documentado |
| Que el solicitante reenvíe sin reemplazar todo | El servidor lo bloquea: reenvío exige que ningún documento vigente siga marcado |

## Plan de implementación

1. ✅ Este documento.
2. ✅ Backend: módulo `review` (marcado, observaciones, aprobar/corregir/rechazar, reenvío) y ajuste de reglas de carga en `documents`.
3. ✅ Frontend: interfaz de revisión y vista de corrección del solicitante.
4. ✅ Verificación E2E: ciclo completo de 2 rondas + bloqueo de ronda final + rechazo.
5. ✅ Actualización de `Docs/status/` y `changelog.md`.

## Ajustes surgidos durante la verificación

- **Resolución de observaciones por requisito, no por versión:** la `Observation` referencia a la versión del documento observada, pero al reemplazarla el revisor confirma sobre la versión nueva (distinto `documentId`). Las consultas de resolución/sustitución filtran por `document.requirementId`. Registrado como decisión **D-010**.
- **Aprobación exige cero observaciones pendientes de cualquier ronda:** así el revisor confirma explícitamente (✅ Conforme) cada documento corregido antes de aprobar.

## Estado de verificación

✅ **Verificado el 2026-08-09** contra la API en ejecución (backend y frontend compilan sin errores). Pruebas E2E del ciclo completo, todas exitosas:

1. Revisor marca documento **CONFORME** (ronda 1).
2. Revisor marca documento **REQUIERE_REEMPLAZO** con texto y prioridad → observación creada.
3. `approve-review` con observación pendiente → **HTTP 400** ("Hay 1 observación(es) sin resolver").
4. `send-to-correction` → estado `EN_CORRECCION`, `correctionRound = 1`, notificación al solicitante.
5. Solicitante intenta reemplazar un documento **no observado** → **HTTP 400** ("solo se pueden reemplazar los documentos observados").
6. Solicitante reemplaza el documento observado → nueva versión v2 con `reviewStatus = PENDIENTE`.
7. `resubmit` → vuelve a `EN_REVISION_TECNICA`.
8. El detalle marca el documento con `replacedAfterObservation = true` (distintivo verde para el revisor).
9. Revisor marca la versión nueva como CONFORME → la observación de la ronda 1 queda **resuelta**.
10. Ronda 2: nueva observación en otro documento → `send-to-correction` (ronda 2) → solicitante reemplaza → reenvío.
11. Ronda 3 (final): `send-to-correction` → **HTTP 400** ("última ronda: aprobar o rechazar").
12. Revisor confirma el documento corregido y `approve-review` → `ALINEACION_PROGRAMADA` (notificación al solicitante).
13. Rechazo con dictamen corto → **HTTP 400** (mín. 20 caracteres).
14. Rechazo con dictamen válido sobre un segundo expediente en revisión → `RECHAZADO` con `rejectedReason`, notificación visible para el solicitante.
