# Flujo del Expediente Digital

Este documento describe el ciclo de vida completo de una solicitud de licencia de construcción dentro de la plataforma PermisoGT, alineado con el proceso real de la Municipalidad de Guatemala (Ventanilla Única, Dirección de Obras, Catastro).

> **Referencia de alineación:** Ver [Análisis de Compatibilidad del Flujo](./07-analisis-compatibilidad-flujo.md) para el detalle comparativo con el proceso real.

---

## 1. Diagrama de Estados del Expediente

```
  [FASE 0 — ORIENTACIÓN PRE-TRÁMITE]
      │  (Paso guiado, externo a la municipalidad)
      │  El profesional verifica POT, obtiene MARN y solvencias
      ▼
  [CLASIFICACIÓN DEL PROYECTO]
      │  Sistema determina formulario aplicable (F08 o F02)
      │  según m² declarados y uso de suelo
      ▼
  [BORRADOR]
      │  Solicitante completa el formulario y carga los 15 documentos
      │  (puede ejecutar "Verificar antes de enviar")
      │
      │ Solicitante envía expediente
      ▼
  [EN VALIDACIÓN AUTOMÁTICA]
      │
      ├─ Documentos faltantes o formato incorrecto ──► [OBSERVADO — FORMATO]
      │                                                      │
      │                                           Solicitante corrige y reenvía
      │                                                      │
      │                                           (vuelve a Validación Automática)
      │
      │ Todos los documentos presentes y con formato correcto
      ▼
  [EN REVISIÓN TÉCNICA]   ← Dirección de Obras / Revisor asignado
      │
      ├─ Revisor registra observaciones ──► [EN CORRECCIÓN]
      │                                          │
      │                               Solicitante sube correcciones
      │                               (solo documentos observados)
      │                                          │
      │                               (vuelve a EN REVISIÓN TÉCNICA)
      │                               Máx. 3 rondas → Rechazado con dictamen
      │
      │ Revisión técnica aprobada
      ▼
  [ALINEACIÓN TERRITORIAL PROGRAMADA]  ← Inspector de Catastro / campo
      │  Inspector visita el predio y registra el resultado
      │  (confirmación de límite con vía pública)
      │
      │ Alineación conforme
      ▼
  [PENDIENTE DE PAGO]
      │  Sistema calcula la tasa municipal (según m² y formulario F08/F02)
      │  Solicitante ve el monto y accede al enlace de pago externo
      │  Solicitante sube comprobante de pago
      │  Revisor/Admin confirma recepción del comprobante
      ▼
  [LICENCIA EMITIDA]
      │  PDF generado con número único y código QR de verificación
      │  Solicitante descarga la licencia
      │
      └─► [RECEPCIÓN DE OBRA]  (al finalizar la construcción)
               │  Inspector realiza visita final
               └─ Catastro actualiza matrícula fiscal / IUSI
```

---

## 2. Fase 0 — Orientación Pre-trámite (Externa a la Municipalidad)

Esta fase no es gestionada por la plataforma, pero **PermisoGT la guía** a través de un onboarding informativo al inicio de cada solicitud. El profesional debe haber completado estos pasos antes de crear el expediente.

