# Ampliación de tipos de licencia — Mapeo F02 / F11 / F04 (pre-implementación)

> **Fecha:** 2026-08-11  
> **Estado:** Mapeo acordado; **Inc. A (F02/L-02) implementado** (2026-08-11). Inc. B–E pendientes.  
> **Fuentes:** `Docs/formularios/FORMULARIO_F02_V12.pdf`, `FORMULARIO_F08_V8.pdf`, `FORMULARIO_F11_MODIFICACIÓN_LIGERA_V9.pdf`, `Formulario_F04_PRORROGA_DE_LICENCIA_V3.pdf`; `Docs/mvp_docs/04-tipos-licencia-y-requisitos.md`; código actual (`ProjectFormDataDto`, `applications.service.classify`, seed L-01).  
> **Confirmado por producto (2026-08-11):** L-03 = F11; L-06 = F04; F13 fuera del primer incremento; aranceles siguen **provisionales**.  
> **Decisiones de alcance Inc. A (2026-08-11):** solo A; rechazo en línea si área > 700; extras documentales D-16…D-21 opcionales; F11 omitirá alineación+pago (Inc. B); L-06 solo licencias PermisoGT (Inc. C); enum `uso` ampliado a COMERCIAL/INDUSTRIAL.

---

## 1. Objetivo

Extender PermisoGT más allá de L-01/F08 sin romper el flujo existente, mapeando formularios municipales a `LicenseType` + clasificación + `formData` + `DocumentRequirement` + `feeFormula`.

## 2. Mapa tipo ↔ formulario

| Código | Nombre propuesto | Formulario | Notas |
| :--- | :--- | :--- | :--- |
| **L-01** | Obra Mayor — Vivienda Unifamiliar | **F08** | Ya implementado. Sin cambios de comportamiento. |
| **L-02** | Obra Mayor — Comercial / Mixto / General (vía F02) | **F02** | Primer candidato de incremento. Cubre solicitud municipal de obra fuera del perfil F08 (uso no unifamiliar F08, mixto/comercial, u obra F02 ≤ 700 m²). |
| **L-03** | Obra Menor — Modificaciones ligeras | **F11** | Confirmado. Trámite **sin costo** según el propio F11. |
| **L-04** | Movimiento de tierras | **F02** (subtipo `obraTipo=MOVIMIENTO_TIERRAS`) | Campos en F02 §5.E (volumen m³). Requisitos documentales aún provisionales (falta guía VU). |
| **L-05** | Urbanización / Lotificación | **F02** (subtipo fraccionamiento/urbanización) | F02 §4: urbanización a partir de 5 predios; fraccionamiento 1–4. Requisitos provisionales. |
| **L-06** | Prórroga de licencia | **F04** | Confirmado. Prórroga de licencia **autorizada y vigente** (no “renovación de vencida” genérica). |
| — | Acuerdo COM-59-2023 | **F13** | Disponible; **no** en el primer incremento. |

### 2.1 Alcance del F02 real vs. docs MVP

El F02 V12 **no** es solo “comercial 31–700 m²”. Es un formulario multipropósito con tipos de solicitud (marcar con X):

- Licencia / Obra  
- Fraccionamiento / Urbanización  
- Uso del suelo  
- Localización industrial  
- Localización de establecimiento abierto al público  
- Factibilidad específica  
- Tala de árboles  

Y dentro de obra (§5): construcción nueva, ampliación, remodelación, demolición, movimiento de tierras, urbanización, cambio de uso de suelo, más estructuras (piscina, techo, antenas, muro, cimentación en subsuelo).

**Implicación:** en producto conviene modelar F02 como formulario + **subtipo de solicitud**, no como un único `LicenseType` rígido. Propuesta pragmática para v1:

| Subtipo F02 en línea (v1) | `LicenseType` |
| :--- | :--- |
| Obra / construcción (no elegible F08) | **L-02** |
| Movimiento de tierras | **L-04** (fase posterior) |
| Fraccionamiento / urbanización | **L-05** (fase posterior) |
| Solo factibilidad / localización / tala / uso de suelo sin obra | **Fuera de línea** (mensaje presencial) hasta tener guías |

