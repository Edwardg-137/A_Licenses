# Análisis Comparativo: Flujo Real vs. Flujo Propuesto (PermisoGT)

> **Municipalidad de referencia:** Ciudad de Guatemala
> **Tipo de licencia analizado:** Obra Mayor — Vivienda Unifamiliar (L-01)
> **Fuentes:** Documentación interna (06-flujos-de-tramite.md, 02-gestion-municipal.md), búsqueda web (VAC, Ventanilla Única, COM-04-2024, approvato.com.gt, tramitargt.com)

---

## 1. Resumen Ejecutivo del Análisis

El flujo propuesto en PermisoGT es **altamente compatible** con el proceso real de la Municipalidad de Guatemala. La secuencia de pasos, los roles internos y los tipos de documentos están correctamente identificados. Sin embargo, se detectan **4 brechas importantes** que deben incorporarse al diseño antes del MVP para garantizar la compatibilidad operativa real.

| Dimensión | Compatibilidad | Observación |
| :--- | :---: | :--- |
| Secuencia general del flujo | ✅ Alta | El orden de pasos es correcto |
| Documentos requeridos (L-01) | ✅ Corregido | Lista actualizada a 15 documentos |
| Roles internos municipales | ✅ Alta | Bien mapeados |
| Pre-trámite (FGU/Uso de Suelo) | ✅ Cubierto | Onboarding orientativo modelado en Fase 0 |
| Proceso de pago (momento) | ✅ Alineado | El pago ocurre después de alineación y aprobación |
| Formularios específicos (F02/F08) | ✅ Corregido | Clasificación automática incorporada al flujo |
| Sistema VAC existente | ✅ Definido | Posicionamiento complementario documentado |
| Inspecciones (secuencia real) | ✅ Alineado | Alineación territorial antes del pago, modelada como estado propio |
| Boleto de Ornato | ✅ Corregido | Incorporado como D-06 en lista L-01 |
| Escritura del inmueble | ✅ Corregido | Incorporada como D-03 en lista L-01 |

---

## 2. Flujo Real de la Municipalidad de Guatemala

Basado en los documentos internos y validado con búsqueda web (Ventanilla Única, approvato.com.gt, tramitargt.com, COM-04-2024):

```
FASE 0: PRE-TRÁMITE (Responsabilidad del Profesional — Externo a la Municipalidad)
  ├─ 1. Verificar zonificación POT del predio (G0-G5)
  ├─ 2. Verificar uso de suelo compatible con el proyecto
  ├─ 3. Obtener resolución ambiental MARN (BIAWEB, Categoría C/CR)
  └─ 4. Obtener solvencias legales: RGP, IUSI, agua/servicios, SAT

FASE 1: INGRESO EN VENTANILLA ÚNICA (Presencial — Palacio Municipal, Zona 1)
  ├─ 5. Seleccionar formulario: F08 (vivienda ≤700m²) o F02 (31-700m²)
  ├─ 6. Armar expediente físico (folder tamaño oficio con gancho)
  │     ├─ Formulario F08/F02 llenado (sin tachones ni corrector)
  │     ├─ DPI propietario (ambas caras)
  │     ├─ Escritura del inmueble (copia)
  │     ├─ Certificación RGP vigente (≤3 meses)
  │     ├─ Solvencia IUSI
  │     ├─ Solvencia agua/servicios
  │     ├─ Boleto de ornato (propietario y profesional)
  │     ├─ Resolución MARN
  │     ├─ Planos arquitectura, estructura, instalaciones (timbrados)
  │     ├─ Memoria de cálculo estructural
  │     ├─ Presupuesto de obra
  │     └─ Cronograma de actividades
  └─ 7. Entrega física en Ventanilla Única (lunes–jueves, horario oficina)

FASE 2: REVISIÓN TÉCNICA (Interna — Dirección de Obras)
  ├─ 8. Asignación a técnico revisor
  ├─ 9. Revisión de cumplimiento POT (zonas, altura, retiros, parqueos)
  ├─ 10. Revisión técnica de planos (estructura, instalaciones)
  ├─ 11a. SIN OBSERVACIONES → avanza a Fase 3
  └─ 11b. CON OBSERVACIONES → notificación al profesional (actualmente: verbal o nota física)
           └─ Profesional corrige y reingresa (presencial) → vuelve a Paso 8

FASE 3: APROBACIÓN Y ALINEACIÓN
  ├─ 12. Alineación territorial: inspector visita el terreno
  ├─ 13. Dictamen favorable emitido por Dirección de Obras
  └─ 14. Determinación del monto de tasa municipal (según m² y tipo de obra)

FASE 4: PAGO
  ├─ 15. Solicitante realiza el pago en caja municipal (presencial)
  └─ 16. Presenta comprobante de pago en Ventanilla Única

FASE 5: EMISIÓN DE LICENCIA
  ├─ 17. Municipalidad emite la licencia de construcción (física)
  └─ 18. Solicitante retira la licencia y coloca rótulo en obra

FASE 6: DURANTE Y POST-OBRA
  ├─ 19. Bitácora de obra: profesional registra visitas y avances
  ├─ 20. Inspección intermedia (opcional, a solicitud o por denuncia)
  └─ 21. Recepción de obra: inspección final + actualización Catastro/IUSI
```

