# PermisoGT

Plataforma web de **expedientes digitales para licencias de construcción** en municipalidades de Guatemala.

Este repositorio es un monorepo con:

| Carpeta | Qué es | Tecnología | Puerto por defecto |
| :--- | :--- | :--- | :--- |
| `backend/` | API REST | NestJS 10 + Prisma + PostgreSQL | `http://localhost:3001` (prefijo `/api`) |
| `frontend/` | Portal web | Next.js 14 (App Router) + React 18 + Tailwind | `http://localhost:3000` |
| `Docs/` | Documentación viva del proyecto | Markdown | — |

El MVP cubre la licencia **L-01 Obra Mayor — Vivienda Unifamiliar** (formulario F08, ≤ 700 m²) para la Municipalidad de Guatemala.

> Documentación detallada del estado, arquitectura y decisiones: carpeta [`Docs/`](Docs/). Empieza por [`Docs/status/general.md`](Docs/status/general.md).

---

## Requisitos previos (qué instalar antes)

Necesitas estas herramientas en tu máquina. Las instrucciones siguientes están pensadas para **Windows 10/11** (entorno de desarrollo del proyecto). Si usas macOS o Linux, los conceptos son los mismos; cambia solo la forma de instalar.

### 1. Git (para clonar el repositorio)

1. Abre el navegador y ve a: https://git-scm.com/download/win  
2. Descarga el instalador de **Git for Windows**.  
3. Ejecútalo y acepta las opciones por defecto (puedes dejar el editor y el terminal que proponga).  
4. Verifica en **PowerShell** o **Símbolo del sistema**:

```powershell
git --version
```

Debe mostrar algo como `git version 2.x.x`.

### 2. Node.js (runtime de JavaScript para backend y frontend)

El proyecto usa NestJS 10 y Next.js 14. Se recomienda **Node.js 20 LTS** (también suele funcionar Node 18+).

1. Ve a: https://nodejs.org/  
2. Descarga la versión **LTS** (botón verde recomendado).  
3. Ejecuta el instalador y deja marcada la opción de instalar también **npm**.  
4. Cierra y vuelve a abrir la terminal.  
5. Verifica:

```powershell
node --version
npm --version
```

Ejemplo esperado: `v20.x.x` y `10.x.x` (u otra versión compatible).

> **Nota:** No hace falta instalar Yarn ni pnpm; este proyecto usa `npm`.

### 3. PostgreSQL 16 (base de datos)

El proyecto **no usa Docker**. PostgreSQL se instala de forma nativa en Windows.

#### Opción recomendada — winget (Windows Package Manager)

1. Abre PowerShell **como usuario normal** (o administrador si winget lo pide).  
2. Ejecuta:

```powershell
winget install -e --id PostgreSQL.PostgreSQL.16
```

3. Durante la instalación te pedirá una **contraseña para el usuario `postgres`**. Anótala. En la documentación de desarrollo del proyecto se asume a menudo `postgres` / `postgres`; si eliges otra, deberás reflejarla en `DATABASE_URL` (paso de configuración).

#### Opción alternativa — instalador oficial

1. Ve a: https://www.postgresql.org/download/windows/  
2. Usa el instalador de EnterpriseDB / el enlace oficial.  
3. Elige la versión **16**.  
4. Anota puerto (`5432` por defecto) y contraseña del superusuario `postgres`.

#### Comprobar que el servicio está activo (Windows)

1. Abre **Servicios** (`Win + R` → `services.msc`).  
2. Busca un servicio parecido a `postgresql-x64-16`.  
3. Debe estar en estado **En ejecución**. Si no, clic derecho → **Iniciar**.

También puedes probar:

```powershell
psql --version
```

Si `psql` no está en el PATH, úsalo desde el menú de inicio (“SQL Shell (psql)”) o añade la carpeta `bin` de PostgreSQL al PATH (por ejemplo `C:\Program Files\PostgreSQL\16\bin`).

### 4. Navegador web

Cualquier navegador moderno sirve para usar el portal:

- Google Chrome: https://www.google.com/chrome/  
- Microsoft Edge (ya viene en Windows 10/11)  
- Mozilla Firefox: https://www.mozilla.org/firefox/  

Abre el portal en: **http://localhost:3000** (después de levantarlo).

### 5. Editor de código (opcional, recomendado)

- Visual Studio Code: https://code.visualstudio.com/  
- Cursor: https://cursor.com/  

No es obligatorio para ejecutar el proyecto; solo facilita editar `.env` y revisar el código.

---

## Obtener el código

### Si tienes acceso al repositorio Git

