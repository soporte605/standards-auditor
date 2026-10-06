# Arquitectura

## Motor TypeScript

La CLI se compila a JavaScript ESM y se distribuye como paquete npm para Node.js 22+. El motor no requiere Angular, Vitest ni un `package.json` en el proyecto auditado. Un equipo de otro lenguaje puede usar los detectores de archivos, aunque necesita Node.js para ejecutar esta distribución.

- `src/cli.ts`: comandos, mensajes y códigos de salida.
- `src/config.ts`: esquemas estrictos con Zod, lectura YAML y resolución de paquetes.
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

SemVer, changelog, cobertura, reglas de Vitest/Angular, instalación remota de paquetes y correcciones automáticas están pendientes. La arquitectura permanece modular sin crear paquetes npm internos antes de necesitarlos.

El renderer HTML consume el mismo reporte que JSON, sin volver a analizar archivos. Escapa los textos del proyecto y no los inserta en scripts. Solo la CLI escribe el artefacto solicitado después de finalizar la auditoría; los detectores siguen siendo de lectura.
