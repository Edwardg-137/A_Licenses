Protocolo General de Trabajo

Estas reglas deben cumplirse durante toda la sesión de trabajo y tienen prioridad sobre cualquier tarea específica, salvo que el usuario indique explícitamente lo contrario.

1. Objetivo de la documentación

La carpeta Docs constituye la documentación oficial del proyecto y debe mantenerse sincronizada con el código en todo momento.

Su finalidad es permitir que cualquier desarrollador o agente de IA pueda comprender rápidamente el estado, la arquitectura y las decisiones del proyecto sin necesidad de analizar todo el código fuente.

La documentación nunca debe describir funcionalidades inexistentes como si estuvieran implementadas. Las características futuras deberán identificarse claramente como propuestas, pendientes o planificadas.

Estructura de documentación
Docs/
│
├── status/
│   ├── general.md
│   ├── structure.md
│   ├── architecture.md
│   └── decisions.md
│
├── implementations/
│   ├── AAAA-MM-nombre-del-cambio.md
│   └── ...
│
└── changelog.md
2. Documentación del estado (Docs/status)

Antes de realizar cualquier cambio que no sea trivial, deberá consultarse la documentación existente para comprender el funcionamiento actual del proyecto.

Una vez finalizada la implementación, deberán actualizarse únicamente los documentos afectados.

general.md

Describe el proyecto desde una perspectiva funcional.

Debe contener:

objetivo de la aplicación;
descripción general del funcionamiento;
funcionalidades existentes;
flujo general del sistema;
tecnologías utilizadas;
dependencias importantes;
limitaciones conocidas;
diferencias entre plataformas (Android, Windows, Linux, Web, etc.);
cualquier información necesaria para comprender rápidamente el proyecto.

No debe documentar detalles internos del código.

structure.md

Documenta la organización del proyecto.

Para cada carpeta importante deberá indicarse:

propósito;
responsabilidad;
archivos principales;
relación con otros módulos cuando sea relevante.

No es necesario incluir archivos generados automáticamente, temporales o sin relevancia arquitectónica.

architecture.md

Describe la arquitectura técnica del proyecto.

Debe incluir, cuando corresponda:

arquitectura utilizada;
flujo de datos;
comunicación entre módulos;
patrones de diseño empleados;
servicios internos;
servicios externos;
APIs;
bases de datos;
almacenamiento;
autenticación;
sincronización;
procesamiento local o remoto.

Este documento debe explicar cómo funciona internamente el sistema, no cómo está organizado el código.

decisions.md

Registro permanente de decisiones técnicas importantes.

Cada decisión deberá incluir como mínimo:

fecha;
contexto;
problema;
decisión tomada;
justificación;
consecuencias.

Este documento sirve como historial técnico del proyecto para comprender por qué se eligieron determinadas soluciones.

3. Propuestas de implementación (Docs/implementations)

Toda funcionalidad nueva, refactorización importante, corrección significativa o cambio arquitectónico deberá planificarse antes de comenzar la implementación.

Para ello se creará un documento Markdown con el formato:

AAAA-MM-descripcion-del-cambio.md

El documento deberá incluir, cuando corresponda:

objetivo;
problema identificado;
solución propuesta;
arquitectura propuesta;
componentes afectados;
flujo esperado;
riesgos;
ventajas;
compatibilidad con el sistema actual;
plan de implementación.

Si durante el desarrollo la solución cambia de forma importante, el documento deberá actualizarse para reflejar el resultado final.

Estos documentos constituyen el historial técnico de las implementaciones realizadas.

4. Registro de cambios (Docs/changelog.md)

El archivo changelog.md mantiene un historial resumido de la evolución del proyecto.

Cada modificación importante deberá registrar:

fecha;
nombre del cambio;
breve descripción;
documentos actualizados;
impacto general.

No debe sustituir la documentación técnica ni los documentos de implementación.

5. Cambios triviales

Se consideran cambios triviales aquellos que no modifican el comportamiento del sistema ni su arquitectura.

Ejemplos:

correcciones ortográficas;
cambios de formato;
comentarios;
renombrado simple de variables;
pequeños ajustes visuales;
reorganización menor del código sin alterar su funcionamiento.

Estos cambios no requieren crear un documento en implementations ni actualizar status, salvo que afecten a la comprensión general del proyecto.

Ante la duda, el cambio deberá tratarse como no trivial.

6. Flujo de trabajo obligatorio

Toda tarea importante deberá seguir el siguiente proceso:

Consultar la documentación existente en Docs/status.
Analizar el alcance e impacto del cambio.
Crear (o actualizar) el documento correspondiente en Docs/implementations.
Implementar la solución.
Verificar que el código sea consistente y funcional.
Actualizar la documentación afectada en Docs/status.
Registrar el cambio en Docs/changelog.md.
Confirmar que la documentación quedó sincronizada con el estado real del proyecto.
7. Consistencia

El código fuente siempre tendrá prioridad sobre la documentación.

Si existe una discrepancia entre ambos, deberá asumirse que la documentación está desactualizada y corregirse para reflejar el comportamiento real del sistema.

La documentación nunca deberá inventar comportamientos ni asumir implementaciones que no existan.

8. Criterios de calidad

Durante cualquier implementación deberán respetarse los siguientes principios:

Mantener un código claro, legible y modular.
Evitar duplicación innecesaria.
Reutilizar componentes existentes cuando sea posible.
Mantener la coherencia con la arquitectura del proyecto.
No introducir dependencias innecesarias.
Priorizar soluciones simples antes que complejas.
Documentar únicamente aquello que aporte valor para el mantenimiento futuro.
Mantener sincronizados el código y la documentación al finalizar cada tarea.