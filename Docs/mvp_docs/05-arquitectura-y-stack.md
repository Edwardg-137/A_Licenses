# Arquitectura y Stack Tecnológico

## 1. Decisión sobre el Stack

Teniendo en cuenta las preferencias del cliente (Flutter Web / React) y los requerimientos de la plataforma (multi-rol, multi-municipio en el futuro, gestión documental, notificaciones en tiempo real), se recomienda el siguiente stack:

> **✅ Decisión confirmada (agosto 2026):** el stack elegido es **React + Next.js (frontend) / NestJS + PostgreSQL (backend)**. La sección 6 (alternativa Flutter Web) se conserva únicamente como registro de la evaluación.

### Decisión: React + Next.js (Frontend) / Node.js + PostgreSQL (Backend)

**¿Por qué no Flutter Web para este caso?**
Flutter Web es excelente para aplicaciones con lógica compleja de UI (dashboards, apps móviles convertidas a web). Sin embargo, para una plataforma con tablas de datos, gestión documental, formularios complejos y necesidad de buen SEO en vistas públicas, **React/Next.js ofrece mejor ecosistema, rendimiento y facilidad de mantenimiento**. Se documenta la alternativa Flutter Web al final de esta sección para evaluación del cliente.

---

## 2. Stack Recomendado

### Frontend: Next.js (React)
- **Framework:** Next.js 14+ (App Router)
- **UI Components:** shadcn/ui + Tailwind CSS (componentes accesibles y rápidos de implementar)
- **Gestión de estado:** Zustand (simple, ligero para este tipo de app)
- **Visualización de PDFs:** react-pdf
- **Preview de planos DWG:** dwg-canvas o conversión a PNG en backend
- **Notificaciones en tiempo real:** WebSockets (socket.io) o Supabase Realtime
- **Iconografía:** Lucide React

### Backend: Node.js + Express (o NestJS)
- **Runtime:** Node.js 20 LTS
- **Framework API:** NestJS (TypeScript, estructura modular — ideal para escalar a multi-municipio)
- **ORM:** Prisma (con PostgreSQL)
- **Autenticación:** JWT + Refresh Tokens; bcrypt para contraseñas
- **Subida de archivos:** Multer → almacenamiento en AWS S3 o MinIO (self-hosted)
- **Validación de documentos:** Detección de MIME type real (no solo extensión) con `file-type` library
- **Generación de PDF de licencia:** Puppeteer o PDFKit
- **Cola de notificaciones:** BullMQ (Redis) para emails y notificaciones async
- **Email:** Nodemailer + SMTP o SendGrid

### Base de Datos
- **Principal:** PostgreSQL 15 (JSONB para configuraciones flexibles de tipos de licencia)
- **Cache / Colas:** Redis 7
- **Almacenamiento de archivos:** AWS S3 o MinIO (auto-hosted para municipalidades con presupuesto limitado)

### Infraestructura (MVP)
- **Hosting:** Railway.app o Render (bajo costo, fácil de operar para MVP)
- **Alternativa escalable:** AWS EC2 + RDS + S3 (cuando escale a multi-municipio)
- **CI/CD:** GitHub Actions
- **Variables de entorno:** .env por ambiente (dev / staging / producción)

---

## 3. Arquitectura Multi-Municipio (Diseño desde el Inicio)

Aunque el MVP opera para una sola municipalidad, la base de datos y la API se diseñan con **tenant isolation** desde el inicio para facilitar la expansión.

```
┌──────────────────────────────────────────────────────────┐
│                    PERMISSOGT SAAS                       │
│                                                          │
│  ┌─────────────────┐   ┌─────────────────┐              │
│  │  Municipalidad  │   │  Municipalidad  │  (Fase 2+)   │
│  │   Guatemala     │   │   Villa Nueva   │              │
│  │  tenant_id: 1   │   │  tenant_id: 2   │              │
│  └────────┬────────┘   └────────┬────────┘              │
│           │                     │                        │
│           └──────────┬──────────┘                        │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  API (NestJS)  │                          │
│              │  tenant-aware  │                          │
│              └───────┬────────┘                          │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  PostgreSQL    │                          │
│              │  (schema per   │                          │
│              │   tenant)      │                          │
│              └────────────────┘                          │
└──────────────────────────────────────────────────────────┘
```

**Estrategia de aislamiento:** Schema por tenant en PostgreSQL. Cada municipalidad tiene su propio schema (`municipalidad_gt`, `municipalidad_villa_nueva`), compartiendo la misma instancia de base de datos pero con datos completamente separados.

---

## 4. Módulos de la API

| Módulo | Responsabilidad |
| :--- | :--- |
| `auth` | Login, registro, refresh token, roles |
| `users` | CRUD de usuarios por tenant |
| `tenants` | Gestión de municipalidades (superadmin) |
| `licenses` | Tipos de licencia y configuración de requisitos |
| `applications` | Expedientes: CRUD, cambios de estado |
| `documents` | Upload, validación, descarga de archivos |
| `observations` | Observaciones vinculadas a documentos |
| `inspections` | Agenda, confirmación, resultado de visitas |
| `payments` | Cálculo de tasa, registro de comprobante |
| `notifications` | Sistema de notificaciones in-app y email |
| `reports` | Métricas y exportación de datos para el admin |

---

## 5. Seguridad

- **Autenticación:** JWT con expiración corta (15 min) + Refresh Token (7 días).
- **Autorización:** Guard por rol + verificación de tenant en cada endpoint.
- **Archivos:** Los archivos se almacenan con nombres UUID (no predecibles). Las URLs de descarga son **presigned URLs** con expiración (S3/MinIO), nunca URLs públicas permanentes.
- **Validación de archivos:** Verificación de MIME type real en el servidor (no se confía en la extensión del cliente).
- **Rate limiting:** Límite de peticiones por IP y por usuario para prevenir abuso.
- **HTTPS:** Obligatorio en todos los ambientes (Let's Encrypt).

---

## 6. Alternativa Flutter Web (Evaluación)

| Criterio | React/Next.js | Flutter Web |
| :--- | :--- | :--- |
| Tablas y gestión documental | Excelente (ecosistema maduro) | Aceptable |
| Rendimiento inicial (carga) | Muy bueno (SSR/SSG) | Regular (bundle grande) |
| SEO (vista pública de licencias) | Nativo (SSR) | Requiere workarounds |
| Ecosistema de librerías | Muy amplio | En crecimiento |
| Curva de aprendizaje del equipo | Baja-Media | Media |
| App móvil futura | Requiere proyecto separado (React Native) | ✅ Código compartido |
| Mantenimiento a largo plazo | ✅ Alto | Medio |

**Conclusión:** Si en el futuro se planea una **app móvil nativa** para el inspector de campo (reporte de inspecciones desde el celular), Flutter sería estratégico por el código compartido. En ese escenario, se recomienda **Flutter para la app móvil** y **Next.js para el portal web**, con la misma API compartida.

[Ver plan MVP](./06-plan-mvp.md)
[Volver al Índice](./00-indice-propuesta.md)
