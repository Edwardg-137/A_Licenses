# Visión, Problema y Objetivos

## 1. El Problema Actual

El proceso de licencia de construcción en Guatemala es intensivo en papel, tiempo y presencia física. Según los flujos documentados, incluso una **vivienda unifamiliar** (el caso más sencillo) puede tardar **4 a 8 semanas** únicamente en la fase municipal, asumiendo que el expediente está completo desde el inicio [ref: preguntas-basicas.md §3].

### Causas Raíz del Problema

| Causa | Impacto |
| :--- | :--- |
| Entrega de expedientes físicos con planos timbrados | El solicitante debe presentarse personalmente múltiples veces |
| Observaciones comunicadas verbalmente o en papel | No hay registro formal ni trazabilidad de correcciones |
| Falta de visibilidad del estado del trámite | El profesional no sabe en qué área está su expediente |
| Agenda de inspecciones no digitalizada | Coordinación ineficiente entre inspectores y obra |
| Sin validación previa de requisitos | Se aceptan expedientes incompletos que luego generan rechazos |
| Correcciones obligan a reingreso presencial del expediente | Cada ronda de observaciones suma semanas al proceso |

---

## 2. Propuesta de Valor

**PermisoGT** moderniza la ventanilla única municipal sin reemplazar al funcionario: lo empodera con herramientas digitales para revisar expedientes más rápido, comunicar observaciones de forma estructurada y gestionar su agenda de inspecciones.

### Contexto del Ecosistema Digital Existente

Ya existe en Guatemala la **Ventanilla Ágil de Construcción (VAC, vac.com.gt)**, plataforma que digitaliza los pre-trámites ante entes externos (MARN, CONRED, Ministerio de Salud, CONAP). Sin embargo, el VAC **no gestiona el trámite municipal** (la licencia de construcción en sí). PermisoGT ocupa ese espacio: el expediente digital ante la municipalidad, con todo el ciclo de revisión, observaciones, alineación territorial, pago y emisión de licencia. Ambas plataformas son **complementarias**, no competidoras.

### Beneficios por Actor

**Para el Profesional Solicitante:**
- Ingresa el expediente una sola vez desde cualquier lugar.
- Recibe notificaciones claras de observaciones, con indicación exacta del documento a corregir.
- Consulta el estado actualizado de su gestión en tiempo real.
- Agenda visitas de inspección sin llamadas telefónicas.

**Para la Municipalidad:**
- Recibe expedientes pre-validados (tipos de archivo correctos, documentos presentes).
- Gestiona la revisión técnica con herramientas estructuradas de observación.
- Tiene trazabilidad completa de cada expediente y los tiempos de cada fase.
- Puede generar métricas de desempeño y cuellos de botella.

**Para la Ciudadanía:**
- Tiempos de resolución más predecibles y transparentes.
- Reducción de construcciones ilegales al facilitar la formalización.

---

## 3. Objetivos del Sistema

### Objetivo General
Reducir el tiempo de gestión de licencias de construcción en municipalidades guatemaltecas mediante la digitalización del expediente, la comunicación estructurada y la trazabilidad del proceso.

### Objetivos Específicos

- **OE-01:** Permitir que el solicitante ingrese y gestione su expediente completamente en línea.
- **OE-02:** Clasificar automáticamente el proyecto (formulario F08/F02) según m² y uso de suelo antes de iniciar la carga documental.
- **OE-03:** Guiar al profesional en los pasos previos al trámite municipal (verificación POT, solvencias, MARN) mediante un onboarding informativo con enlaces directos.
- **OE-04:** Validar automáticamente que los **15 documentos requeridos** existen y son del formato correcto (PDF, DWG, JPG) antes de la revisión técnica.
- **OE-05:** Proporcionar al revisor municipal una interfaz para registrar observaciones vinculadas a documentos específicos.
- **OE-06:** Notificar al solicitante de cambios de estado y observaciones en tiempo real.
- **OE-07:** Gestionar la agenda de visitas de inspección de alineación territorial entre el inspector y el solicitante, como paso previo al pago.
- **OE-08:** Calcular y mostrar el monto de tasas municipales aplicables (según fórmula F08), con un flujo de pago en línea **simulado** en el MVP (claramente señalizado como simulación; la integración con el sistema de pago real de la municipalidad queda para fases posteriores).
- **OE-09:** Diseñar la plataforma como **multi-municipio desde el inicio**, aunque el MVP opere para una municipalidad.

---

## 4. Métricas de Éxito del MVP

| Métrica | Meta |
| :--- | :--- |
| Expedientes sin observaciones de formato | > 90% tras validación automática |
| Reducción de visitas presenciales por expediente | Al menos 3 menos que el proceso actual |
| Tiempo promedio de revisión técnica por expediente | < 5 días hábiles |
| Satisfacción del solicitante (encuesta post-trámite) | ≥ 4/5 |
| Expedientes que completan el flujo sin reingreso presencial | > 80% |

[Ver flujo del expediente digital](./03-flujo-expediente-digital.md)
[Volver al Índice](./00-indice-propuesta.md)
