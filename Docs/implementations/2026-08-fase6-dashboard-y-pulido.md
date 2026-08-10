# Fase 6 — Dashboard del Admin, Swagger y Pulido de Seguridad

> **Fecha:** Agosto 2026
> **Estado:** ✅ Completada y verificada
> **Fuente de alcance:** `Docs/mvp_docs/06-plan-mvp.md` Fase 6

## Objetivo

Cerrar el MVP con un panel de métricas para el Admin (expedientes por estado, tiempos promedio por fase, documentos más observados), documentación OpenAPI de la API y un checklist OWASP Top 10 del estado de seguridad actual. Incluye ajustes menores de UX (entrada del Admin al dashboard, navegación).

## Diseño

### Módulo `reports` (solo ADMIN)

`GET /reports/dashboard` → payload:

| Bloque | Fuente |
| :--- | :--- |
| `summary` | Totales: expedientes, licencias emitidas, en corrección, pendientes de pago, usuarios pendientes de aprobación |
| `byStatus` | `groupBy` de `Application.status` del tenant |
| `avgDaysByPhase` | Derivado de `AuditLog` con `fromStatus`/`toStatus`: duración media (días) que los expedientes permanecen en cada estado |
| `topObservedDocuments` | Top 10 requisitos por conteo de `Observation` con documento (código + nombre + total) |
| `recentActivity` | Últimas 15 entradas de auditoría del tenant |

### Frontend

- `/admin` — dashboard con KPIs, barras por estado, tabla de tiempos, ranking de documentos observados, actividad reciente.
- Header del Admin: enlace **Dashboard** + Usuarios + Expedientes.
- Redirección post-login del Admin → `/admin`.

### Swagger / OpenAPI

- `@nestjs/swagger` en el bootstrap (`/api/docs`), documentado con tags por módulo.
- Decoradores ligeros en controllers principales (summary + roles); no se anota DTO por DTO en esta fase.

### Seguridad (OWASP)

- Documento `Docs/security/owasp-checklist.md` con el estado frente al Top 10 y residuales conocidos del MVP.

### UX menor

- Página de usuarios del Admin usa el `Header` compartido (consistencia con el resto del portal).

## Plan

1. ✅ Este documento.
2. ✅ Backend `reports` + Swagger.
3. ✅ Frontend dashboard + navegación.
4. ✅ Checklist OWASP.
5. ✅ Verificación + Docs/status/changelog.

## Dependencias nuevas

- `@nestjs/swagger@7` + `swagger-ui-express` (compatible con NestJS 10).

## Estado de verificación

✅ **Verificado el 2026-08-10.** Backend y frontend compilan.

1. `GET /reports/dashboard` como Admin → summary, byStatus, avgDaysByPhase, topObservedDocuments, recentActivity (datos reales del tenant de prueba).
2. Mismo endpoint como Solicitante → HTTP 403.
3. Swagger UI en `http://localhost:3001/api/docs` → HTTP 200.
4. Frontend: ruta `/admin` en el build; Header del Admin con Dashboard / Usuarios / Expedientes.