```powershell
cd C:\
git clone <URL_DEL_REPOSITORIO> building_permits
cd building_permits
```

Sustituye `<URL_DEL_REPOSITORIO>` por la URL real (HTTPS o SSH) del remoto.

### Si te entregaron una carpeta ZIP

1. Extrae el ZIP en una ruta sencilla, por ejemplo `C:\building_permits`.  
2. Abre PowerShell en esa carpeta:

```powershell
cd C:\building_permits
```

---

## Configurar la base de datos

### Crear la base `permisogt`

Abre **SQL Shell (psql)** o PowerShell con `psql` disponible y conéctate como `postgres`. Luego:

```sql
CREATE DATABASE permisogt;
```

Si la base ya existe, puedes omitir este paso.

Para listar bases:

```sql
\l
```

Salir de `psql`:

```sql
\q
```

---

## Configurar el backend

### 1. Instalar dependencias

```powershell
cd C:\building_permits\backend
npm install
```

La primera vez puede tardar varios minutos (descarga paquetes de npm).

### 2. Crear el archivo de entorno

```powershell
copy .env.example .env
```

Abre `backend\.env` con un editor de texto y revisa al menos:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/permisogt?schema=public"
JWT_ACCESS_SECRET="cambiar-por-secreto-largo-aleatorio"
JWT_REFRESH_SECRET="cambiar-por-otro-secreto-largo-aleatorio"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
DEFAULT_TENANT_SLUG="guatemala"
SEED_ADMIN_PASSWORD="Admin123!"
```

- Sustituye `TU_PASSWORD` por la contraseña real del usuario `postgres`.  
- En desarrollo local puedes dejar los secretos JWT de ejemplo, pero **nunca** los uses en producción.  
- `SEED_ADMIN_PASSWORD` solo afecta la contraseña del Admin principal del seed (`admin@permisogt.local`).

### 3. Aplicar migraciones (crea las tablas)

```powershell
cd C:\building_permits\backend
npx prisma migrate dev
```

Si pregunta un nombre de migración y la base ya está al día, no debería crear una nueva. En un entorno limpio aplicará la migración inicial.

### 4. Generar el cliente Prisma (si hace falta)

Suele ejecutarse junto con `migrate`. Si necesitas forzarlo:

```powershell
npx prisma generate
```

### 5. Sembrar datos de prueba (tenant, usuarios, licencia L-01)

```powershell
npx prisma db seed
```

Esto crea:

- Tenant **Municipalidad de Guatemala**  
- **2 usuarios ACTIVE por cada rol** (Admin, Revisor, Inspector, Solicitante)  
- Tipo de licencia **L-01** con requisitos documentales **D-01…D-15**

### 6. Arrancar la API

```powershell
npm run start:dev
```

Deberías ver que NestJS escucha en el puerto **3001**. Déjala corriendo.

Comprobación rápida en el navegador o con curl:

- API base: http://localhost:3001/api  

---

## Configurar el frontend (portal web)

Abre **otra** terminal (deja el backend corriendo).

### 1. Instalar dependencias

```powershell
cd C:\building_permits\frontend
npm install
```

### 2. Crear el archivo de entorno

```powershell
copy .env.local.example .env.local
```

Contenido esperado de `frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

No cambies esa URL si el backend corre en el puerto por defecto.

### 3. Arrancar el portal

```powershell
npm run dev
```

Abre el navegador en:

**http://localhost:3000**

La app redirige según el rol de la sesión (login, paneles de solicitante/revisor/inspector/admin).

---

## Resumen rápido (checklist)

Cuando ya tienes Node, Git y PostgreSQL instalados:

