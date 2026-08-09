# Estructura del Proyecto

> Última actualización: Agosto 2026

```
c:\building_permits\
├── Docs/                → Documentación oficial (protocolo de trabajo)
│   ├── status/          → Estado, estructura, arquitectura y decisiones
│   ├── implementations/ → Planes/historial de cada implementación
│   └── changelog.md
├── context_tramits/     → Contexto de dominio: trámites de construcción en Guatemala (referencia, no código)
├── mvp_docs/            → Propuesta del MVP: visión, roles, flujo, requisitos, plan (referencia)
├── backend/             → API REST (NestJS + Prisma + PostgreSQL)
└── frontend/            → Portal web (Next.js App Router + Tailwind)
```

## backend/

| Ruta | Propósito |
| :--- | :--- |
| `prisma/schema.prisma` | Modelo de datos completo del MVP (tenants, usuarios, tipos de licencia, expedientes, documentos, observaciones, inspecciones, pagos, licencias, notificaciones, auditoría) |
| `prisma/seed.ts` | Seed: tenant Guatemala, usuarios de prueba de cada rol, L-01 con requisitos D-01…D-15 |
| `src/main.ts` | Bootstrap: prefijo `/api`, CORS, ValidationPipe global |
| `src/app.module.ts` | Módulo raíz; registra guards globales (JWT + roles) |
| `src/prisma/` | `PrismaService` global (conexión a BD) |
| `src/auth/` | Registro, login, refresh (rotatorio), logout; estrategia JWT; guards `JwtAuthGuard`/`RolesGuard`; decoradores `@Public()`, `@Roles()`, `@CurrentUser()` |
| `src/users/` | Gestión de usuarios por el Admin: listar, crear internos, aprobar solicitantes, activar/desactivar |
| `src/applications/` | Expedientes: creación con clasificación F08, listados con filtros, detalle con informe de validación, validar/enviar, asignación de revisor |
| `src/documents/` | Carga de documentos con detección de MIME por contenido, versionado, descarga autenticada; `StorageService` (disco local, único punto de contacto con el FS); en `EN_CORRECCION` solo acepta reemplazos de documentos observados |
| `src/review/` | Revisión técnica: marcar documentos (✅/⚠️/❌ con texto y prioridad), enviar a corrección, aprobar, rechazar con dictamen y reenvío del solicitante; reglas de rondas (D-010) |
| `src/notifications/` | Notificaciones in-app (listar, contador de no leídas, marcar leída) |
| `uploads/` | Archivos subidos en desarrollo (no versionado) |
| `.env.example` | Variables de entorno documentadas |

Módulos futuros previstos (fases 4+): `inspections`, `payments`, `reports` (ver `mvp_docs/05-arquitectura-y-stack.md` §4).

## frontend/

| Ruta | Propósito |
| :--- | :--- |
| `src/app/layout.tsx` | Layout raíz (idioma es, metadata) |
| `src/app/page.tsx` | Redirección según sesión y rol |
| `src/app/login/` | Inicio de sesión |
| `src/app/registro/` | Registro de solicitante (profesional colegiado) |
| `src/app/admin/usuarios/` | Panel del Admin: aprobar solicitantes, crear/activar/desactivar usuarios |
| `src/app/solicitante/` | Dashboard del solicitante (sus expedientes) |
| `src/app/solicitante/nueva/` | Asistente: onboarding pre-trámite → clasificación F08 → datos del proyecto |
| `src/app/solicitante/expedientes/[id]/` | Expediente: datos, carga/verificación/envío; en corrección, panel de observaciones y reemplazo solo de los documentos observados; historial de rondas |
| `src/app/revisor/` | Bandeja de expedientes con filtros por estado y fecha (revisor y admin) |
| `src/app/revisor/expedientes/[id]/` | Revisión documental: marcado ✅/⚠️/❌ con formulario de observación, acciones de aprobar/corregir/rechazar, distintivo verde de reemplazados, historial de rondas |
| `src/components/` | `Header` (navegación por rol), `StatusBadge` (etiquetas de estado), `RoundsHistory` (observaciones agrupadas por ronda) |
| `src/lib/api.ts` | Cliente HTTP con Bearer token, refresh automático, upload multipart y descarga como Blob |
| `src/lib/constants.ts` | Etiquetas/colores de estados, zonas de Guatemala, enlaces del onboarding |
| `src/lib/auth-store.ts` | Estado de sesión (Zustand, persistido en localStorage) |

## Relación entre módulos

El frontend consume exclusivamente la API REST del backend (`NEXT_PUBLIC_API_URL`). El backend es la única capa que toca la base de datos. `mvp_docs/` y `context_tramits/` son documentación de referencia del producto y del dominio; `Docs/` es la documentación viva del código.
