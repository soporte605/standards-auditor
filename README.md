# Standards Auditor

Paquete de consola en TypeScript para auditar estándares de ingeniería mediante reglas YAML adaptables a cada equipo. El motor es independiente del lenguaje del proyecto; cada detector declara qué puede revisar.

## Estado

Versión de desarrollo `0.1.0-dev.0`. Nombre provisional, sin publicación en npm. Funciona con Node.js 22 o superior; no necesita Rust ni compiladores nativos. Se distribuye JavaScript compilado, no requiere compilar TypeScript al instalar el paquete.

Disponible: `init`, `check`, `explain`, paquetes locales, severidades, exclusiones y reportes JSON y HTML. Detectores actuales: archivos obligatorios, `any` explícito y directivas `@ts-ignore`/`@ts-nocheck` en TypeScript. Incluye un inventario visual de pruebas asociadas y cobertura importada. Todavía no valida SemVer, estructura de changelog ni arquitectura Angular.

## Probar desde el repositorio

```sh
npm ci
npm run build
node dist/cli.js --help
node dist/cli.js init
node dist/cli.js check
```

`init` crea `auditor.yaml` con documentación básica habilitada. No sobrescribe archivos ni activa convenciones Angular por defecto. No es un asistente interactivo todavía.

## Instalar el paquete local en otro proyecto

Desde este repositorio:

```sh
npm pack
```

Después, desde el proyecto que quieres auditar, indicando la ruta real al archivo generado:

```sh
npm install --save-dev /ruta/standards-auditor-0.1.0-dev.0.tgz
npx standards-auditor init
npx standards-auditor check
npx standards-auditor explain docs.required-files
```

Puedes agregar `"audit:standards": "standards-auditor check"` a los scripts del proyecto. El auditor se instala como dependencia de desarrollo y su versión queda fijada por el lockfile del proyecto consumidor. No hay descarga de ejecutables por plataforma ni scripts de instalación propios.

## Configuración

```yaml
schema-version: 1
packs:
  - builtin:docs
  - builtin:typescript-tests
  - ./rules/team.yaml
exclude:
  - '**/generated/**'
rules:
  typescript.no-any: warning
  typescript.no-suppression: error
```

Los paquetes de la lista están habilitados; omitir uno lo deshabilita. `rules` permite `off`, `warning` o `error`. Para ajustar rutas, patrones, explicaciones o archivos obligatorios, crea un paquete local como [este ejemplo](examples/team.yaml). Los identificadores deben ser únicos entre paquetes.

La raíz auditada es la carpeta que contiene la configuración. `--config ruta/auditor.yaml` selecciona otra raíz. Las exclusiones afectan al descubrimiento de fuentes, no a la presencia de documentos obligatorios. `node_modules`, `.git`, `dist`, `coverage`, `target` y `reports` se excluyen del análisis de fuentes por defecto.

```sh
npx standards-auditor check --format json
```

Códigos de salida: `0` sin errores de reglas (puede haber advertencias); `1` incumplimientos de severidad error; `2` fallo de uso, configuración o ejecución. Los errores operativos van a stderr. Un alcance sin archivos se indica en `notices`; no demuestra calidad ni cobertura. `check` no ejecuta el código del proyecto ni genera o modifica pruebas.

## Reporte HTML

```sh
npx standards-auditor check --format html
npx standards-auditor check --format html --output reports/auditoria.html
```

Al terminar, muestra la ruta del archivo para abrirlo en el navegador. La salida predeterminada es `reports/standards-auditor.html`, relativa al directorio desde el que ejecutas el comando, incluso si usas `--config`. Crea las carpetas necesarias y reemplaza el reporte anterior de esa ruta. `--output` solo admite HTML y extensiones `.html` o `.htm`.

Incluye resumen, distribución de hallazgos, filtros por severidad, búsqueda por archivo/regla/mensaje, ubicaciones y notas de alcance. Es un único archivo que funciona sin internet ni recursos externos. Puedes compartirlo o imprimirlo desde el navegador; la impresión incluye todos los hallazgos aunque haya filtros activos. Sin JavaScript, el detalle sigue siendo visible.

El reporte se genera también cuando hay incumplimientos y conserva los códigos `0`/`1`; errores de configuración o escritura devuelven `2`. No se abre el navegador automáticamente. Los formatos de consola y JSON conservan su comportamiento. El HTML muestra hallazgos y, cuando se aporta un reporte compatible, cobertura medida. No calcula una calificación de calidad. Ten en cuenta que contiene rutas relativas y mensajes de tu proyecto.

