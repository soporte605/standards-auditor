# Referencia de uso y configuración

Estas opciones corresponden a `0.2.0-alpha.5`, con configuración y packs de esquema v1. Para instalar y realizar la primera auditoría, consulta el [README](../README.md).

## Sugerir packs y ajustes

```sh
standards-auditor suggest [--config <ruta>] [--format text|json]
standards-auditor suggest --write
```

Detecta el lenguaje, el framework y el runner, y para cada pack incorporado indica si ya lo tienes activo, si se recomienda, es opcional o no aplica, y **qué encontraría hoy en tu proyecto** (errores y avisos, probados en seco con el `inventory` y los `exclude` de tu `auditor.yaml`).

Cuando una regla de «cada fuente tiene su prueba» no se cumple, propone un `minimum` igual al porcentaje actual: el CI pasa hoy y puedes subirlo poco a poco. En un repositorio con varios paquetes avisa de que conviene acotar `sources` a tu app.

`--write` añade a `packs` los packs recomendados que falten, conserva tus comentarios y, si hay Angular y `testing`, desactiva `testing.source-has-test` por duplicar a la regla de Angular. Es idempotente y no crea el archivo: usa antes `init`. Con `--format json` devuelve la propuesta completa.

## Adjuntar las guías del equipo

Después de `init`, importa un Markdown UTF-8 sin cambiar su contenido:

```sh
npx standards-auditor rules add ./unit-testing.md --id team.unit-testing --include 'src/**/*.ts'
npx standards-auditor rules list
npx standards-auditor check --details
```

`--id` es obligatorio: segmentos en minúsculas separados por puntos, con números o guiones después de la letra inicial. `--include` puede repetirse; si se omite, el ámbito registrado es `**/*`. Son ámbitos declarados para futura planificación/revisión; esta entrega no interpreta el Markdown ni calcula qué archivos cumplen sus instrucciones.

**Muchos hallazgos de una misma regla.** Cuando una regla tiene más de 15 hallazgos (por ejemplo, un proyecto casi sin pruebas), `--details` no imprime un renglón por archivo: muestra una línea por regla con el total y el porcentaje de fuentes con prueba (`0 de 320 (0%) tienen una; mínimo 80%`), y debajo las carpetas con más archivos pendientes. Usa `npx standards-auditor check --all` para listar cada archivo. El JSON no se agrupa nunca, y el reporte HTML agrupa en carpetas plegables sin ocultar ningún archivo.

La copia queda en `.auditor/rules/<id>.md` y el registro en `.auditor/guides.yaml`. Ambos se pueden versionar en Git. El registro guarda nombre de origen, ámbito y SHA-256 importado; no guarda la ruta absoluta original. Puedes editar la copia: el listado mostrará `modificada` y su hash actual. La fuente externa no se sincroniza automáticamente.

No se sobrescriben guías existentes. Para una segunda guía usa otro ID. Si una guía registrada falta o es inválida, la auditoría termina con código 2. El registro y las copias no admiten symlinks. Importaciones simultáneas se rechazan mediante un lock; después de una interrupción abrupta, elimina `.auditor/guides.lock` solo tras comprobar que no hay otra importación activa.

La raíz de destino es la carpeta de `--config`; la ruta del Markdown de entrada es relativa al directorio desde donde ejecutas el comando. No cambia `auditor.yaml` ni habilita detectores. El registro tiene su propio esquema v1, independiente del esquema v2 de configuración propuesto en los documentos de diseño.

`check --format json` incluye metadatos y hashes de las guías; `check --details` y las notas del HTML muestran su procedencia y ámbito. La presencia de una guía no cuenta como regla evaluada. La clasificación automática, la generación de pruebas y la migración al esquema v2 siguen pendientes.

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

Los paquetes de la lista están habilitados; omitir uno lo deshabilita. `rules` permite `off`, `warning` o `error`. Para ajustar rutas, patrones, explicaciones o archivos obligatorios, crea un paquete local como [este ejemplo](../examples/team.yaml). Los identificadores deben ser únicos entre paquetes.

