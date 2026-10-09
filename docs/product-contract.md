# Contrato de producto

Estado: diseño acordado para orientar las siguientes entregas. No describe todas las capacidades actuales. Nombre provisional: Standards Auditor.

## Producto y alcance

Un paquete npm escrito en TypeScript que cada equipo instala en su proyecto para auditar estándares configurables. El motor coordina reglas, evidencia y reportes; los adaptadores conocen un lenguaje o herramienta. Angular será un perfil opcional, no una dependencia del motor.

La instalación será local con `npm install --save-dev standards-auditor` y la ejecución mediante `npx standards-auditor check`, una vez publicado el paquete. Actualmente el paquete no está publicado en npm y se distribuye como archivo `.tgz` en las Releases de GitHub. Requiere Node.js compatible incluso al analizar otros lenguajes; la portabilidad se verificará en Windows, Linux y macOS.

El producto tendrá tres capacidades relacionadas:

1. Conservar las convenciones del equipo en Markdown y asociarlas a archivos y perfiles.
2. Auditar automáticamente criterios verificables, con resultados reproducibles.
3. Preparar y, opcionalmente, generar pruebas siguiendo esas convenciones, validándolas con las herramientas del proyecto.

El núcleo funcionará localmente sin IA. La generación asistida será optativa, mediante exportación de contexto primero y un proveedor configurable después. No se promete convertir cualquier texto en una regla ejecutable ni soportar cualquier lenguaje desde el primer lanzamiento.

## Guías, reglas y observaciones

| Tipo                   | Ejemplo                                               | Cómo se utiliza                                                      |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Guía Markdown          | Probar comportamientos públicos con fixtures pequeñas | Contexto para planificación, generación y revisión                   |
| Regla automática       | Cobertura de branches de al menos 85%                 | Detector, parámetros, ámbito y evidencia comprobable                 |
| Observación contextual | Este caso parece duplicar otro                        | Sugerencia explicada; requiere revisión, no certifica incumplimiento |

Agregar un Markdown conservará el original y su procedencia. El sistema podrá proponer una clasificación; el equipo activará explícitamente reglas con detectores existentes. Las secciones sin detector permanecerán como instrucciones o criterios de revisión. Las instrucciones del documento no se ejecutarán como comandos.

La [clasificación de la guía aportada](rule-catalog.md) mantiene las excepciones del original. El [contrato de configuración](configuration-contract.md) define cómo se seleccionan y sobrescriben estándares.

## Recorrido del desarrollador

Los comandos nuevos de esta tabla son propuestas; consultar la sección de estado antes de utilizarlos.

| Paso            | Experiencia propuesta                           | Resultado                                                           |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Inicializar     | `standards-auditor init`                        | Configuración y selección explícita de perfil                       |
| Adjuntar reglas | `standards-auditor rules add ./unit-testing.md` | Copia preservada, asociación de ámbito y propuesta de clasificación |
| Auditar         | `standards-auditor check`                       | Resumen breve y resultado reproducible                              |
| Investigar      | `standards-auditor check --open`                | Reporte HTML local con detalle bajo demanda                         |
| Planear pruebas | `standards-auditor tests plan`                  | Casos, archivos, dependencias y dudas; sin editar código            |
| Generar         | `standards-auditor tests generate`              | Cambios acotados en pruebas según plan explícito                    |
| Verificar       | `standards-auditor tests verify`                | Runner, comprobación de tipos y cobertura nueva                     |
| Integrar        | Revisión del diff y ejecución en CI             | Evidencia y política de bloqueo iguales a las locales               |

`check` no ejecutará código del proyecto. `tests verify` sí ejecutará herramientas configuradas explícitamente por el equipo. Auditar artefactos existentes y ejecutar pruebas serán acciones distinguibles.

## Evidencia y resultados

Una regla automática devolverá `pass`, `fail`, `not-applicable` o `not-evaluated`, junto con identificador, severidad, archivos, evidencia y explicación. Una sugerencia contextual tendrá un tipo separado y nunca se contabilizará como una comprobación aprobada.

- `pass`: criterio comprobado y satisfecho.
- `fail`: evidencia suficiente de incumplimiento.
- `not-applicable`: el perfil o lenguaje no corresponde al archivo analizado.
- `not-evaluated`: falta evidencia, el formato no es compatible o el análisis está incompleto.

Un ámbito configurado que no encuentra archivos generará un diagnóstico explícito; no probará cumplimiento. Un archivo sin prueba asociada significa que no se encontró una coincidencia según los patrones configurados, no que ningún test lo ejercite. La cobertura y la asociación por nombres se mostrarán por separado.

El reporte registrará versión del motor, configuración efectiva y su hash, versiones/hashes de packs y guías, raíz, ámbito, exclusiones, límites de inventario, fecha y procedencia de artefactos. La misma entrada y evidencia producirán los mismos resultados, descontando metadatos temporales. Una propuesta generada por IA no tendrá esa garantía.

### Cobertura

Cada métrica conservará su numerador y denominador cuando estén disponibles. Se distinguirán política sin definir, artefacto ausente, formato inválido, métrica no disponible, cero real y dato importado sin garantía de actualidad. La fecha de modificación no demostrará que el reporte pertenece al código actual.

El equipo seleccionará mínimos globales o por archivo, ámbito y cuatro métricas: statements, branches, functions y lines. Los porcentajes globales no serán promedios de porcentajes por archivo. Un resumen global de otro ámbito no servirá para certificar el ámbito seleccionado. Una futura verificación propia registrará comando, resultado y hashes del código para vincular evidencia a la ejecución.

