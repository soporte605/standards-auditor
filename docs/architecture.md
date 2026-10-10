# Arquitectura

## Motor TypeScript

La CLI se compila a JavaScript ESM y se distribuye como paquete npm para Node.js 22+. El motor no requiere Angular, Vitest ni un `package.json` en el proyecto auditado. Un equipo de otro lenguaje puede usar los detectores de archivos, aunque necesita Node.js para ejecutar esta distribución.

- `src/cli.ts`: entrada del ejecutable y gestión de errores.
- `src/commands.ts`: comandos y efectos de escritura/apertura; la apertura del navegador es inyectable para pruebas.
- `src/text-report.ts`: resumen breve o detalle de consola.
- `src/config.ts`: esquemas estrictos con Zod, lectura YAML y resolución de paquetes.
- `src/inventory.ts`: inventario de archivos, asociación por convenciones y presentación de cobertura.
- `src/coverage-data.ts`: lector común de Istanbul json-summary, porcentajes y procedencia.
- `src/coverage-rules.ts`: evaluación de mínimos globales sin ejecutar el runner.
- `src/html-report.ts`: composición del reporte HTML independiente en pestañas; las vistas están en `report-overview.ts` (resumen y reglas), `report-map.ts` (mapa y cobertura) y `report-lists.ts` (hallazgos y notas), con el tema en `report-css.ts` y la interacción en `report-script.ts`. El contenido del proyecto se escapa y solo llega al script mediante atributos `data-*`.
- `src/test-association.ts`: asociación de fuentes con sus pruebas, compartida por el inventario y la regla `source-has-test`.
- `src/detect.ts`: detección de TypeScript, framework y runner en `package.json` para sugerir la configuración de `init`.
- `src/engine.ts`: ejecución de detectores y hallazgos normalizados.
- `packs/*.yaml`: configuración declarativa de los detectores incorporados.
- `scripts/release-notes.mjs`: extrae del CHANGELOG las notas de una versión para la Release.
- `test/*.test.mjs`: pruebas de la interfaz pública en proyectos temporales.

## Flujo

Configuración → validación → carga de paquetes → overrides de severidad → descubrimiento de archivos → detectores → reporte.

El documento de configuración y los manifiestos declaran `schema-version: 1`. Se rechazan claves desconocidas, detectores desconocidos, reglas duplicadas y overrides inexistentes, incluidas reglas deshabilitadas mal escritas. Las rutas relativas usan la carpeta de configuración como raíz y los patrones usan `/`. No se permiten rutas absolutas ni segmentos `..` en paquetes o alcances declarados.

Los paquetes locales son archivos de configuración de confianza del equipo, no un sandbox. No ejecutan código. Los enlaces simbólicos no constituyen una frontera de seguridad y solo debe auditarse contenido autorizado.

## Detectores actuales

`required-files`: comprueba que cada ruta sea un archivo. Un error de permisos se informa como error operativo, no como incumplimiento.

`typescript-no-any`: recorre el AST de TypeScript en busca de usos explícitos del tipo `any`.

`typescript-no-suppression`: inspecciona comentarios asociados al AST para detectar directivas de supresión. No marca cadenas o template literals que solo contienen ese texto.

El AST es sintáctico; estos detectores no validan compilación ni resuelven los tipos del proyecto. Añadir otro lenguaje requiere su propio adaptador. El reporte ordena hallazgos por ruta, línea y regla. `analyzedFiles` cuenta fuentes únicas, no documentos cuya existencia se comprueba.

## Contratos y límites

Consola, HTML y JSON (`schemaVersion: 1`); códigos `0` sin errores de reglas, `1` incumplimientos error, `2` fallos operativos. Alcances vacíos generan notas explícitas. Las advertencias no bloquean por defecto.

SemVer, changelog, mínimos de cobertura por archivo, reglas de Vitest/Angular, descarga remota de paquetes (los packs compartidos se leen de `node_modules`) y correcciones automáticas están pendientes. La arquitectura permanece modular sin crear paquetes npm internos antes de necesitarlos.

