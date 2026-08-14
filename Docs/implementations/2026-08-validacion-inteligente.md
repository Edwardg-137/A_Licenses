# Validación inteligente del formulario y documentos

> **Fecha:** Agosto 2026
> **Estado:** Completado
> **Fuente:** plan de validación inteligente (D-017)

## Objetivo

Comprobar que los datos del paso 3 (NIT, dirección) y los archivos del paso 4 (D-01…D-21) sean plausibles **antes** de la revisión técnica humana, sin sustituir al revisor.

## Opciones elegidas (D-017)

- NIT: algoritmo local SAT (A1)
- Dirección: Google Geocoding (A5) con heurística (A4) si no hay API key
- Motor documental: calidad local + Gemini Flash (B1)
- Consistencia: avisos al revisor (C1); `fail` de alta confianza bloquea envío

## Arquitectura

Módulo Nest `content-validation` con adaptadores (`nit`, `address`, `quality`, `vision.gemini`, `cross-check`). Persistencia:

- `Application.formValidation` (JSON)
- `ApplicationDocument.contentCheck` (JSON)

`POST /applications/validate-form` valida el paso 3 sin crear expediente. El upload analiza el archivo y guarda el resultado. `validate`/`submit` incorporan `fail` de contenido y cruces con `formData`.

## Componentes

- Backend: `backend/src/content-validation/*`, enganche en `applications` y `documents`
- Frontend: `CheckPill`, paso 3 del asistente, tarjetas de documentos del solicitante y del revisor
- Variables: `GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (por defecto `gemini-3.6-flash`; 2.0/2.5 Flash ya no aceptan claves nuevas)

## Riesgos

- Sin claves, la visión no corre (aviso `warn`).
- Gemini recibe PII si se configura la clave.
- DWG no se analiza por visión.
- El geocoder de Google a menudo no resuelve numeración en GT: desajuste de zona es `warn`, no `fail`.
