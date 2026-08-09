# Fase 4 — Alineación Territorial, Pago (simulado) y Recepción de Obra

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completada y verificada
> **Fuente de alcance:** `Docs/mvp_docs/06-plan-mvp.md` Fase 4, `Docs/mvp_docs/03-flujo-expediente-digital.md` §4 (ALINEACIÓN, PENDIENTE DE PAGO, RECEPCIÓN DE OBRA)

## Objetivo

Completar el tramo medio del ciclo de vida del expediente: inspección de alineación territorial con agenda coordinada, cálculo de la tasa municipal F08, pago simulado con comprobante (o carga de comprobante externo D-15), confirmación del pago por la municipalidad, y el módulo post-licencia de Recepción de Obra. Sin cambios de esquema: los modelos `Inspection` y `Payment` ya existen.

## Diseño de la solución

### 1. Alineación territorial (módulo `inspections`)

Flujo coordinado (doc 03 §4):

1. **Solicitud** — `POST /applications/:id/inspections` (REVISOR/ADMIN), solo con expediente en `ALINEACION_PROGRAMADA` y sin otra inspección de alineación activa. Se crea `Inspection(type=ALINEACION, status=SOLICITADA)` y se notifica a todos los inspectores del tenant.
2. **Propuesta de fechas** — `POST /inspections/:id/propose-dates` (INSPECTOR): 1 a 3 fechas futuras; el inspector que propone queda asignado (`inspectorId`); estado → `FECHAS_PROPUESTAS`; notificación al solicitante.
3. **Confirmación** — `POST /inspections/:id/confirm-date` (SOLICITANTE propietario): la fecha debe ser una de las propuestas; estado → `CONFIRMADA`; notificación a solicitante e inspector.
4. **Resultado** — `POST /inspections/:id/result` (INSPECTOR asignado, multipart): `result` (CONFORME/NO_CONFORME) + `note` + **foto obligatoria** (guardada vía `StorageService`, registrada en `photoPaths`); estado → `REALIZADA`.
   - **CONFORME** → expediente pasa a `PENDIENTE_DE_PAGO` y se crea el `Payment` con la tasa calculada. Notificaciones: solicitante (alineación conforme + monto) y revisor.
   - **NO_CONFORME** → expediente regresa a `EN_REVISION_TECNICA` con una `Observation` **general** (sin documento) que contiene la nota del inspector. Notificaciones: solicitante y revisor.

### 2. Observaciones generales (extensión de D-010 → D-011)

Las observaciones de inspección no están ligadas a un documento. Regla: **no bloquean** `approve-review` (que sigue exigiendo cero pendientes **documentales**) y se **resuelven automáticamente al aprobar** la revisión siguiente — el revisor las da por atendidas al re-aprobar. En el historial se muestran con la etiqueta "General". (Si bloquearan sin forma manual de resolverlas, el expediente quedaría atascado.)

### 3. Tasa municipal F08 (módulo `payments`)

- Fórmula configurable por tipo de licencia (`LicenseType.feeFormula`, seed: `{ base: 500, porcentajePresupuesto: 0.001 }`, valores provisionales): **tasa = base + presupuestoEstimado × porcentaje**.
- El formulario del proyecto incorpora el campo opcional `presupuestoEstimadoQ` (ya existía el documento D-12 "presupuesto de obra"; el dato estructurado alimenta la fórmula). Expedientes antiguos sin el dato: se calcula solo la base y el desglose lo indica.
- `Payment.breakdown` guarda el desglose completo (base, porcentaje, presupuesto, total) para transparencia.

### 4. Pago

- **Pago simulado** (decisión D-004) — `POST /applications/:id/pay-simulated` (SOLICITANTE propietario, estado `PENDIENTE_DE_PAGO`): genera un **comprobante PDF** (PDF mínimo de una página generado en código, sin librerías nuevas), lo guarda vía `StorageService`, lo registra como documento **D-15** del expediente y lo fija en `Payment.receiptPath`.
- **Comprobante externo** — el solicitante sube D-15 por el endpoint de documentos; se habilita la carga de requisitos de etapa `PAGO` únicamente cuando el expediente está en `PENDIENTE_DE_PAGO` (los de ingreso quedan bloqueados en ese estado).
- **Confirmación** — `POST /applications/:id/confirm-payment` (REVISOR/ADMIN): exige D-15 cargado; fija `confirmedById/confirmedAt`, el expediente pasa a `LICENCIA_EMITIDA` (la generación del PDF de la licencia con QR es Fase 5) y se notifica al solicitante.
- `GET /applications/:id/payment` — propietario o personal municipal: monto y desglose.

### 5. Recepción de Obra (post-licencia)