El renderer HTML consume el mismo reporte que JSON, sin volver a analizar archivos. Escapa los textos del proyecto y no los inserta en scripts. Solo la CLI escribe el artefacto solicitado después de finalizar la auditoría; los detectores siguen siendo de lectura.

## Inventario informativo

La configuración `inventory` es independiente de los paquetes de reglas. Se aplica antes de emitir el reporte, y su resultado es el campo opcional `inventory` en JSON. Los formatos de configuración y reporte permanecen en la versión 1: se trata de campos adicionales en esta base aún no publicada. Deshabilitarlo omite el campo.

Las fuentes deben estar dentro del árbol seleccionado y cumplir los patrones de fuentes, con sus exclusiones. Las asociaciones de tests se buscan respecto a la raíz del proyecto, incluso si sus archivos quedan fuera del árbol visible. Los archivos excluidos globalmente no se asocian. La asociación no analiza imports ni ejecución: los mensajes evitan afirmar ausencia absoluta de pruebas.

La cobertura importa porcentajes declarados en `json-summary` con validación de rango. No ejecuta el runner, no recalcula cobertura y no combina totales con el subconjunto visible. `Unknown` se convierte en ausencia de dato, no cero. El objetivo de líneas es opcional y visual. Ausencia de reporte es un estado informativo; JSON inválido es un error operativo.

El árbol tiene un límite configurable y declara cualquier truncamiento. La búsqueda y los filtros funcionan localmente en el HTML. Todo texto de rutas, configuración y reporte se escapa antes de incorporarse al documento.

## Presentación progresiva

El comando `check` no guarda artefactos y emite un resumen. `--details` incluye todos los hallazgos y notas. `--format json` conserva el reporte estructurado; `--format html` guarda un documento independiente. `--open` implica HTML y solicita apertura con el navegador predeterminado usando el paquete `open`; nunca se abre en el flujo por defecto. El resultado del auditor no depende de que exista un navegador y no espera a que el usuario lo cierre.

Las gráficas representan las cuatro métricas globales importadas, no un índice de calidad calculado. Solo líneas se compara con el objetivo configurado. La proporción de fuentes con pruebas asociadas se presenta por separado. El árbol y los hallazgos permanecen accesibles con elementos details/summary nativos, incluso sin JavaScript. El evento de impresión despliega el contenido y restaura el estado al terminar.

## Políticas de cobertura

`coverage-thresholds` es un detector de pack v1 con `report` y `minimum` (una o más métricas). Evalúa exclusivamente el total global importado, aunque el inventario esté deshabilitado o truncado. Nunca promedia porcentajes ni ajusta el total al árbol. La severidad admite overrides como cualquier otra regla.

`coverageEvaluations` conserva resultados por métrica: pass, fail o not-evaluated, mínimo, porcentaje o null y evidencia con hash, fecha y actualidad no verificada. Los fallos generan hallazgos; las evaluaciones incompletas permanecen separadas, visibles y contadas en summary. La CLI da prioridad a salida 2 cuando hay evidencia incompleta de nivel error, después 1 por incumplimientos y finalmente 0. Warning nunca bloquea por sí mismo.

El motor comparte una lectura por ruta absoluta de reporte entre políticas y el inventario. Si una política ya evaluó un reporte inválido, el inventario conserva el estado invalid y permite emitir el reporte completo. Si no hay política para esa ruta, un reporte inválido del inventario sigue causando error operativo. Métricas omitidas o Unknown son ausencia de dato; valores fuera de rango y JSON incorrecto invalidan el artefacto.

La política no declara not-applicable: cada métrica activada requiere un porcentaje global, independientemente del lenguaje. Omitir una métrica o deshabilitar una regla elimina esa evaluación. La normalización de estados de todos los demás detectores permanece pendiente.
