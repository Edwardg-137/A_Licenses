# Plan MVP — Alcance, Fases y Criterios de Éxito

## 1. Definición del MVP

El MVP de **PermisoGT** cubre el flujo completo de un único tipo de licencia: **Obra Mayor — Vivienda Unifamiliar** en la Municipalidad de Guatemala. El objetivo es demostrar el valor de la plataforma con un caso de uso real antes de expandir los tipos de licencia y municipios.

### Lo que el MVP SÍ incluye:
- Registro y autenticación de los 4 roles (Solicitante, Revisor, Inspector, Admin).
- Creación de solicitudes de licencia tipo L-01 (Vivienda Unifamiliar, formulario F08 ≤ 700 m²).
- **Clasificación automática** del proyecto al inicio: el sistema determina si aplica F08 o informa al usuario que debe proceder presencialmente.
- **Onboarding pre-trámite** orientativo: checklist guiado de pasos externos (POT, MARN, solvencias) con enlaces a sistemas correspondientes.
- Carga y validación automática de los **15 documentos requeridos** para L-01.
- Flujo completo de estados: Clasificación → Borrador → Validación → Revisión Técnica → Corrección → Alineación Territorial → Pago → Licencia Emitida.
- Sistema de observaciones vinculadas a documentos específicos (máx. 3 rondas configurables).
- Agenda y confirmación de visita de alineación territorial (inspector + solicitante).
- Cálculo de tasa municipal (fórmula F08, configurable a la espera del arancel real) + **pago en línea simulado** (señalizado como simulación) + confirmación por comprobante.
- Notificaciones in-app y por correo electrónico en cada cambio de estado.
- Generación de PDF de licencia con número único y código QR de verificación pública.
- Módulo de Recepción de Obra (inspección final post-construcción).
- Dashboard de métricas básico para el Admin.
- Historial de auditoría inmutable por expediente (exportable en PDF).

### Lo que el MVP NO incluye (Fases posteriores):
- Otros tipos de licencia (L-02 a L-06).
- Integración con APIs externas (SAT, MARN, RGP) para validación de datos.
- App móvil nativa para inspectores.
- Multi-municipio activo (la base está diseñada para ello pero no se configura una segunda instancia).
- Integración directa con el sistema de pago municipal real (el MVP usa un pago simulado claramente señalizado + registro de comprobante).

---

## 2. Fases de Desarrollo

### Fase 0 — Preparación (2 semanas)
- Configuración del repositorio, CI/CD, ambientes (dev / staging).
- Diseño de base de datos y modelo de datos completo.
- Setup de infraestructura (Railway/Render + S3/MinIO).
- Diseño de UI/UX (wireframes de las pantallas principales).

### Fase 1 — Autenticación y Gestión de Usuarios (2 semanas)
**Entregables:**
- [ ] Registro de solicitante (con número de colegiado; la cuenta queda pendiente hasta aprobación manual del Admin).
- [ ] Login con JWT + Refresh Token.
- [ ] Panel de admin para crear/gestionar usuarios internos (revisor, inspector).
- [ ] Guard de roles en todos los endpoints de la API.

### Fase 2 — Expediente, Clasificación y Documentos (3 semanas)
**Entregables:**
- [ ] Checklist de onboarding pre-trámite (Fase 0 orientativa) con enlaces a POT, VAC/BIAWEB y SAT.
- [ ] Paso de clasificación automática F08/F02 al iniciar el expediente.
- [ ] Formulario de creación de solicitud L-01 con todos los campos de datos del proyecto.
- [ ] Carga de los 15 documentos requeridos con validación de formato (MIME type real).
- [ ] Botón "Verificar antes de enviar" con informe de validación por documento.
- [ ] Visualización de documentos en el expediente (PDF inline, DWG como imagen).
- [ ] Transición de estado Borrador → En Validación → En Revisión Técnica.
- [ ] Bandeja de expedientes para el revisor con filtros por estado y fecha.

### Fase 3 — Revisión, Observaciones y Correcciones (2 semanas)
**Entregables:**
- [ ] Interfaz del revisor para marcar documentos (Conforme / Con observación / Requiere reemplazo).
- [ ] Formulario de observación con campo de texto y nivel de prioridad.
- [ ] Transición a estado "En Corrección" con notificación al solicitante.
- [ ] Vista del solicitante para ver observaciones y reemplazar documentos específicos.
- [ ] Historial de rondas de corrección.

