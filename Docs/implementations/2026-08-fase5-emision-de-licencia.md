# Fase 5 — Emisión de Licencia (PDF + QR) y Verificación Pública

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completada y verificada
> **Fuente de alcance:** `Docs/mvp_docs/06-plan-mvp.md` Fase 5, `Docs/mvp_docs/03-flujo-expediente-digital.md` § LICENCIA EMITIDA
> **Decisión de diseño:** Opción 1 — la licencia se emite **automáticamente** al confirmar el pago (misma operación de negocio: confirmar pago → generar PDF + registro `License` → notificar).

## Objetivo

Al confirmar la recepción del pago, el sistema genera el PDF oficial de la licencia de construcción con número correlativo único y código QR de verificación pública; el solicitante puede descargarlo y cualquier persona puede validar la licencia desde la URL del QR sin autenticarse.

## Diseño de la solución

### Emisión (opción 1)

`PaymentsService.confirmPayment` llama a `LicensesService.issueForApplication` tras confirmar el cobro:

1. Número correlativo: `LC-{TENANT_SLUG_UPPER}-{YYYY}-{NNNNNN}` (ej. `LC-GT-2026-000001`), con reintento si choca el unique.
2. `qrToken`: UUID aleatorio (no adivinable).
3. PDF generado con **pdf-lib** (texto + QR PNG embebido vía `qrcode`). Contenido: municipalidad, número, datos del proyecto, profesional responsable, fecha de emisión, vigencia (1 año desde emisión, configurable), URL de verificación.
4. Archivo guardado con `StorageService`; registro `License` creado.
5. Notificaciones: solicitante (“Licencia emitida” con número) + Admin del tenant. Correo con adjunto aplazado (D-003).

Idempotencia: si ya existe `License` para el expediente, no se regenera.

### Endpoints

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| (interno) | `LicensesService.issueForApplication` | — | Llamado desde confirm-payment |
| `GET` | `/applications/:id/license` | JWT propietario/staff | Metadatos de la licencia |
| `GET` | `/applications/:id/license/download` | JWT propietario/staff | Descarga del PDF |
| `GET` | `/licenses/verify/:token` | `@Public()` | Datos públicos de verificación |
| `POST` | `/applications/:id/issue-license` | REVISOR/ADMIN | Backfill: emite si el expediente está en `LICENCIA_EMITIDA` sin registro (expedientes de prueba de Fase 4) |

### Frontend

- Vista del solicitante/revisor: número de licencia, botón “Descargar licencia (PDF)”, enlace a la verificación.
- Página pública `/verificar/[token]`: sin login; muestra validez, número, datos básicos del proyecto y municipalidad.

### Configuración

- `PUBLIC_APP_URL` (backend): base de la URL embebida en el QR (defecto `http://localhost:3000`).

## Plan

1. ✅ Este documento.
2. ✅ Backend: módulo `licenses` + enganche en `confirm-payment`.
3. ✅ Frontend: descarga + verificación pública.
4. ✅ Verificación E2E.
5. ✅ Docs/status + changelog.

## Dependencias nuevas

- `pdf-lib` — generación del PDF de licencia.
- `qrcode` (+ `@types/qrcode`) — PNG del QR embebido en el PDF.

## Estado de verificación

✅ **Verificado el 2026-08-10** (backend y frontend compilan). Pruebas E2E:

1. Flujo hasta pago simulado → `confirm-payment` emite licencia en el mismo acto (`LICENCIA_EMITIDA` + número correlativo).
2. Metadatos `GET /applications/:id/license` con `verifyUrl`.
3. Descarga PDF (`%PDF-`, ~4.7 KB con QR embebido).
4. Verificación pública `GET /licenses/verify/:token` sin auth → `valid=true`, datos del proyecto y profesional.
5. Token inválido → HTTP 404.
6. `POST /issue-license` idempotente (mismo número).
7. Backfill sobre expediente `CERRADO` de Fase 4 sin licencia → `LC-GT-2026-000001`.
8. Prefijo de correlativo: slug `guatemala` → `GT` (no `GUAT`).
