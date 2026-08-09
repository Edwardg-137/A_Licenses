# Tipos de Licencia y Requisitos Documentales

La plataforma está diseñada para ser **configurable por tipo de licencia**: cada tipo tiene su propia lista de documentos requeridos, formatos aceptados e inspecciones aplicables. El MVP implementa el primer tipo de forma completa; los demás se agregan en fases posteriores.

---

## 1. Tipos de Licencia Contemplados

| # | Tipo de Licencia | MVP | Fase 2 | Fase 3 |
| :--- | :--- | :---: | :---: | :---: |
| L-01 | Obra Mayor — Vivienda Unifamiliar | ✅ | | |
| L-02 | Obra Mayor — Edificio Multifamiliar / Comercial | | ✅ | |
| L-03 | Obra Menor (reparaciones, muros, techado) | | ✅ | |
| L-04 | Movimiento de Tierras | | ✅ | |
| L-05 | Urbanización / Lotificación | | | ✅ |
| L-06 | Renovación de Licencia Vencida | | ✅ | |

---

## 2. L-01: Obra Mayor — Vivienda Unifamiliar (MVP)

*Basado en los flujos documentados para Ciudad de Guatemala y Villa Nueva [ref: 06-flujos-de-tramite.md §1].*

### 2.1 Clasificación por Formulario Municipal

La Municipalidad de Guatemala utiliza formularios diferenciados según el tipo y escala del proyecto. El sistema debe determinar automáticamente el formulario aplicable al capturar los datos iniciales:

| Formulario | Aplica para | Limitaciones |
| :--- | :--- | :--- |
| **F08** | Vivienda unifamiliar ≤ 700 m², ampliaciones y fraccionamientos de hasta 4 predios | No aplica en Centro Histórico ni cambio de uso de suelo |
| **F02** | Proyectos de 31 m² a 700 m², factibilidades, dictámenes de localización | Uso general comercial o mixto |

*El MVP cubre el formulario F08 (vivienda unifamiliar). El sistema muestra automáticamente el formulario correcto según m² y uso de suelo declarado.*

### 2.2 Datos del Proyecto (formulario)

| Campo | Tipo | Requerido |
| :--- | :--- | :---: |
| Dirección exacta del inmueble | Texto | ✅ |
| Zona / Municipio | Selector | ✅ |
| Área de construcción (m²) | Numérico | ✅ |
| Número de niveles | Numérico | ✅ |
| Uso del inmueble | Selector (Residencial / Mixto) | ✅ |
| Número de finca, folio y libro (RGP) | Texto | ✅ |
| NIT del propietario | Texto | ✅ |
| Número de colegiado del profesional | Texto | ✅ |

### 2.3 Documentos Requeridos

| # | Documento | Formato | Observaciones |
| :--- | :--- | :--- | :--- |
| D-01 | DPI del propietario (ambas caras) | PDF / JPG | Vigente |
| D-02 | Certificación del RGP | PDF | Vigencia ≤ 3 meses [ref: 01-requisitos §1] |
| D-03 | Escritura del inmueble | PDF | Copia simple de escritura pública |
| D-04 | Solvencia de IUSI | PDF | Emitida por municipalidad |
| D-05 | Solvencia de agua / servicios | PDF | |
| D-06 | Boleto de Ornato | PDF / JPG | Del propietario Y del profesional responsable; vigencia anual |
| D-07 | Resolución ambiental MARN (BIAWEB) | PDF | Categoría C o CR [ref: 03-evaluacion-ambiental §1] |
| D-08 | Planos de arquitectura (timbrados) | PDF / DWG | Firmados por profesional colegiado |
| D-09 | Planos estructurales (timbrados) | PDF / DWG | Con timbres del CIG o CAG |
| D-10 | Planos de instalaciones (hidráulicas/eléctricas) | PDF / DWG | |
| D-11 | Memoria de cálculo estructural | PDF | |
| D-12 | Presupuesto estimado de obra | PDF | Para cálculo de timbre y tasa |
| D-13 | Cronograma de actividades | PDF | Plazo estimado de la obra por etapas |
| D-14 | Formulario municipal de solicitud (F08/F02) | PDF | Firmado por propietario y profesional; sin tachones |
| D-15 | Comprobante de pago de tasa municipal | PDF / JPG | Cargado después del cálculo y aprobación técnica |

### 2.4 Inspecciones Aplicables

| Tipo de Inspección | Momento | Obligatoria |
| :--- | :--- | :---: |
| Alineación territorial | Antes de iniciar obra | ✅ |
| Inspección intermedia (losas) | Durante construcción | Opcional |
| Recepción de obra | Al finalizar | ✅ |

### 2.5 Cálculo de Tasa Municipal

La tasa base se calcula a partir del presupuesto estimado de obra (D-12) según la tabla de aranceles municipal vigente. La plataforma aplica la fórmula configurada por el Admin y presenta el resultado antes de solicitar el comprobante de pago.

---

## 3. L-02: Obra Mayor — Edificio (Referencia para Fase 2)

Documentos adicionales a L-01:
- Factibilidad de Gestión Urbana (FGU) — Ciudad de Guatemala [ref: 02-gestion-municipal §1].
- Estudio de Impacto Ambiental (EIA) — categoría A, B1 o B2 [ref: 03-evaluacion-ambiental §1].
- Dictamen de CONRED (NRD-1 y NRD-2) [ref: 04-riesgos-y-otros-avales §1].
- Planos de seguridad y evacuación.
- Factibilidad de agua (EMPAGUA, si aplica).

---

## 4. Configuración de Tipos de Licencia (Admin)

El Administrador Municipal puede, sin intervención técnica:
- Activar o desactivar tipos de licencia disponibles.
- Modificar la lista de documentos requeridos por tipo.
- Definir para cada documento: nombre, formato(s) aceptado(s), descripción de ayuda para el solicitante.
- Marcar documentos como obligatorios u opcionales.
- Configurar qué tipos de inspección aplican a cada licencia.
- Definir la fórmula de cálculo de tasa (monto base + porcentaje sobre presupuesto).

Esta flexibilidad permite adaptar la plataforma a diferentes municipios sin cambios de código.

[Ver flujo del expediente](./03-flujo-expediente-digital.md)
[Ver arquitectura y stack](./05-arquitectura-y-stack.md)
[Volver al Índice](./00-indice-propuesta.md)