---

## 3. Reglas de clasificación (árbol propuesto)

Sustituye el “solo F08 o rechazo” actual (`applications.service.classify` + wizard frontend).

```
1) ¿Es prórroga de licencia existente? → F04 / L-06
2) ¿Es modificación ligera (catálogo F11 + límites m²)? → F11 / L-03
   - No aplica Centro Histórico / conjuntos / amortiguamiento
3) ¿Califica F08?
   - uso RESIDENCIAL unifamiliar
   - área total de obra ≤ 700 m²
   - NO centro histórico / amortiguamiento / Santa Clara / EAP
   - NO cambio de uso de suelo
   - NO requiere EMPAGUA (según nota del F08; flag declarado)
   → F08 / L-01
4) ¿Obra / construcción con área 31–700 m² (u otros usos F02 obra)? → F02 / L-02
5) ¿Movimiento de tierras (volumen m³)? → F02 / L-04 (cuando se active)
6) ¿Fraccionamiento ≥1 predio / urbanización ≥5? → F02 / L-05 (cuando se active)
7) Resto (área > 700, solo factibilidad, CH sin ruta, etc.) → no disponible en línea
```

### 3.1 Matriz rápida F08 vs F02 (obra)

| Criterio | F08 (L-01) | F02 obra (L-02) |
| :--- | :--- | :--- |
| Uso | Residencial unifamiliar | Mixto / comercial / industrial / otros usos del §6 F02 |
| Área | ≤ 700 m² | Típicamente 31–700 m² (fuera F08) |
| Centro Histórico | No | Sección §10 del F02 (ruta distinta; **v1: fuera de línea** salvo decisión contraria) |
| Cambio de uso de suelo | No | Puede marcarse (§5.G); v1: permitir flag + docs extras o deferir |
| Fraccionamiento | Hasta 4 predios (ya en nota F08) | Urbanización ≥ 5 → L-05 |

---

## 4. Mapeo de campos → `formData` (JSON)

Modelo actual (`ProjectFormDataDto`):  
`direccionExacta`, `zona`, `areaConstruccionM2`, `niveles`, `uso` (RESIDENCIAL\|MIXTO), `centroHistorico?`, `finca`, `folio`, `libro`, `nitPropietario`, `presupuestoEstimadoQ?` (+ colegiado del perfil).

### 4.1 Campos compartidos (todos los tipos)

| Campo sistema | F08 | F02 | F11 | F04 | Req. |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `direccionExacta` | ✅ | ✅ | ✅ | ✅ | Sí |
| `zona` | ✅ | ✅ (derivable) | ✅ | ✅ | Sí |
| `finca` / `folio` / `libro` | ✅ | ✅ | ✅ | ✅ | Sí |
| `nitPropietario` | ✅ (MVP) | — explícito | — | — | Mantener en L-01/L-02; opcional en L-03/L-06 |
| `colegiado*` (perfil) | ✅ | ✅ (varios profesionales) | Condicional | No típico | Ver ambigüedad A-3 |
| `centroHistorico` | Bloquea | §10 | Bloquea | — | Sí |
| `aceptaConfidencialidadCom21` | ✅ F08 | ✅ F02 | ✅ F11 | ✅ F04 | Nuevo (COM-21-2026) |
| `tieneServidumbre` | ✅ | ✅ | implícito en DJ | — | Nuevo booleano |
| `dpiSolicitante` / tipo persona | Parcial | ✅ | ✅ | ✅ | Nuevo según tipo |

### 4.2 L-01 / F08 — sin romper (solo alinear opcionales)