La raíz auditada es la carpeta que contiene la configuración. `--config ruta/auditor.yaml` selecciona otra raíz. Las exclusiones afectan al descubrimiento de fuentes, no a la presencia de documentos obligatorios. `node_modules`, `.git`, `dist`, `coverage`, `target` y `reports` se excluyen del análisis de fuentes por defecto.

```sh
npx standards-auditor check --format json
```

Códigos de salida: `0` sin errores de reglas (puede haber advertencias); `1` incumplimientos de severidad error; `2` fallo de uso, configuración, ejecución o evidencia obligatoria de cobertura incompleta. Los errores operativos van a stderr. Un alcance sin archivos se indica en `notices`; no demuestra calidad ni cobertura. `check` no ejecuta el código del proyecto ni genera o modifica pruebas.

## Resumen de consola

```sh
npx standards-auditor check
npx standards-auditor check --details
```

`check` muestra únicamente el resultado general, pruebas asociadas, cobertura de líneas disponible y número de notas de alcance. No crea un HTML ni abre el navegador. Usa `--details` para ver todos los archivos, reglas y explicaciones de los hallazgos en consola. La salida JSON conserva el reporte completo.

## Reporte HTML

```sh
npx standards-auditor check --open
npx standards-auditor check --format html
npx standards-auditor check --format html --output reports/auditoria.html
```

`--open` genera el reporte y solicita abrirlo en el navegador predeterminado. `--format html` solo lo guarda y muestra su ruta. Si la apertura falla, conserva el archivo y avisa sin cambiar el resultado de la auditoría. La salida predeterminada es `reports/standards-auditor.html`, relativa al directorio desde el que ejecutas el comando, incluso si usas `--config`. Crea las carpetas necesarias y reemplaza el reporte anterior de esa ruta. `--output` se usa con `--format html` o `--open` y admite extensiones `.html` o `.htm`. No se combina `--open` con JSON/texto explícito ni `--details` con HTML.

El reporte se organiza en seis pestañas, cada una con un trabajo:

| Pestaña   | Qué muestra                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resumen   | Veredicto, cuatro indicadores (reglas cumplidas, fuentes con prueba, cobertura de líneas, hallazgos), por dónde empezar y las carpetas con más pruebas pendientes |
| Reglas    | Cada regla con su estado, los archivos afectados, la ruta de la prueba a crear (con botón de copiar) y «Cómo cumplirla»; las que cumplen quedan plegadas          |
| Mapa      | Una celda por archivo fuente, agrupada por carpeta y coloreada por prueba asociada o por cobertura; vista alternativa en árbol con búsqueda y filtros             |
| Cobertura | Métricas globales con el objetivo de líneas, mínimos exigidos con su evidencia y los archivos con menos cobertura; sin reporte, explica cómo conectarlo           |
| Hallazgos | Listado completo con filtros por severidad y regla, y búsqueda                                                                                                    |
| Notas     | Observaciones de alcance y guías del equipo                                                                                                                       |

Es un único archivo que funciona sin internet ni recursos externos. Usa tema oscuro o claro según tu sistema. Puedes compartirlo o imprimirlo: la impresión incluye todas las pestañas. Sin JavaScript, todas las secciones se muestran seguidas.

El reporte se genera también cuando hay incumplimientos (`1`) o evidencia obligatoria de cobertura incompleta (`2`). Errores de configuración o escritura devuelven `2` y pueden impedir la generación. El navegador solo se solicita con `--open`. El formato JSON conserva su comportamiento; la consola es resumida por defecto. El HTML muestra hallazgos y, cuando se aporta un reporte compatible, cobertura medida. No calcula una calificación de calidad. Ten en cuenta que contiene rutas relativas y mensajes de tu proyecto.

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

Los valores predeterminados reconocen fuentes JavaScript/TypeScript y pruebas `.spec`/`.test` junto al código, `__tests__` y algunas convenciones en `test/` y `tests/`. No se inspeccionan imports ni se ejecutan pruebas. Un test compartido puede asociarse por nombre con varias fuentes; una asociación no garantiza cobertura. Si tu equipo prueba solo ciertas capas (por ejemplo, servicios), limita `sources` a `['src/**/*.service.ts']`.

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