- **Solicitud** — `POST /applications/:id/request-recepcion` (SOLICITANTE propietario, estado `LICENCIA_EMITIDA`, sin otra recepción activa): crea `Inspection(type=RECEPCION_OBRA)` y el expediente pasa a `RECEPCION_DE_OBRA`.
- Reutiliza el mismo ciclo de agenda (propuesta → confirmación → resultado con foto).
  - **CONFORME** → expediente `CERRADO` (fin del ciclo; el certificado de recepción como documento queda fuera del MVP). Notificaciones: solicitante + Admin.
  - **NO_CONFORME** → el expediente permanece en `RECEPCION_DE_OBRA` con la nota registrada; el solicitante puede solicitar una nueva visita.

### Frontend

- **`/inspector` (nuevo):** agenda con secciones por estado; propuesta de fechas (hasta 3), formulario de resultado con foto; acceso directo al expediente. `Header` y la redirección de `/` incluyen el rol INSPECTOR.
- **Revisor:** botón "Solicitar inspección de alineación" en `ALINEACION_PROGRAMADA`; sección de inspecciones; tarjeta de pago con desglose y botón "Confirmar pago" en `PENDIENTE_DE_PAGO`.
- **Solicitante:** tarjeta de inspección (elegir fecha propuesta / ver fecha confirmada / resultado); tarjeta de pago con monto, desglose, banner **SIMULACIÓN**, botón de pago simulado y carga de D-15 habilitada; botón "Solicitar recepción de obra" en `LICENCIA_EMITIDA`; avisos de estado para los nuevos estados.
- **Asistente de nueva solicitud:** campo "Presupuesto estimado de obra (Q)".

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| PDF de comprobante generado a mano (sin librería) | Plantilla PDF mínima validada (una página, texto plano); se reemplazará por generador formal en Fase 5 para la licencia |
| Expedientes antiguos sin `presupuestoEstimadoQ` | Cálculo con base únicamente, desglose lo explicita |
| Observación general sin resolver podría atascar la aprobación | Regla explícita: las generales no bloquean `approve-review` y se resuelven al aprobar |

## Plan de implementación

1. ✅ Este documento.
2. ✅ Backend: `inspections` + `payments` + ajustes (upload D-15, observaciones generales, `presupuestoEstimadoQ`).
3. ✅ Frontend: agenda del inspector y secciones nuevas en expediente (revisor/solicitante) + wizard.
4. ✅ Verificación E2E: alineación conforme → pago simulado → confirmación → recepción → cierre; rama NO_CONFORME; comprobante externo.
5. ✅ Actualización de `Docs/status/` y `changelog.md`.

## Ajustes surgidos durante la verificación

- **Confirmación de pago con comprobante externo:** la primera versión exigía `Payment.receiptPath`, que solo fija el pago simulado; con comprobante externo (D-15 subido por el solicitante) la confirmación fallaba. Corregido: el **documento D-15 vigente es la fuente de verdad** y `receiptPath` se rellena desde él si venía vacío (decisión D-012).

## Estado de verificación

✅ **Verificado el 2026-08-09** contra la API en ejecución (backend y frontend compilan sin errores). Pruebas E2E, todas exitosas:

**Flujo feliz (expediente sin presupuesto):**
1. Revisor solicita inspección de alineación → `SOLICITADA`; duplicado bloqueado (HTTP 400).
2. Inspector la ve en su agenda; propone 3 fechas → `FECHAS_PROPUESTAS`, queda asignado.
3. Solicitante confirma fecha no propuesta → **HTTP 400**; confirma fecha válida → `CONFIRMADA` (notificaciones a ambas partes).
4. Inspector registra resultado CONFORME con foto (multipart) → expediente `PENDIENTE_DE_PAGO`, cobro creado: **Q 500.00** (solo base, sin presupuesto; el desglose lo indica).
5. Pago simulado → comprobante PDF generado (verificado: inicia `%PDF-`, termina `%%EOF`) y adjuntado como **D-15**; segundo pago bloqueado (400).
6. Revisor confirma el pago → `LICENCIA_EMITIDA`; carga de documentos de ingreso bloqueada en ese estado.
7. Solicitante pide recepción de obra → `RECEPCION_DE_OBRA` → propuesta/confirmación → resultado CONFORME con foto → expediente **CERRADO**.

**Rama NO_CONFORME + comprobante externo (expediente con presupuesto Q 350,000):**
8. Alineación NO_CONFORME → expediente regresa a `EN_REVISION_TECNICA` con observación **general** ALTA ("Inspección… NO CONFORME: …").
9. Revisor re-aprueba → la observación general se resuelve automáticamente → `ALINEACION_PROGRAMADA`.
10. Segunda inspección CONFORME → cobro **Q 850.00** = 500 base + 350 variable (0.1% × 350,000) ✓ fórmula.
11. Solicitante sube comprobante externo D-15 (sin pago simulado) → revisor confirma → `LICENCIA_EMITIDA`, `receiptPath` rellenado desde el documento.