```powershell
# 1) Base de datos (una sola vez)
#    CREATE DATABASE permisogt;   ← en psql

# 2) Backend
cd C:\building_permits\backend
copy .env.example .env
# Editar DATABASE_URL en .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# 3) Frontend (otra terminal)
cd C:\building_permits\frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Luego abre **http://localhost:3000**.

---

## Credenciales de prueba (solo desarrollo)

Creadas por el seed. Úsalas únicamente en entorno local.

### Set A

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| Administrador | `admin@permisogt.local` | `Admin123!` |
| Revisor | `revisor@permisogt.local` | `Revisor123` |
| Inspector | `inspector@permisogt.local` | `Inspector123` |
| Solicitante | `solicitante@permisogt.local` | `Solicita123` |

### Set B (segundo usuario de cada rol)

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| Administrador | `admin2@permisogt.local` | `Admin456!` |
| Revisor | `revisor2@permisogt.local` | `Revisor456` |
| Inspector | `inspector2@permisogt.local` | `Inspector456` |
| Solicitante | `solicitante2@permisogt.local` | `Solicita456` |

Para probar el flujo de **aprobación de solicitantes**: registra una cuenta nueva en `/registro`; quedará pendiente hasta que un Admin la apruebe en `/admin/usuarios`.

Si añadiste el Set B sobre una base ya sembrada, vuelve a ejecutar:

```powershell
cd C:\building_permits\backend
npx prisma db seed
```

---

## Qué puede hacer cada rol (visión rápida)

| Rol | Rutas típicas | Acciones principales |
| :--- | :--- | :--- |
| Solicitante | `/solicitante`, `/solicitante/nueva`, expediente | Crear solicitud F08, cargar documentos, enviar, corregir, confirmar fecha de visita, pagar (simulado o comprobante), pedir recepción de obra |
| Revisor | `/revisor`, detalle de expediente | Revisar documentos, observaciones, aprobar/rechazar, solicitar alineación, confirmar pago |
| Inspector | `/inspector` | Proponer fechas, registrar resultado de visita con foto |
| Admin | `/admin/usuarios` | Aprobar solicitantes, crear usuarios internos, activar/desactivar |

El flujo completo del expediente llega hasta `CERRADO`. La **emisión formal del PDF de licencia con QR** (Fase 5) y el **dashboard** (Fase 6) aún no están implementados; al confirmar el pago el expediente pasa a `LICENCIA_EMITIDA` sin generar aún ese PDF.

---

## Problemas frecuentes

### `npm` o `node` no se reconoce

Cierra todas las terminales, reinstala Node LTS y abre una terminal nueva. Comprueba `node --version`.

### Error de conexión a PostgreSQL / `DATABASE_URL`

- Confirma que el servicio `postgresql-x64-16` está en ejecución.  
- Verifica usuario, contraseña, host (`localhost`), puerto (`5432`) y nombre de base (`permisogt`) en `backend\.env`.  
- Asegúrate de haber creado la base con `CREATE DATABASE permisogt;`.

### El frontend carga pero las peticiones fallan (CORS / red)

- El backend debe estar corriendo en el puerto **3001**.  
- `NEXT_PUBLIC_API_URL` debe ser `http://localhost:3001/api`.  
- `CORS_ORIGIN` en el backend debe ser `http://localhost:3000`.

### Puerto 3000 o 3001 ocupado

Cierra el proceso que los use, o cambia `PORT` en el backend / arranca Next con otro puerto (`npx next dev -p 3002`) y ajusta `CORS_ORIGIN` y la URL que abras en el navegador.

### Seed no crea el Set B

Ejecuta de nuevo `npx prisma db seed` desde `backend/`. El seed hace `upsert` por correo: crea los usuarios que falten y no pisa los que ya existen.

### Contraseña del Admin principal distinta

Si definiste `SEED_ADMIN_PASSWORD` en `.env` **antes** del primer seed, esa será la contraseña de `admin@permisogt.local`. El resto de usuarios del seed usan las contraseñas fijas de las tablas de arriba. Como el `upsert` no actualiza usuarios existentes, cambiar la variable después no modifica una cuenta ya creada.

---

## Estructura relevante

```
building_permits/
├── README.md                 ← esta guía
├── Docs/                     ← estado, arquitectura, decisiones, changelog
├── backend/                  ← API NestJS + Prisma
│   ├── prisma/               ← schema, migraciones, seed
│   ├── src/                  ← código de la API
│   ├── .env.example
│   └── uploads/              ← archivos subidos en desarrollo (no versionar)
└── frontend/                 ← portal Next.js
    ├── src/app/              ← páginas (App Router)
    └── .env.local.example
```

---

## Documentación adicional

| Documento | Contenido |
| :--- | :--- |
| [`Docs/status/general.md`](Docs/status/general.md) | Estado funcional, cómo ejecutar, credenciales |
| [`Docs/status/architecture.md`](Docs/status/architecture.md) | Arquitectura técnica |
| [`Docs/status/structure.md`](Docs/status/structure.md) | Organización del código |
| [`Docs/status/decisions.md`](Docs/status/decisions.md) | Decisiones técnicas (D-001…) |
| [`Docs/changelog.md`](Docs/changelog.md) | Historial de cambios |
| [`Docs/mvp_docs/`](Docs/mvp_docs/) | Propuesta del MVP (visión, roles, flujo, plan) |
| [`Docs/general_instructions.md`](Docs/general_instructions.md) | Protocolo de trabajo con la documentación |

---

## Licencia / uso

Proyecto en desarrollo (MVP). Las credenciales de este README son **solo para entorno local de pruebas**; no las uses en un despliegue real.