| Paso | Acción | Recurso Orientativo |
| :---: | :--- | :--- |
| 0.1 | Verificar zonificación POT del predio (G0–G5) | Enlace a [vu.muniguate.com](http://vu.muniguate.com) |
| 0.2 | Confirmar que el uso de suelo es compatible con el proyecto | Portal de la Municipalidad |
| 0.3 | Obtener resolución ambiental MARN (BIAWEB, Categoría C/CR) | [app.vac.com.gt](http://app.vac.com.gt) / BIAWEB |
| 0.4 | Obtener solvencias (IUSI, agua, RGP, SAT) | Municipalidad / SAT en línea |

*El sistema mostrará una lista de verificación (checklist) de esta fase antes de permitir crear el expediente. No bloquea al usuario, pero establece expectativas claras.*

---

## 3. Clasificación del Proyecto (Paso Inicial del Expediente)

Antes de iniciar el formulario de datos, el sistema clasifica automáticamente el proyecto para determinar el **formulario municipal aplicable** y la lista de documentos correcta:

| Criterio | F08 (MVP) | F02 |
| :--- | :--- | :--- |
| Tipo de uso | Residencial unifamiliar | Comercial / mixto / industrial |
| Área de construcción | ≤ 700 m² | 31 m² – 700 m² |
| ¿Aplica en Centro Histórico? | ❌ No | Según zona |
| ¿Cambio de uso de suelo? | ❌ No | Puede contemplarse |

El MVP cubre exclusivamente el formulario **F08** (vivienda unifamiliar ≤ 700 m²). Al ingresar datos fuera de este rango, el sistema informa que el trámite no está disponible aún e indica cómo proceder presencialmente.

---

## 4. Descripción de Cada Estado

### BORRADOR
- El solicitante completa el formulario en múltiples sesiones; los datos se guardan automáticamente.
- Puede cargar, reemplazar y previsualizar los **15 documentos** requeridos para L-01.
- Disponible el botón "Verificar antes de enviar" que ejecuta la validación automática sin cambiar el estado.

### OBSERVADO — FORMATO (Validación Automática Fallida)
- El sistema verifica para cada documento:
  - **Presencia:** ¿Fue cargado?
  - **Formato:** ¿Es el MIME type correcto? (PDF, DWG, JPG según el campo)
  - **Integridad:** ¿El archivo tiene tamaño > 0 bytes y < límite configurado?
- Si falla: informe detallado por documento. El expediente NO avanza y el estado es visible solo para el solicitante.
- Duración del proceso: inmediata (segundos).

### EN REVISIÓN TÉCNICA
- El expediente aparece en la bandeja del revisor asignado (Dirección de Obras).
- El revisor abre y anota cada documento: ✅ Conforme / ⚠️ Con observación / ❌ Requiere reemplazo.
- Cada observación incluye: documento afectado, texto descriptivo, nivel de prioridad (Alta / Media / Baja).
- El revisor puede aprobar (avanza a Alineación) o enviar a corrección.

### EN CORRECCIÓN
- El solicitante recibe notificación con el listado completo de observaciones.
- Solo los documentos marcados como "Con observación" o "Requiere reemplazo" quedan desbloqueados para sustitución.
- Al reenviar, el revisor ve marcados en verde los documentos reemplazados respecto a la ronda anterior.
- Máximo de rondas configurable por el Admin (defecto: 3). Si se supera, el expediente pasa a **Rechazado con Dictamen**.

### ALINEACIÓN TERRITORIAL PROGRAMADA
- Tras la aprobación técnica, el revisor o Admin genera una solicitud de inspección de **Alineación Territorial**.
- El inspector de campo ve la visita en su agenda y propone hasta 3 fechas disponibles.
- El solicitante selecciona y confirma una fecha.
- El inspector visita el predio y registra el resultado: Conforme / No Conforme (con nota descriptiva y foto obligatoria).
- Si es No Conforme, el expediente regresa a Revisión Técnica con la observación del inspector.

### PENDIENTE DE PAGO
- El sistema calcula automáticamente la tasa municipal aplicando la fórmula configurada por el Admin (base + % sobre presupuesto de obra, según tarifa F08 vigente).
- Se presenta al solicitante: monto calculado + desglose.
- **MVP:** el solicitante realiza un **pago en línea simulado** dentro de la plataforma, claramente señalizado como simulación (sin transacción real). El sistema genera un comprobante simulado que se adjunta como D-15.
- Alternativamente, el solicitante puede subir un comprobante de pago externo (D-15: PDF o JPG).
- El revisor o Admin valida el comprobante y confirma la recepción.
- *Fase posterior:* integración con el sistema de pago real de la municipalidad.

### LICENCIA EMITIDA
- El revisor emite la resolución final de aprobación.
- El sistema genera el **PDF de la licencia** con: número correlativo único, datos del proyecto, nombre del profesional, vigencia, y código QR de verificación pública.
- El solicitante descarga la licencia desde la plataforma; también recibe copia por correo.
- El Admin registra el expediente como cerrado; los datos se incorporan al dashboard de métricas.

### RECEPCIÓN DE OBRA (Post-Licencia)
- Al finalizar la construcción, el solicitante solicita la inspección final desde la plataforma.
- El inspector realiza la visita y registra si la obra coincide con los planos aprobados.
- Si es conforme, se emite el **Certificado de Recepción de Obra**, que el propietario utiliza para actualizar la matrícula fiscal ante Catastro municipal y el IUSI.

---

## 5. Flujo de Correcciones (Detalle)

```
Ronda 1: Revisor observa → Solicitante corrige → Revisor revisa
Ronda 2: (si hay nuevas observaciones) Revisor observa → Solicitante corrige
Ronda 3: Revisor decide: ✅ Aprueba → (avanza a Alineación) | ❌ Rechaza con dictamen escrito
```

Cada ronda queda registrada en el historial del expediente con fecha, usuario y contenido de observaciones. El solicitante puede ver el historial completo de rondas en cualquier momento.

---

## 6. Notificaciones del Sistema

| Evento | Notificado a |
| :--- | :--- |
| Expediente enviado exitosamente | Solicitante + Admin |
| Fallo de validación automática (con detalle) | Solicitante |
| Expediente asignado a revisor | Revisor |
| Observaciones registradas (con lista de docs afectados) | Solicitante |
| Corrección recibida (con documentos reemplazados marcados) | Revisor |
| Expediente aprobado técnicamente | Solicitante |
| Visita de alineación confirmada (fecha + datos de contacto) | Solicitante + Inspector |
| Alineación conforme | Solicitante + Revisor |
| Monto de tasa calculado | Solicitante |
| Comprobante de pago confirmado | Solicitante |
| Licencia emitida (con PDF adjunto) | Solicitante + Admin |
| Recepción de obra: resultado registrado | Solicitante + Admin |

*Mecanismo: Notificaciones in-app (bell icon) + correo electrónico. Fases posteriores: SMS/WhatsApp.*

---

## 7. Historial de Auditoría

Cada acción sobre un expediente queda registrada en un log inmutable:
- Fecha y hora exacta
- Usuario que realizó la acción (nombre + rol)
- Descripción de la acción (ej. `"Documento D-11 'Memoria de Cálculo' marcado como Requiere Reemplazo — Ronda 1"`)
- Estado anterior y estado nuevo del expediente

Este historial es visible para todos los roles con acceso al expediente y exportable en PDF por el Admin.

[Ver tipos de licencia y requisitos](./04-tipos-licencia-y-requisitos.md)
[Ver roles y usuarios](./02-roles-y-usuarios.md)
[Ver análisis de compatibilidad](./07-analisis-compatibilidad-flujo.md)
[Volver al Índice](./00-indice-propuesta.md)