| Campo municipal F08 | Campo sistema | Acción |
| :--- | :--- | :--- |
| Tipo solicitud (Licencia / Obra / Fraccionamiento / Tala) | `tipoSolicitudF08[]` | Opcional v2; hoy implícito “licencia obra” |
| Área terreno RGP | `areaTerrenoM2` | **Agregar** (útil y ya en PDF) |
| Obra: A–E + H.1–H.3 con áreas | `obraDetalle` | Opcional; hoy basta `areaConstruccionM2` |
| Unidades habitacionales 1–4 | `unidadesHabitacionales` | **Agregar** (1–4) |
| Tiempo ejecución (años) + justificación >2 | `tiempoEjecucionAnios`, `justificacionPlazo` | **Agregar** |
| Varios propietarios / cantidad | `variosPropietarios`, `cantidadPropietarios` | **Agregar** |
| Tala de árboles | `talaArboles` + motivo | Flag; si sí → requisitos DMA |
| NRD-3 SI/NO | `declaraNrd3` | Checkbox declaración |
| Gestor autorizado | `gestorDpi`, `gestorNombre` | Opcional |

### 4.3 L-02 / F02 — wizard (primer incremento)

Campos **mínimos** propuestos para crear expediente F02 en línea:

| Campo | Tipo | Requerido | Origen F02 |
| :--- | :--- | :---: | :--- |
| `tiposSolicitud` | enum[] | ✅ ≥1 | §1 (al menos `LICENCIA` u `OBRA`) |
| `uso` | ampliar a `RESIDENCIAL` \| `MIXTO` \| `COMERCIAL` \| `INDUSTRIAL` \| `OTRO` | ✅ | §6 |
| `areaConstruccionM2` | number | ✅ | §5 A–C (suma o área principal) |
| `areaTerrenoM2` | number | ✅ | §2 |
| `niveles` | int | ✅ | implícito “todos los niveles” §6 |
| `obraTipos` | enum[] + áreas | ✅ | §5 A–H |
| `descripcionTrabajos` | text | ✅ | §5 narrativa |
| `usoSueloActual` / `usoSueloFinal` | JSON categorías m² | Recomendado | §6 (tabla 1–13) |
| `tiempoEjecucionAnios` | 1–4+ | ✅ | §5 |
| `actividadesCondicionadas` | bool map | No (v1) | §7 — diferir UI compleja |
| `estacionamientos` | number + flag reducción | No (v1) | §8–9 |
| `informeIndustrial` | NONE \| SIMPLE \| COMPLETO | Si industrial | §13 |
| `talaArboles` | bool + motivo | ✅ | §15 |
| Profesionales (planificación, estructural, ejecución, industrial) | objetos | Parcial | §17 — v1: usar perfil + campos opcionales extra |

**Fuera de v1 F02 (mensaje “presencial / fase posterior”):** solo factibilidad, solo localización, solo tala sin obra, Centro Histórico con ruta IDAEH, incentivos vivienda prioritaria, publicidad/unipolares detallados.

### 4.4 L-03 / F11 — modificaciones ligeras

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `trabajosF11` | enum[] | Catálogo del form (pintura, vanos, techo lámina→losa ≤30, ampliación ≤30, cisterna, PTAR, muros ≤100, techo ≤100, pérgola, NRD-2, otros) |
| `areaIntervencionM2` | number | Validar vs límites del trabajo elegido |
| `usoAmbito` | `UNIFAMILIAR_BIFAMILIAR` \| `RESIDENCIAL_O_NO` | Dos columnas del F11 |
| `declaraNrd3` | bool | Sección III |
| RGP + dirección + DPI | como compartidos | |

Validaciones duras:

- Centro histórico → no disponible.  
- Ampliación / lámina→losa → `areaIntervencionM2 ≤ 30`.  
- Muros / reparación techo / lámina×lámina → `≤ 100`.  

### 4.5 L-06 / F04 — prórroga

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `licenciaNumero` | string | “Número de licencia autorizada y vigente” |
| `licenciaFechaEmision` | date | |
| `licenciaFechaVencimiento` | date | Debe estar vigente al solicitar |
| `motivoProrroga` | text | |
| `numeroProrroga` | int | 1ª, 2ª, … |
| `mesesVigencia` | int | Relleno municipal / configurable |
| `costoLicenciaOriginalQ` | number | Base del cálculo (declarado o desde expediente previo si existe enlace) |
| `licenseId` | uuid? | Si la licencia fue emitida en PermisoGT, enlazar |