El 85% mínimo y 90% preferido pertenecen al perfil aportado. No son estándares universales ni un techo de cobertura. Cobertura alta tampoco demuestra calidad del comportamiento probado.

### Versiones, changelogs y documentación

Módulos optativos e independientes. SemVer verificará sintaxis y coherencia de una versión declarada; recomendar un incremento requerirá base de comparación e intención de cambio declarada. La compatibilidad real de una API no se deduce del número de versión.

En una PR se validará la intención pendiente de publicación, por ejemplo un changeset. En una publicación se verificará la correspondencia entre versión y entrada final del changelog. Los cambios sin impacto publicable podrán declararse como tales. El auditor integrará herramientas existentes y no publicará paquetes durante `check`.

Documentación podrá exigir archivos, secciones y enlaces locales válidos. La presencia de un README no certificará que su contenido sea correcto o suficiente.

## Presentación

Consola por defecto: estado, errores, advertencias, comprobaciones incompletas y hasta tres acciones prioritarias. Detalles completos bajo una opción explícita. JSON para CI y HTML autocontenido para exploración, sin servicios externos obligatorios.

El HTML mostrará métricas resumidas y desplegables para árbol, evidencia y reglas. Cada indicador usará texto además de color. “Sin dato” nunca se representará como 0%. El árbol permitirá distinguir prueba asociada, sin asociación, excluido del ámbito y cobertura disponible o desconocida. Los límites de inventario serán visibles. El navegador se abrirá solo con `--open`; generar HTML no lo abrirá automáticamente.

## Generación y límites de modificación

El plan leerá fuentes completas, contratos de dependencias y pruebas existentes, e identificará comportamiento público, casos y evidencia faltante. No inventará APIs. La guía Angular limitará las propuestas a facades y servicios salvo una excepción solicitada por el equipo.

La generación modificará exclusivamente pruebas y fixtures previstas en el plan, conservará pruebas válidas y entregará un diff revisable. No cambiará producción, umbrales, exclusiones, dependencias ni configuración para conseguir una ejecución verde. Un problema de diseño se explicará como propuesta independiente. No migrará suites a otro runner sin incluir esa migración en el alcance.

La validación ejecutará comandos registrados por el proyecto, con argumentos explícitos, tiempo máximo y captura de salida. No ejecutará comandos extraídos del Markdown. Se permitirán como máximo dos intentos de reparación automática por defecto; el límite será configurable. Si falla, conservará el diff y el diagnóstico y no declarará éxito. Pasar tests y tipos no certificará por sí solo que todos los casos de negocio están cubiertos.

El proveedor de generación y el envío de código a servicios externos quedan pendientes de elección. La auditoría determinista no dependerá de esa decisión.

## Arquitectura y evolución

Un repositorio y un paquete inicial con módulos internos: configuración, núcleo, detectores, adaptadores, planificación/generación, validación y reportes. Los reportes consumirán un único modelo de resultados; no volverán a ejecutar reglas.

Un pack declarativo reutilizará detectores disponibles. Un adaptador implementará descubrimiento, análisis o lectura de evidencia específicos. No se cargarán plugins de código arbitrario en el MVP. Los packs publicados posteriormente tendrán versiones y compatibilidad declaradas, se instalarán como dependencias y quedarán fijados por el lockfile del proyecto.

Desarrollo sobre `main` protegida y ramas cortas `feat/…`, `fix/…` o `docs/…`, mediante PR y CI. No se necesita una rama `develop` permanente. Cambios públicos del motor, esquema y packs tendrán notas de migración cuando corresponda. Durante 0.x se documentarán explícitamente rupturas; 1.0 exigirá contrato estable, instalación probada y migración definida. Nombre npm y licencia se decidirán antes de publicar.

## Estado y criterios de entrega

Ya existen CLI TypeScript, esquema YAML v1, packs locales/incorporados, detectores de archivos requeridos y algunas restricciones TypeScript, reportes y cobertura importada informativa. Hay mejoras visuales y de consola en curso. Ya existe importación exacta de guías y listado mediante un registro local independiente, compatible con la configuración v1. Siguen pendientes el esquema v2, la clasificación automática, la generación y los módulos completos de estándares.

Esta etapa define el contrato; no activa capacidades propuestas. La [hoja de ruta](roadmap.md) especifica entregas y condiciones verificables. Antes de ampliar la implementación, cada regla deberá tener ámbito, evidencia, comportamiento ante información faltante y al menos un caso que pasa y otro que falla.

## Referencias de diseño

- [Instrucciones Markdown por repositorio y ámbito](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions): antecedente de guías asociadas a archivos.
- [Reglas personalizadas de ESLint](https://eslint.org/docs/latest/extend/custom-rules) y [sintaxis de reglas Semgrep](https://docs.semgrep.dev/writing-rules/rule-syntax): separación de implementación, parámetros y metadatos.
- [Cobertura Vitest](https://vitest.dev/config/coverage#coverage-thresholds) e [Istanbul json-summary](https://istanbul.js.org/docs/advanced/alternative-reporters/): métricas y formatos de evidencia.
- [SemVer](https://semver.org/lang/es/), [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y [Changesets](https://changesets.dev/faq): contratos de versiones, registro de cambios e intención de publicación.

Estas fuentes fundamentan el diseño; las decisiones de interfaz y arquitectura de este documento son propuestas propias del proyecto.