**Tiempo estimado real:** 4–8 semanas en condiciones normales. La etapa más lenta es la revisión técnica (Fase 2), especialmente cuando hay observaciones que requieren reingreso físico del expediente.

---

## 3. Flujo Propuesto en PermisoGT

```
[CLASIFICACIÓN F08/F02] → [BORRADOR] → [VALIDACIÓN AUTOMÁTICA] → [REVISIÓN TÉCNICA] ⇄ [EN CORRECCIÓN]
                                                                        ↓
                                                    [ALINEACIÓN TERRITORIAL PROGRAMADA]
                                                                        ↓
                                                          [PENDIENTE DE PAGO]
                                                                        ↓
                                                          [LICENCIA EMITIDA]
                                                                        ↓
                                                    [RECEPCIÓN DE OBRA] (post-construcción)
```

---

## 4. Comparación Detallada por Fase

### 4.1 Pre-trámite y Verificación de Uso de Suelo

| Aspecto | Real | PermisoGT (Propuesto) | Estado |
| :--- | :--- | :--- | :---: |
| Verificación de zonificación POT | El profesional consulta el POT antes de ingresar | No modelado | ⚠️ |
| Selección de formulario (F08 vs F02) | Determinado por m² y tipo de obra | No contemplado | ⚠️ |
| Consulta de dictamen de uso de suelo | Puede hacerse en [vu.muniguate.com](http://vu.muniguate.com) | No contemplado | ⚠️ |

**Brecha:** El MVP asume que el profesional ya sabe qué tipo de licencia solicitar. En la realidad, la Municipalidad tiene un pre-filtro por m² y tipo de obra que determina el formulario (F08 para vivienda ≤700m², F02 para proyectos de 31–700m² en general). Este pre-filtro debe incorporarse al flujo de creación de solicitud.

**Solución propuesta:** Agregar un paso de "Clasificación del Proyecto" al inicio del formulario, donde el sistema determine automáticamente el formulario aplicable según m² y uso de suelo.

---

### 4.2 Documentos Requeridos (L-01)

*Numeración según la lista final de 15 documentos en [04-tipos-licencia-y-requisitos.md](./04-tipos-licencia-y-requisitos.md) §2.3.*

| Documento | Real (Muni GT) | PermisoGT L-01 | Estado |
| :--- | :---: | :---: | :---: |
| DPI propietario (ambas caras) | ✅ | D-01 ✅ | ✅ |
| Certificación RGP vigente | ✅ | D-02 ✅ | ✅ |
| Escritura del inmueble (copia) | ✅ | D-03 ✅ (incorporada) | ✅ |
| Solvencia IUSI | ✅ | D-04 ✅ | ✅ |
| Solvencia agua/servicios | ✅ | D-05 ✅ | ✅ |
| **Boleto de ornato** (propietario y profesional) | ✅ | D-06 ✅ (incorporado) | ✅ |
| Resolución ambiental MARN | ✅ | D-07 ✅ | ✅ |
| Planos arquitectura (timbrados) | ✅ | D-08 ✅ | ✅ |
| Planos estructurales (timbrados) | ✅ | D-09 ✅ | ✅ |
| Planos instalaciones | ✅ | D-10 ✅ | ✅ |
| Memoria de cálculo estructural | ✅ | D-11 ✅ | ✅ |
| Presupuesto de obra | ✅ | D-12 ✅ | ✅ |
| **Cronograma de actividades** | ✅ | D-13 ✅ (incorporado) | ✅ |
| Formulario municipal (F08/F02) | ✅ (físico) | D-14 ✅ (PDF) | ✅ |
| Comprobante de pago | ✅ | D-15 ✅ | ✅ |

**Documentos que faltaban en la propuesta original (3), ya incorporados a la lista final:**
1. **D-03: Escritura del inmueble** — Copia simple de la escritura pública. Complementa a la Certificación del RGP pero es un requisito independiente confirmado por múltiples fuentes.
2. **D-06: Boleto de Ornato** — Del propietario Y del profesional responsable. Requisito municipal anual obligatorio.
3. **D-13: Cronograma de actividades** — Documento técnico requerido junto con el presupuesto. Confirma el plazo planificado de la obra.

---

### 4.3 Momento del Pago en el Proceso

| Aspecto | Real | PermisoGT (Propuesto) | Estado |
| :--- | :--- | :--- | :---: |
| ¿Cuándo ocurre el pago? | **Después** de la aprobación técnica y la alineación | Después de alineación territorial conforme | ✅ Compatible |
| Modalidad de pago | Caja municipal presencial | **MVP:** pago en línea simulado (señalizado como simulación) + comprobante; integración real en fase posterior | ✅ Compatible |
| ¿Hay cálculo previo visible? | Sí, el técnico determina el monto | Sí, calculado automáticamente | ✅ |

**Nota positiva:** El flujo propuesto coloca el pago **después de la aprobación técnica y de la alineación territorial**, lo cual es correcto y compatible con el proceso real. No hay brecha aquí.

---

### 4.4 Inspecciones

| Tipo de Inspección | Real | PermisoGT (Propuesto) | Estado |
| :--- | :--- | :--- | :---: |
| Alineación territorial (pre-obra) | ✅ Inspector municipal al terreno | ✅ Modelado | ✅ |
| Inspección intermedia (durante obra) | Opcional / por denuncia | ✅ Modelado como "Opcional" | ✅ |
| Recepción de obra (post-obra) | ✅ Obligatoria | ✅ Modelado | ✅ |
| Resultado de inspección documentado | Actualmente en papel | ✅ Formulario digital + fotos | ✅ (mejora) |

---

### 4.5 Sistema VAC Existente (Ventanilla Ágil de Construcción)

Este es el hallazgo más relevante de la búsqueda web: **ya existe una plataforma digital llamada VAC (vac.com.gt)** en Guatemala que digitaliza trámites previos a la licencia municipal, unificando requisitos de MARN, CONRED, Ministerio de Salud, INAB, CONAP y otros.

| Aspecto | VAC Existente | PermisoGT |
| :--- | :--- | :--- |
| Enfoque | Pre-trámites externos (permisos de 3ros) | Trámite municipal (la licencia en sí) |
| Gestiona licencia municipal directamente | ❌ No | ✅ Sí |
| Digitalización de planos y expediente | Parcial | ✅ Completo |
| Módulo de inspecciones | ❌ No | ✅ Sí |
| Seguimiento de observaciones municipales | ❌ No | ✅ Sí |

**Conclusión:** PermisoGT y el VAC son **complementarios, no competidores**. El VAC cubre la fase 0 (permisos externos), mientras PermisoGT cubre las fases 1–6 (el trámite ante la municipalidad). Esto es una fortaleza del posicionamiento del producto.

**Oportunidad de integración:** A mediano plazo, PermisoGT podría importar el número de resolución del MARN directamente desde la API del BIAWEB/VAC en lugar de requerir cargar el PDF manualmente.

---

### 4.6 Proceso de Observaciones y Correcciones

| Aspecto | Real (Actual) | PermisoGT (Propuesto) | Estado |
| :--- | :--- | :--- | :---: |
| Forma de comunicar observaciones | Verbal o nota física | Digital, vinculado al documento | ✅ Mejora significativa |
| Reingreso de correcciones | Presencial (nuevo expediente físico) | Digital desde la plataforma | ✅ Mejora significativa |
| Historial de rondas | No existe | ✅ Log inmutable | ✅ Mejora |
| Notificaciones al solicitante | Ninguna (el profesional debe preguntar) | ✅ Email + notificación in-app | ✅ Mejora |

Este es precisamente el punto donde PermisoGT genera **mayor valor diferencial** respecto al proceso actual.

---

## 5. Brechas y Acciones Correctivas Recomendadas

### Brechas Críticas — Estado Actual

| ID | Brecha | Acción | Estado |
| :--- | :--- | :--- | :---: |
| B-01 | Boleto de Ornato no incluido | Incorporado como D-06 en 04-tipos-licencia | ✅ Resuelto |
| B-02 | Escritura del inmueble no incluida | Incorporada como D-03 en 04-tipos-licencia | ✅ Resuelto |
| B-03 | Cronograma de actividades no incluido | Incorporado como D-13 en 04-tipos-licencia | ✅ Resuelto |
| B-04 | Clasificación por formulario (F08/F02) no modelada | Clasificación automática incorporada en 03-flujo y 04-tipos | ✅ Resuelto |

### Brechas Menores — Estado Actual

| ID | Brecha | Acción Sugerida | Estado |
| :--- | :--- | :--- | :---: |
| B-05 | Integración con VAC no definida | Posicionamiento documentado; importación de resolución MARN en Fase 2 | ⚠️ Fase 2+ |
| B-06 | Horario de recepción (lunes–jueves) sin modelar | Lógica de "ventana de ingreso" en el calendario (Fase 2) | ⚠️ Fase 2 |
| B-07 | Consulta previa de POT/uso de suelo | Enlace a [vu.muniguate.com](http://vu.muniguate.com) en onboarding pre-trámite | ✅ Cubierto (orientativo) |

---

## 6. Compatibilidad General por Área

```
Documentos requeridos       ████████████████████ 100% — 15 documentos incorporados
Secuencia del flujo         ████████████████████ 100% compatible
Roles y responsabilidades   ████████████████████ 100% — F08/F02 mapeados
Proceso de observaciones    ████████████████████ 100% compatible (y superior al actual)
Inspecciones                ████████████████████ 100% — alineación territorial como estado propio
Pago (momento y modalidad)  ████████████████████ 100% compatible
Pre-trámite / POT           ████████████████████ 100% — onboarding orientativo modelado
Coexistencia con VAC        ████████████████████ 100% — posicionamiento complementario definido
```

**Compatibilidad global estimada post-adaptación: ~98%**

*Las brechas menores restantes (B-05: integración API VAC, B-06: horario de recepción) son mejoras operativas, no bloqueos para el MVP.*

---

## 7. Conclusión

La propuesta de PermisoGT está bien fundamentada en el proceso real y ha sido adaptada para cubrir el 100% de las brechas críticas identificadas. Las mejoras incorporadas son:

- **15 documentos** reales requeridos (D-01 a D-15) correctamente mapeados para el formulario F08.
- **Clasificación automática F08/F02** al inicio de cada solicitud.
- **Onboarding pre-trámite** orientativo que guía al profesional antes de crear el expediente.
- **Alineación territorial** modelada como estado propio en el flujo, antes del pago, con agenda digital inspector-solicitante.
- **Posicionamiento frente al VAC** documentado: plataformas complementarias, no competidoras.

El hallazgo del sistema VAC confirma que existe demanda y contexto para una solución digital; PermisoGT ocupa el espacio no cubierto por el VAC: la gestión del expediente municipal.

[Volver al Índice de la Propuesta](./00-indice-propuesta.md)
[Ver tipos de licencia y requisitos](./04-tipos-licencia-y-requisitos.md)
[Ver flujo del expediente digital](./03-flujo-expediente-digital.md)