---

## 5. Documentos requeridos (propuesta)

### 5.1 L-01 / F08 — sin cambio

D-01…D-15 actuales. D-14 = formulario F08 firmado.

### 5.2 L-02 / F02 — baseline = L-01 + ajustes (provisional sin guía VU)

| Código | Documento | Notas |
| :--- | :--- | :--- |
| D-01…D-06 | Igual L-01 | |
| D-07 | MARN | Categoría según proyecto (no solo C/CR) |
| D-08…D-13 | Planos / memoria / presupuesto / cronograma | Igual |
| D-14 | Formulario municipal **F02** firmado | Cambiar texto vs F08 |
| D-15 | Comprobante pago | Etapa `PAGO` |
| D-16 | Factibilidad Gestión Urbana (FGU) | Condicional comercial/edificio (mvp §3) |
| D-17 | Dictamen CONRED (NRD-1/2) | Condicional |
| D-18 | Planos seguridad / evacuación | Condicional |
| D-19 | Factibilidad EMPAGUA | Condicional |
| D-20 | Informe industrial (simple/completo) | Si `informeIndustrial` ≠ NONE |
| D-21 | Requisitos DMA tala | Si `talaArboles` |

En v1 se pueden marcar D-16…D-21 como `required: false` o `required` según flags del formulario, hasta tener la guía oficial.

### 5.3 L-03 / F11 — lista del propio formulario (pág. 2)

| Código | Documento | Obligatorio |
| :--- | :--- | :---: |
| M-01 | DPI propietario / representante (vigente; pasaporte si extranjero) | ✅ |
| M-02 | Fotografías color construcción actual (mín. 2; internas/externas/área a intervenir) | ✅ |
| M-03 | Planos construcción actual + área a intervenir (escala legible; mano o digital) | Condicional* |
| M-04 | Constancia colegiado activo | Condicional* |
| M-05 | Resolución/informe NRD-2 (autorización CONRED) | Solo si trabajo NRD-2 |
| M-06 | Formulario F11 firmado | ✅ |

\*Obligatorios cuando el trabajo exige profesional (ampliación, lámina→losa, muros, cisterna, PTAR, pérgola, etc. según marcas “aplica firma y sello”).

**No** se exigen D-07…D-13 tipicos de obra mayor en F11.

### 5.4 L-06 / F04 — provisional (el PDF no trae checklist)

| Código | Documento | Obligatorio |
| :--- | :--- | :---: |
| P-01 | DPI solicitante | ✅ |
| P-02 | Copia de licencia municipal vigente | ✅ |
| P-03 | Formulario F04 firmado | ✅ |
| P-04 | Solvencia IUSI / municipal (si la práctica VU lo exige) | Opcional hasta confirmar |
| P-05 | Comprobante de pago de prórroga | Etapa `PAGO` |

---

## 6. Impacto en `feeFormula` (provisional)

Misma estructura JSON configurable; valores de seed **provisionales**.

| Tipo | Fórmula propuesta (seed) | Notas |
| :--- | :--- | :--- |
| L-01 F08 | `{ base: 500, porcentajePresupuesto: 0.001 }` | Actual; sin cambio |
| L-02 F02 | `{ base: 800, porcentajePresupuesto: 0.0015 }` | Provisional distinto de F08 para distinguir en UI |
| L-03 F11 | `{ base: 0, porcentajePresupuesto: 0 }` | Alineado a “no generan ningún costo”. Flujo: **saltar pago** o auto-confirmar monto 0 → emisión/cierre según regla de negocio |
| L-04 / L-05 | TBD | Misma forma `base + %` provisional cuando se activen |
| L-06 F04 | `{ tipo: 'PRORROGA', primeraFraccion: 0.5, siguientesFraccion: 0.25 }` | Sobre `costoLicenciaOriginalQ`. Extiende el calculador actual (hoy solo base+%) |

