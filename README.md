# Standards Auditor

Paquete de consola en TypeScript para auditar estándares de ingeniería mediante reglas YAML adaptables a cada equipo. El motor es independiente del lenguaje del proyecto; cada detector declara qué puede revisar.

## Estado

Versión de desarrollo `0.1.0-dev.0`. Nombre provisional, sin publicación en npm. Funciona con Node.js 22 o superior; no necesita Rust ni compiladores nativos. Se distribuye JavaScript compilado, no requiere compilar TypeScript al instalar el paquete.

Disponible: `init`, `check`, `explain`, paquetes locales, severidades, exclusiones y reportes JSON. Detectores actuales: archivos obligatorios, `any` explícito y directivas `@ts-ignore`/`@ts-nocheck` en TypeScript. Todavía no comprueba SemVer, estructura de changelog, cobertura ni arquitectura Angular.

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

La raíz auditada es la carpeta que contiene la configuración. `--config ruta/auditor.yaml` selecciona otra raíz. Las exclusiones afectan al descubrimiento de fuentes, no a la presencia de documentos obligatorios. `node_modules`, `.git`, `dist`, `coverage` y `target` se excluyen del análisis de fuentes por defecto.

```sh
npx standards-auditor check --format json
```

Códigos de salida: `0` sin errores de reglas (puede haber advertencias); `1` incumplimientos de severidad error; `2` fallo de uso, configuración o ejecución. Los errores operativos van a stderr. Un alcance sin archivos se indica en `notices`; no demuestra calidad ni cobertura. `check` no ejecuta el código del proyecto ni genera o modifica pruebas.

## Desarrollo

```sh
npm ci
npm run check
npm pack --dry-run
```

Estructura: `src/cli.ts` para la consola, `src/config.ts` para la configuración, `src/engine.ts` para la ejecución, `packs/` para los paquetes incorporados y `test/` para pruebas del comportamiento público.

Consulta la [clasificación de tus reglas](docs/rules-analysis.md), [arquitectura](docs/architecture.md), [roadmap](docs/roadmap.md), [contribución](CONTRIBUTING.md) y [versiones](docs/releasing.md).

La licencia y el nombre público están pendientes. `private: true` evita publicar accidentalmente; no impide empaquetar e instalar el archivo local.