## Árbol, pruebas y cobertura

El mapa del proyecto está habilitado por defecto. Muestra `src/`, `test/`, `tests/`, `README.md`, `package.json` y `auditor.yaml`. Solo las fuentes incluidas en `sources` se marcan como candidatas a tener pruebas; documentos y otros archivos no aparecen como pruebas faltantes. Cambia `include` a `['**/*']` para ampliar el árbol, manteniendo las exclusiones.

```yaml
inventory:
  enabled: true
  include: ['src/**', 'tests/**', 'README.md', 'package.json']
  sources: ['src/**/*.{ts,tsx,js,jsx}']
  source-exclude: ['**/*.{spec,test}.*', '**/*.d.ts', '**/__tests__/**']
  test-patterns:
    - '{dir}/{name}.spec{ext}'
    - '{dir}/{name}.test{ext}'
    - 'tests/{path}.test{ext}'
  coverage:
    report: coverage/coverage-summary.json
    minimum-lines: 85
  max-files: 1000
```

`{dir}` es la carpeta relativa de la fuente, `{name}` su nombre sin extensión, `{ext}` su extensión con punto y `{path}` la ruta relativa sin extensión. Por ejemplo, para `src/users/user.service.ts`, `{name}` es `user.service` y `{path}` es `src/users/user.service`. Se admiten patrones glob; los fragmentos extraídos de rutas se escapan como texto literal.

Los valores predeterminados reconocen fuentes JavaScript/TypeScript y pruebas `.spec`/`.test` junto al código, `__tests__` y algunas convenciones en `test/` y `tests/`. No se inspeccionan imports ni se ejecutan pruebas. Un test compartido puede asociarse por nombre con varias fuentes; una asociación no garantiza cobertura. Para Angular con la estrategia del documento original, puedes limitar `sources` a `['src/**/*.facade.ts', 'src/**/*.service.ts']`.

Para otro lenguaje, cambia las convenciones. Ejemplo de Python:

```yaml
inventory:
  include: ['app/**', 'tests/**']
  sources: ['app/**/*.py']
  test-patterns: ['tests/test_{name}.py']
```

Esto asocia archivos por convención; no añade un analizador semántico Python.

Los filtros del árbol muestran fuentes **sin test asociado**, **sin dato de líneas** o **bajo el objetivo de líneas**. Expandir un archivo muestra las pruebas asociadas y las métricas disponibles. El inventario es informativo: no agrega incumplimientos ni cambia los códigos de salida. Una ruta de cobertura configurada con un archivo corrupto sí es un error operativo (`2`).

La cobertura se importa del formato [Istanbul `json-summary`](https://istanbul.js.org/docs/advanced/alternative-reporters/), no de `coverage-final.json`. Debes generar previamente ese reporte con tu herramienta de pruebas. No se cambia ni se deduce la configuración del runner. Se distinguen:

- Reporte no configurado en el auditor.
- Reporte configurado pero no encontrado.
- Reporte disponible, pero sin dato para un archivo.
- Porcentaje medido, incluido `0%`.
- Objetivo de líneas no definido o porcentaje inferior al objetivo configurado.

Se muestran líneas, ramas, funciones y sentencias cuando están disponibles. La comparación visual usa solo líneas. El total proviene del reporte y puede incluir archivos fuera del árbol. Las rutas por archivo deben ser relativas a la raíz auditada o absolutas dentro de ella; no se adivinan equivalencias de otras máquinas. La fecha de modificación del reporte es informativa y no certifica que sus datos correspondan al código actual.

`exclude` también limita el árbol y la búsqueda de tests. `source-exclude` solo excluye candidatos a fuente; no oculta esos archivos del árbol. La ruta de cobertura se lee explícitamente aunque `coverage/` esté excluida del descubrimiento. `max-files` limita el árbol y sus conteos; cuando se recorta, se indica claramente. `inventory.enabled: false` desactiva esta función y no lee el reporte de cobertura.

## Desarrollo

```sh
npm ci
npm run check
npm pack --dry-run
```

Estructura: `src/cli.ts` para la consola, `src/config.ts` para la configuración, `src/engine.ts` para la ejecución, `packs/` para los paquetes incorporados y `test/` para pruebas del comportamiento público.

Consulta la [clasificación de tus reglas](docs/rules-analysis.md), [arquitectura](docs/architecture.md), [roadmap](docs/roadmap.md), [contribución](CONTRIBUTING.md) y [versiones](docs/releasing.md).

La licencia y el nombre público están pendientes. `private: true` evita publicar accidentalmente; no impide empaquetar e instalar el archivo local.