`exclude` también limita el árbol y la búsqueda de tests. `source-exclude` solo excluye candidatos a fuente; no oculta esos archivos del árbol. La ruta de cobertura se lee explícitamente aunque `coverage/` esté excluida del descubrimiento. `max-files` limita el árbol y sus conteos; cuando se recorta, se indica claramente. `inventory.enabled: false` desactiva el inventario y su lectura de cobertura; las reglas `coverage-thresholds` habilitadas siguen leyendo sus propios reportes.

## Mínimos de cobertura para CI

Copia [examples/coverage.yaml](../examples/coverage.yaml) a `rules/coverage.yaml` de tu proyecto y agrega el pack a la lista existente de `auditor.yaml`:

```yaml
schema-version: 1
packs:
  - builtin:docs
  - rules/coverage.yaml
```

El pack define una regla optativa:

```yaml
schema-version: 1
name: team-coverage
rules:
  - id: team.coverage
    detector: coverage-thresholds
    severity: error
    description: Cumplir los mínimos globales del equipo.
    report: coverage/coverage-summary.json
    minimum:
      lines: 85
      branches: 85
      functions: 85
      statements: 85
```

`report` es relativo a la carpeta de `auditor.yaml`, incluso si el pack está en otra carpeta. Define una o varias métricas; los mínimos admiten números de 0 a 100 y la igualdad cumple. El 85% es un ejemplo editable, no un mínimo impuesto por el motor. No se activa por importar una guía Markdown.

Genera primero el `json-summary` con el runner de tu proyecto y ejecuta:

```sh
npx standards-auditor check
npx standards-auditor check --details
npx standards-auditor check --format html --output reports/audit.html
npx standards-auditor explain team.coverage
```

| Estado por métrica | Evidencia                                                                  | Efecto de una regla `error` |
| ------------------ | -------------------------------------------------------------------------- | --------------------------- |
| `pass`             | Porcentaje igual o mayor al mínimo                                         | No agrega incumplimiento    |
| `fail`             | Porcentaje inferior al mínimo, incluido cero real                          | Salida 1                    |
| `not-evaluated`    | Reporte ausente, ilegible, inválido, sin total o sin porcentaje disponible | Salida 2                    |

Si hay incumplimientos y evidencia obligatoria incompleta, prevalece 2; todos los resultados permanecen en el reporte. Con `severity: warning`, los incumplimientos y evaluaciones incompletas se muestran sin bloquear. También puedes sobrescribir `team.coverage: warning` u `off` dentro de `rules` en `auditor.yaml`. Una regla deshabilitada no evalúa su artefacto; el inventario aún puede leerlo si está configurado por separado.

JSON agrega `coverageEvaluations`, con mínimo, valor medido, estado, severidad y evidencia (ruta, hash SHA-256 y fecha). `summary.notEvaluated` cuenta métricas sin evaluar y `requiredIncomplete` las de nivel error. `evaluatedRules` sigue contando reglas habilitadas, no métricas. Consola y HTML muestran el mismo resultado, incluso si el inventario está desactivado.

Esta entrega usa exclusivamente `total` del reporte; no promedia porcentajes por archivo, no aplica las exclusiones del árbol a ese total y no deduce el ámbito del runner. Los mínimos por archivo y la verificación de actualidad quedan pendientes. Un hash identifica el artefacto leído; su fecha no demuestra que corresponda al código actual. Un reporte antiguo puede satisfacer los mínimos: ejecuta el runner antes de la auditoría en CI.

`inventory.coverage.minimum-lines` conserva su función visual e independiente. No habilita una política de bloqueo; las gráficas del inventario y las reglas pueden incluso usar reportes distintos, identificados por sus rutas. Cuando comparten la misma ruta, reutilizan la misma lectura. Un reporte inválido usado por una política se presenta como evidencia incompleta; uno configurado solo para inventario conserva el error operativo existente.
