# Estructura del Proyecto

> Última actualización: Agosto 2026

```
c:\building_permits\
├── Docs/                → Documentación oficial (protocolo de trabajo)
│   ├── status/          → Estado, estructura, arquitectura y decisiones
│   ├── implementations/ → Planes/historial de cada implementación
│   └── changelog.md
├── docker-compose.yml   → Stack Docker: db + backend + frontend (D-013)
├── .env.example         → Variables para Compose (copiar a `.env` si se personaliza)
├── context_tramits/     → Contexto de dominio: trámites de construcción en Guatemala (referencia, no código)
├── mvp_docs/            → Propuesta del MVP: visión, roles, flujo, requisitos, plan (referencia)
├── backend/             → API REST (NestJS + Prisma + PostgreSQL)
└── frontend/            → Portal web (Next.js App Router + Tailwind)
```

## Raíz (Docker)

| Ruta | Propósito |
| :--- | :--- |
| `docker-compose.yml` | Orquesta Postgres 16 (`db`, puerto host 5433), API y portal |
| `.env.example` | Plantilla de variables del compose (secretos JWT, puertos, `RUN_SEED`, etc.) |
| `.gitattributes` | Fuerza LF en scripts shell usados dentro de contenedores Linux |

## backend/

| Ruta | Propósito |
| :--- | :--- |
| `prisma/schema.prisma` | Modelo de datos completo del MVP (tenants, usuarios, tipos de licencia, expedientes, documentos, observaciones, inspecciones, pagos, licencias, notificaciones, auditoría) |
| `prisma/seed.ts` | Seed: tenant Guatemala, 2 usuarios por rol, L-01 (F08, D-01…D-15) y L-02 (F02, D-01…D-21 opcionales D-16…) |
| `prisma/tsconfig.json` | tsconfig del seed (CommonJS) para `ts-node` en Docker/local |
| `Dockerfile` / `docker-entrypoint.sh` | Imagen API: migrate deploy + seed opcional + `node dist/main.js` |
| `src/main.ts` | Bootstrap: prefijo `/api`, CORS, ValidationPipe global |
| `src/app.module.ts` | Módulo raíz; registra guards globales (JWT + roles) |
| `src/prisma/` | `PrismaService` global (conexión a BD) |
| `src/auth/` | Registro, login, refresh (rotatorio), logout; estrategia JWT; guards `JwtAuthGuard`/`RolesGuard`; decoradores `@Public()`, `@Roles()`, `@CurrentUser()` |
| `src/users/` | Gestión de usuarios por el Admin: listar, crear internos, aprobar solicitantes, activar/desactivar |
| `src/applications/` | Expedientes: clasificación F08/F02 (`classification.ts`), creación, listados, validar/enviar, asignación de revisor |
| `src/documents/` | Carga de documentos con detección de MIME por contenido, versionado, descarga autenticada; `StorageService` (disco local, único punto de contacto con el FS); en `EN_CORRECCION` solo acepta reemplazos de documentos observados |
| `src/review/` | Revisión técnica: marcar documentos (✅/⚠️/❌ con texto y prioridad), enviar a corrección, aprobar, rechazar con dictamen y reenvío del solicitante; reglas de rondas (D-010, D-011) |
| `src/inspections/` | Inspecciones (alineación territorial y recepción de obra): solicitud, propuesta de hasta 3 fechas, confirmación por el solicitante, resultado con foto obligatoria; agenda del inspector |
| `src/payments/` | Cálculo de tasa F08 (`LicenseType.feeFormula`), pago simulado con comprobante PDF generado en código (`receipt-pdf.ts`), confirmación municipal (D-012); al confirmar dispara la emisión de licencia |
| `src/licenses/` | Emisión de licencia (PDF con `pdf-lib` + QR), correlativo `LC-GT-YYYY-NNNNNN`, descarga autenticada, verificación pública por token, backfill `issue-license` |
| `src/reports/` | Métricas del dashboard Admin: conteos por estado, tiempos promedio, documentos más observados, actividad reciente |
| `src/notifications/` | Notificaciones in-app (listar, contador de no leídas, marcar leída) |
| `uploads/` | Archivos subidos en desarrollo (no versionado) |
| `.env.example` | Variables de entorno documentadas |

Módulos previstos del plan MVP: todos implementados (auth, users, applications, documents, review, inspections, payments, licenses, reports, notifications).

## frontend/

| Ruta | Propósito |
| :--- | :--- |
| `src/app/layout.tsx` | Layout raíz (idioma es, metadata) |
| `next.config.mjs` | App Router; `output: 'standalone'` para imagen Docker |
| `Dockerfile` | Build multi-etapa de la imagen del portal |
| `src/app/page.tsx` | Redirección según sesión y rol |
| `src/app/login/` | Inicio de sesión |
| `src/app/registro/` | Registro de solicitante (profesional colegiado) |
| `src/app/admin/` | Dashboard de métricas del Admin (KPIs, estados, tiempos, documentos observados, actividad) |
| `src/app/admin/usuarios/` | Panel del Admin: aprobar solicitantes, crear/activar/desactivar usuarios |
| `src/app/solicitante/` | Dashboard del solicitante (sus expedientes) |
| `src/app/solicitante/nueva/` | Asistente: onboarding → clasificación F08/F02 → datos del proyecto (campos extra F02) |
| `src/lib/classification.ts` | Espejo de la regla de clasificación del backend |
| `src/app/solicitante/expedientes/[id]/` | Expediente: datos, carga/verificación/envío; corrección; visitas; pago; descarga de licencia PDF + enlace de verificación; solicitud de recepción de obra; historial de rondas |
| `src/app/revisor/` | Bandeja de expedientes con filtros por estado y fecha (revisor y admin) |
| `src/app/revisor/expedientes/[id]/` | Revisión documental, alineación, confirmación de pago (emite licencia), descarga/backfill de licencia, historial de rondas e inspecciones |
| `src/app/inspector/` | Agenda del inspector: solicitudes pendientes, propuesta de fechas, registro de resultado con foto de evidencia |
| `src/app/verificar/[token]/` | Vista pública de verificación de licencia por QR (sin login) |
| `src/components/` | `Header` (navegación por rol), `StatusBadge` (etiquetas de estado), `RoundsHistory` (observaciones agrupadas por ronda) |
| `src/lib/api.ts` | Cliente HTTP con Bearer token, refresh automático, upload multipart y descarga como Blob |
| `src/lib/constants.ts` | Etiquetas/colores de estados, zonas de Guatemala, enlaces del onboarding |
| `src/lib/auth-store.ts` | Estado de sesión (Zustand, persistido en localStorage) |

## Relación entre módulos

El frontend consume exclusivamente la API REST del backend (`NEXT_PUBLIC_API_URL`). El backend es la única capa que toca la base de datos. `mvp_docs/` y `context_tramits/` son documentación de referencia del producto y del dominio; `Docs/` es la documentación viva del código.