### Fase 4 — Alineación Territorial, Pago e Inspección Final (2 semanas)
**Entregables:**
- [ ] Módulo de alineación territorial: revisor genera solicitud, inspector propone fechas, solicitante confirma.
- [ ] Formulario de resultado de alineación para el inspector (texto + foto obligatoria).
- [ ] Transición condicional: Alineación Conforme → Pendiente de Pago / No Conforme → En Revisión Técnica.
- [ ] Cálculo automático de tasa municipal con fórmula configurable (F08).
- [ ] Vista de pago: monto mostrado con desglose + flujo de pago simulado (con banner de "SIMULACIÓN") que genera comprobante, o carga manual de comprobante externo.
- [ ] Confirmación de pago por parte del revisor/Admin.
- [ ] Módulo de Recepción de Obra (solicitud de inspección final post-construcción + resultado).

### Fase 5 — Emisión de Licencia y Cierre (1 semana)
**Entregables:**
- [ ] Generación de PDF de licencia (número único + QR de verificación).
- [ ] Vista pública de verificación de licencia por QR (URL pública).
- [ ] Notificación final al solicitante con la licencia adjunta.
- [ ] Cierre del expediente y registro en métricas.

### Fase 6 — Dashboard y Pulido (1 semana)
**Entregables:**
- [ ] Dashboard del Admin: expedientes por estado, tiempo promedio por fase, documentos más observados.
- [ ] Ajustes de UX basados en pruebas internas.
- [ ] Pruebas de seguridad básicas (OWASP Top 10 checklist).
- [ ] Documentación técnica de la API (Swagger/OpenAPI).

---

## 3. Cronograma Estimado

```
Sem 1-2   │████████│ Fase 0: Setup y diseño
Sem 3-4   │        │████████│ Fase 1: Auth y usuarios
Sem 5-7   │                 │████████████│ Fase 2: Expediente y docs
Sem 8-9   │                              │████████│ Fase 3: Revisión
Sem 10-11 │                                       │████████│ Fase 4: Pago e inspección
Sem 12    │                                                 │████│ Fase 5: Licencia
Sem 13    │                                                      │████│ Fase 6: Dashboard
```

**Duración total estimada del MVP: 13 semanas (~3 meses)**

---

## 4. Criterios de Éxito del MVP

Para considerar el MVP exitoso, se deben cumplir los siguientes criterios al finalizar:

| Criterio | Medición |
| :--- | :--- |
| Flujo completo funcional de punta a punta | Demostración en ambiente staging con datos reales de prueba |
| Clasificación automática F08/F02 | El sistema clasifica correctamente el 100% de los casos de prueba |
| Validación automática de documentos | 100% de los 15 documentos del tipo L-01 (F08) validados correctamente |
| Sistema de observaciones | El revisor puede registrar y el solicitante puede corregir sin contacto fuera de la plataforma |
| Alineación territorial digital | Inspector confirma visita, registra resultado con foto, y el estado avanza automáticamente |
| Licencia generada como PDF | PDF descargable con número único y QR verificable desde URL pública |
| Tiempo de carga de expediente | < 3 segundos en conexión estándar guatemalteca (10 Mbps) |
| Sin errores críticos en prueba | 0 errores de pérdida de datos o acceso no autorizado |

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
| :--- | :---: | :--- |
| Resistencia al cambio por parte del personal municipal | Alta | Capacitación y onboarding; diseño UX simplificado para revisores |
| Documentos DWG difíciles de previsualizar en web | Media | Conversión a imagen PNG/SVG en backend al subir; descarga del original |
| Inconsistencia en los requisitos reales de cada municipio | Media | Módulo de configuración flexible por Admin sin código |
| Baja conectividad en algunas municipalidades | Baja-Media | UI optimizada, archivos comprimidos, modo offline para consultas |
| Cambios en reglamentos municipales o MARN | Media | Lista de requisitos configurable por Admin, sin hardcodear |
| Horario de recepción limitado (lunes–jueves) sin modelar | Baja | Agregar lógica de "ventana de ingreso" en el calendario en Fase 2 |
| Confusión con el sistema VAC existente | Baja | Posicionar claramente en onboarding: VAC = pre-trámites externos, PermisoGT = licencia municipal |

---

## 6. Próximos Pasos Sugeridos

1. **Validar la propuesta** con un representante de la Ventanilla Única de la Municipalidad de Guatemala (Palacio Municipal, zona 1).
2. **Revisar formularios F08 y F02** actuales para mapear campo por campo el formulario digital interno.
3. **Definir el equipo de desarrollo** (roles mínimos: 1 fullstack senior, 1 frontend, 1 diseñador UX).
4. **Iniciar Fase 0** con el diseño de la base de datos y los wireframes de las pantallas principales.
5. **Gestionar acceso de prueba** al sistema de pago externo de la municipalidad para la integración del comprobante.
6. **Definir el piloto**: seleccionar 5–10 profesionales colegiados que ingresen expedientes reales de vivienda para validación.
7. **Documentar el posicionamiento frente al VAC**: preparar material informativo para que el piloto entienda la diferencia entre ambas plataformas.

[Ver arquitectura y stack](./05-arquitectura-y-stack.md)
[Volver al Índice](./00-indice-propuesta.md)
