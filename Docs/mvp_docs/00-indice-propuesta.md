# Propuesta de Plataforma Digital de Gestión de Licencias de Construcción

> **Proyecto:** PermisoGT — Sistema de Expedientes Digitales Municipales
> **Versión:** 1.0 — Propuesta MVP
> **Fecha:** Agosto 2026
> **Alcance inicial:** Municipalidad de Guatemala (escalable a multi-municipio)

---

## Documentos de la Propuesta

| # | Documento | Descripción |
| :--- | :--- | :--- |
| 01 | [Visión y Objetivos](./01-vision-y-objetivos.md) | Problema, propuesta de valor y metas del sistema |
| 02 | [Roles y Usuarios](./02-roles-y-usuarios.md) | Definición de actores, permisos y flujos por rol |
| 03 | [Flujo del Expediente Digital](./03-flujo-expediente-digital.md) | Ciclo de vida de una solicitud de licencia |
| 04 | [Tipos de Licencia y Requisitos](./04-tipos-licencia-y-requisitos.md) | Matriz de licencias y documentos requeridos por tipo |
| 05 | [Arquitectura y Stack Tecnológico](./05-arquitectura-y-stack.md) | Decisiones técnicas, stack recomendado y escalabilidad |
| 06 | [Plan MVP](./06-plan-mvp.md) | Alcance del MVP, fases de desarrollo y criterios de éxito |
| 07 | [Análisis de Compatibilidad del Flujo](./07-analisis-compatibilidad-flujo.md) | Comparación del flujo propuesto vs. el proceso real de la Municipalidad de Guatemala |

---

## Resumen Ejecutivo

**PermisoGT** es una plataforma web de gestión de expedientes digitales para trámites de licencias de construcción, diseñada para modernizar el proceso actual en municipalidades de Guatemala.

**El problema central:** El proceso de licencia de construcción en los municipios guatemaltecos es mayoritariamente presencial, generando tiempos de gestión de 4 a 8 semanas para viviendas y hasta 6 meses para proyectos complejos. Los cuellos de botella son: entrega física de documentos, observaciones no sistematizadas, falta de trazabilidad y comunicación deficiente entre el solicitante y la municipalidad.

**La solución:** Una plataforma multi-rol (Solicitante, Revisor Municipal, Inspector, Administrador) que digitaliza la recepción de expedientes, valida documentos automáticamente, gestiona el ciclo de observaciones/correcciones, programa visitas de inspección y ofrece visibilidad en tiempo real del estado del trámite.

**Estrategia de adopción:** MVP funcional para un tipo de licencia (Obra Mayor — Vivienda Unifamiliar) en la Municipalidad de Guatemala, con arquitectura diseñada desde el inicio para escalar a múltiples tipos de licencia y múltiples municipios (SaaS).
