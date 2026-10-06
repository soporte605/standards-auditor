# Arquitectura

## Motor TypeScript

La CLI se compila a JavaScript ESM y se distribuye como paquete npm para Node.js 22+. El motor no requiere Angular, Vitest ni un `package.json` en el proyecto auditado. Un equipo de otro lenguaje puede usar los detectores de archivos, aunque necesita Node.js para ejecutar esta distribución.

- `src/cli.ts`: comandos, mensajes y códigos de salida.
- `src/config.ts`: esquemas estrictos con Zod, lectura YAML y resolución de paquetes.
- `src/inventory.ts`: inventario de archivos, asociación por convenciones e importación de cobertura.
- `src/inventory-html.ts`: árbol expandible y estados visuales del inventario.
- `src/html-report.ts`: presentación HTML independiente con contenido escapado y filtros locales.
- `src/engine.ts`: ejecución de detectores y hallazgos normalizados.
- `packs/*.yaml`: configuración declarativa de los detectores incorporados.
- `test/cli.test.mjs`: pruebas de la interfaz pública en proyectos temporales.

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

SemVer, changelog, umbrales de cobertura que bloqueen CI, reglas de Vitest/Angular, instalación remota de paquetes y correcciones automáticas están pendientes. La arquitectura permanece modular sin crear paquetes npm internos antes de necesitarlos.

El renderer HTML consume el mismo reporte que JSON, sin volver a analizar archivos. Escapa los textos del proyecto y no los inserta en scripts. Solo la CLI escribe el artefacto solicitado después de finalizar la auditoría; los detectores siguen siendo de lectura.

## Inventario informativo

La configuración `inventory` es independiente de los paquetes de reglas. Se aplica antes de emitir el reporte, y su resultado es el campo opcional `inventory` en JSON. Los formatos de configuración y reporte permanecen en la versión 1: se trata de campos adicionales en esta base aún no publicada. Deshabilitarlo omite el campo.

Las fuentes deben estar dentro del árbol seleccionado y cumplir los patrones de fuentes, con sus exclusiones. Las asociaciones de tests se buscan respecto a la raíz del proyecto, incluso si sus archivos quedan fuera del árbol visible. Los archivos excluidos globalmente no se asocian. La asociación no analiza imports ni ejecución: los mensajes evitan afirmar ausencia absoluta de pruebas.

La cobertura importa porcentajes declarados en `json-summary` con validación de rango. No ejecuta el runner, no recalcula cobertura y no combina totales con el subconjunto visible. `Unknown` se convierte en ausencia de dato, no cero. El objetivo de líneas es opcional y visual. Ausencia de reporte es un estado informativo; JSON inválido es un error operativo.

El árbol tiene un límite configurable y declara cualquier truncamiento. La búsqueda y los filtros funcionan localmente en el HTML. Todo texto de rutas, configuración y reporte se escapa antes de incorporarse al documento.
