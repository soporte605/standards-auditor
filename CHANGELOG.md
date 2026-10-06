# Changelog

Cambios relevantes del proyecto, versionado conforme a SemVer.

## [Unreleased]

### Changed

- Migración de la base Rust a TypeScript/Node.js, distribuible como paquete npm local.
- CI, contribución y política de publicación adaptados a npm.

### Added

- Árbol configurable del proyecto con asociación de pruebas por rutas y nombres.
- Importación de cobertura Istanbul json-summary y comparación visual con un objetivo de líneas opcional.
- Filtros del árbol por pruebas faltantes, ausencia de datos y cobertura inferior al objetivo.
- Estados separados para cobertura no configurada, reporte ausente y cobertura medida en cero.

- Reporte HTML independiente con filtros, búsqueda, resumen visual y notas de alcance.
- Opciones `check --format html` y `--output`, con generación incluso cuando hay incumplimientos.

- Comandos `init`, `check`, `explain`, ayuda y versión.
- Configuración YAML estricta, paquetes locales, severidades y exclusiones.
- Detectores de archivos obligatorios, `any` explícito y supresiones de tipos.
- Reportes de consola/JSON, notas de alcance vacío y códigos de salida.
- Pruebas de comportamiento de CLI y configuración.
- Documento Angular/Vitest original y clasificación de reglas generales y específicas.

### Removed

- Manifiestos Cargo y fuentes Rust de la rama de desarrollo; conservados en el historial Git.
