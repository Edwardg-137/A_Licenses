# Roles y Usuarios del Sistema

Cada actor del sistema tiene un conjunto de permisos y responsabilidades bien delimitados. La plataforma opera bajo un modelo de **cuatro roles principales** (Solicitante, Revisor Municipal, Inspector y Administrador Municipal) más un superusuario técnico (SaaS).

---

## 1. Mapa de Actores

```
┌─────────────────────────────────────────────────────┐
│                  PERMISSOGT                         │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │  SOLICITANTE │  │   REVISOR    │  │INSPECTOR │  │
│  │(Profesional) │  │  MUNICIPAL   │  │          │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
│         │                 │               │         │
│         └─────────────────┴───────────────┘         │
│                           │                         │
│                    ┌──────┴──────┐                  │
│                    │    ADMIN    │                   │
│                    │ MUNICIPAL   │                   │
│                    └─────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## 2. Rol: Solicitante (Profesional Responsable)

**Quién es:** Arquitecto o Ingeniero Civil colegiado activo que representa al propietario del proyecto. Es quien gestiona el trámite ante la municipalidad [ref: 05-aval-profesional.md §1].

### Capacidades
- Registrar una cuenta con número de colegiado (CIG o CAG). **En el MVP la verificación es manual:** el Administrador Municipal revisa y aprueba cada cuenta nueva antes de que pueda crear solicitudes (la integración con los validadores en línea de los colegios queda para fases posteriores).
- Crear nuevas solicitudes de licencia, seleccionando el tipo de licencia.
- Cargar documentos por categoría (DPI, planos, MARN, IUSI, etc.).
- Recibir notificaciones de cambio de estado y observaciones.
- Subir documentos corregidos en respuesta a observaciones.
- Consultar el estado actual y el historial completo del expediente.
- Solicitar y aceptar fechas de visita de inspección.
- Ver el monto de tasas calculado y realizar el pago en línea simulado (MVP) o subir comprobante de pago externo.

### Restricciones
- No puede modificar un expediente una vez admitido a revisión (salvo por correcciones habilitadas por el revisor).
- No puede ver los expedientes de otros solicitantes.

---

## 3. Rol: Revisor Municipal

**Quién es:** Técnico o profesional de la Dirección de Gestión Urbana o Dirección de Obras de la municipalidad.

### Capacidades
- Ver la bandeja de expedientes asignados a su área.
- Abrir y revisar cada documento del expediente.
- Registrar observaciones vinculadas a documentos específicos (con texto descriptivo y nivel de prioridad).
- Aprobar documentos individuales o el expediente completo.
- Solicitar correcciones, enviando el expediente de vuelta al estado "En Corrección".
- Coordinar con el Inspector la programación de visitas de inspección.
- Emitir la resolución final (aprobación o rechazo fundamentado).

### Restricciones
- No puede modificar documentos cargados por el solicitante.
- No puede acceder a expedientes de otras áreas (si la municipalidad tiene múltiples revisores con departamentos separados).

---

## 4. Rol: Inspector

**Quién es:** Inspector de campo de la municipalidad, responsable de la alineación territorial, inspecciones intermedias y recepción de obra [ref: 02-gestion-municipal.md §4].

### Capacidades
- Ver las visitas de inspección programadas en su agenda.
- Confirmar o reprogramar una visita solicitada.
- Registrar el resultado de la visita (formulario estructurado + fotos).
- Adjuntar evidencia fotográfica de la inspección.
- Emitir el resultado de la visita: Conforme / No Conforme / Requiere Seguimiento.

### Restricciones
- No puede modificar documentos del expediente ni emitir la licencia.
- Su agenda es visible para el solicitante solo en lo relativo a su propio expediente.

---

## 5. Rol: Administrador Municipal

**Quién es:** Encargado de la Ventanilla Única o jefe de la Dirección de Obras. Supervisa el funcionamiento operativo de la plataforma en su municipalidad.

### Capacidades
- Gestionar usuarios (crear, activar/desactivar cuentas de revisores e inspectores).
- Configurar los tipos de licencia activos y sus listas de requisitos.
- Asignar expedientes a revisores específicos o gestionar la asignación automática.
- Ver el tablero de métricas: expedientes por estado, tiempos promedio, cuellos de botella.
- Configurar las tasas municipales y la URL del sistema de pago externo.
- Gestionar plantillas de observaciones frecuentes para agilizar la revisión.

---

## 6. Rol: Superadministrador (SaaS)

**Quién es:** El equipo técnico de PermisoGT. Relevante para la fase multi-municipio.

### Capacidades
- Crear y configurar nuevas instancias de municipalidad.
- Gestionar el plan y los límites de cada municipio (expedientes por mes, usuarios activos).
- Acceso de soporte técnico a cualquier municipio.

---

## 7. Matriz de Permisos Resumida

| Acción | Solicitante | Revisor | Inspector | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Crear solicitud | ✅ | ❌ | ❌ | ❌ |
| Cargar documentos | ✅ | ❌ | ❌ | ❌ |
| Ver expediente propio | ✅ | ✅ | ✅ | ✅ |
| Registrar observaciones | ❌ | ✅ | ❌ | ❌ |
| Aprobar/Rechazar expediente | ❌ | ✅ | ❌ | ✅ |
| Programar visita | ✅ | ✅ | ✅ | ✅ |
| Registrar resultado de inspección | ❌ | ❌ | ✅ | ❌ |
| Configurar tipos de licencia | ❌ | ❌ | ❌ | ✅ |
| Ver métricas generales | ❌ | ❌ | ❌ | ✅ |

[Ver flujo del expediente](./03-flujo-expediente-digital.md)
[Volver al Índice](./00-indice-propuesta.md)