**Implicación de ingeniería L-03:** el pipeline `PENDIENTE_DE_PAGO` debe aceptar monto 0 (o transición directa post-aprobación técnica / sin alineación — ver ambigüedad A-5).

**Implicación L-06:** calculador de pagos debe soportar modo prórroga; D-15/P-05 sigue siendo fuente de verdad del comprobante (D-012).

---

## 7. Componentes afectados (cuando se implemente)

- `backend/prisma/seed.ts` — nuevos `LicenseType` + requirements  
- `applications` — `classify()` multi-ruta; DTOs por tipo o `formData` versionado  
- `payments` — fórmulas prórroga y monto 0  
- `frontend/solicitante/nueva` — clasificación + wizards por `formCode`  
- Posible decisión D-016 (clasificación multi-formulario) al implementar  
- Status + changelog al cerrar cada incremento  

**No tocar** comportamiento L-01 existente salvo ampliaciones opcionales de campos no breaking.

---

## 8. Plan de implementación sugerido (incrementos)

| Inc. | Contenido | Depende de ambigüedades |
| :---: | :--- | :--- |
| **A** | Clasificación F08 vs F02 + seed L-02 + wizard campos mínimos F02 + docs baseline + fee provisional | A-1, A-2, A-4 |
| **B** | L-03 / F11 completo (catálogo trabajos, docs M-*, fee 0, flujo sin pago o pago 0) | A-5, A-6 |
| **C** | L-06 / F04 (enlace a licencia, fee 50%/25%, docs P-*) | A-7, A-8 |
| **D** | L-04 / L-05 como subtipos F02 | Guía requisitos |
| **E** | F13 (si se pide) | PDF legible / alcance legal |

---

## 9. Ambigüedades — resueltas (2026-08-11)

| ID | Decisión |
| :--- | :--- |
| **A-1** | Solo **Inc. A (F02/L-02)** ahora. |
| **A-2** | **Rechazo en línea** si `area > 700` (presencial). |
| **A-3** | v1: solo colegiado del solicitante (como L-01). Profesionales múltiples → fase posterior. |
| **A-4** | Incluir **D-16…D-21 opcionales** además de D-01…D-15 (D-14 = F02). |
| **A-5** | F11 (Inc. B): **omite alineación + pago**. |
| **A-6** | F11: sin alineación (implícito en A-5). |
| **A-7** | L-06: **solo licencias emitidas en PermisoGT**. |
| **A-8** | Pendiente al Inc. C (hipótesis: bloquear si vencida). |
| **A-9** | Ampliar `uso` a **COMERCIAL / INDUSTRIAL** ya. |

---

## 10. Riesgos

- Sin guía VU de requisitos F02, la lista documental puede desviarse de la práctica real.  
- El F02 §7 (actividades condicionadas POT) es demasiado amplio para un wizard v1.  
- F11 “sin costo” choca con el flujo actual centrado en pago → emisión (D-014); hay que definir rama.  
- F04 depende de datos de una licencia previa; licencias externas complican verificación.  

## 11. Compatibilidad

- L-01/F08 permanece el camino por defecto para el perfil actual.  
- Multi-tenant `tenantId` (D-002) sin cambio.  
- Aranceles provisionales explícitos en UI (como hoy).  

---

## 12. Estado de implementación Inc. A

✅ Implementado 2026-08-11:

- `backend/src/applications/classification.ts` + create con `formCode` dinámico
- Seed L-02 + D-16…D-21 opcionales
- Frontend `nueva/` + `lib/classification.ts`
- D-016 y docs de status/changelog

Pendiente (no Inc. A): Inc. B F11, Inc. C F04, L-04/L-05, F13.

## 13. Próximo paso

Inc. B (L-03/F11) cuando se priorice: fee 0, omitir alineación+pago, catálogo de trabajos y docs M-*.
