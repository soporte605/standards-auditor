# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado

- El producto se centra en la salud de las pruebas unitarias: `init` activa `typescript-tests`, `testing` y, con Angular, `angular`. Los packs `docs` y las reglas de tipado quedan como opcionales (ejemplo en `examples/packs/`).
- `builtin:angular` contiene solo reglas de pruebas.
- Reporte HTML rediseñado en seis pestañas (Resumen, Reglas, Mapa, Cobertura, Hallazgos y Notas): indicadores, «por dónde empezar», mapa con una celda por archivo (por prueba o por cobertura) y árbol, cobertura con mínimos y archivos peor cubiertos, y listado filtrable. Tipografía sans-serif de sistema, tema oscuro o claro y colores de estado con ícono y texto.
- README de una pantalla; la guía anterior pasa a `docs/guia-completa.md`.

### Añadido

- Ajustes por regla en `auditor.yaml`: además de la severidad, `minimum`, `sources`, `source-exclude` e `include` según el detector, para acotar un pack a una app de un monorepo o cambiar un umbral sin copiarlo.
- Cada hallazgo de «falta una prueba» incluye `suggestion`, la ruta del archivo de prueba a crear, en consola (`--details`), JSON y HTML.

### Corregido

- El inventario ya no se limita a `src/` en la raíz: con monorepos (`apps/`, `packages/`) muestra las fuentes reales en lugar de «sin fuentes».

### Eliminado

- Documentos de visión ampliada (roadmap, contrato de producto y de configuración); se conservan en la rama `docs/vision-ampliada`.

### Corregido

- `init` menciona el pack `angular` entre los packs activados cuando detecta Angular.

## [0.2.0-alpha.1] - 2026-10-09

### Añadido

- Detectores `tests-exist` y `source-has-test` y el pack incorporado `builtin:testing` (falta de pruebas es un error).
- Campo opcional `guidance` en las reglas y panel "Salud del proyecto" en consola y HTML con el estado de cada regla.
- `init` detecta TypeScript, framework y runner en `package.json` y sugiere packs y exclusiones.
- Pack `builtin:angular` con reglas estándar de Angular: artefactos con su prueba, sin pruebas enfocadas ni desactivadas, sin `TestBed.get`, sin `any` ni supresiones de tipos en `src/` y cobertura mínima de 80 %. Incluye los detectores `forbidden-files` y `typescript-forbidden-api`; `source-has-test` acepta `sources` y `source-exclude` propios.
- Packs compartidos: `package:<paquete>[/<pack>]` carga reglas desde un paquete npm instalado (registro privado o Git), con versión fijada por lockfile. Guía en `docs/shared-packs.md`.
- Ejemplos de Husky `pre-push` y GitHub Actions, con guía en `docs/git-hooks.md`.

### Cambiado

- README orientado a la primera instalación, configuración y adopción en CI, con referencia detallada de uso separada.

## [0.1.0-alpha.1] - 2026-10-08

### Cambiado

- Consola resumida por defecto; `check --details` muestra los hallazgos completos.
- HTML con resumen inicial, gráficas de cobertura y detalles plegados.

- Migración de la base Rust a TypeScript/Node.js, distribuible como paquete npm local.
- CI, contribución y política de publicación adaptados a npm.

### Añadido

- Detector optativo `coverage-thresholds` con mínimos globales independientes por métrica, evidencia SHA-256 y estados cumple/incumple/no evaluado. Consola, JSON y HTML conservan los resultados incompletos; CI devuelve 2 cuando falta evidencia de una regla de nivel error.

- Importación exacta de guías Markdown con `rules add`, listado de ámbitos y hashes con `rules list`, y procedencia visible en la auditoría. Registro local independiente sin cambios al esquema de configuración v1 ni activación automática de reglas.

- `check --open` genera el reporte y solicita abrirlo en el navegador predeterminado.
- Apertura opcional con aviso de fallo sin perder el reporte ni alterar el resultado de la auditoría.

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

### Eliminado

- Manifiestos Cargo y fuentes Rust de la rama de desarrollo; conservados en el historial Git.

[Sin publicar]: https://github.com/soporte605/standards-auditor/compare/v0.2.0-alpha.1...HEAD
[0.2.0-alpha.1]: https://github.com/soporte605/standards-auditor/compare/v0.1.0-alpha.1...v0.2.0-alpha.1
[0.1.0-alpha.1]: https://github.com/soporte605/standards-auditor/tree/v0.1.0-alpha.1
