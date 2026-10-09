# Guía completa

Esta guía reúne todas las capacidades. Para empezar, basta el [README](../README.md).

**Audita los estándares de tu equipo desde la consola y explora los resultados en un reporte HTML.**

Un paquete TypeScript para comprobar reglas YAML en proyectos existentes: documentación requerida, restricciones en pruebas TypeScript y mínimos de cobertura. Cada equipo elige sus convenciones y severidades. También permite conservar guías Markdown junto al proyecto.

**Estado:** `0.2.0-alpha.1` · Requiere **Node.js 22 o superior y npm** · Probado en Linux, macOS y Windows con Node 22 y 24.

> Versión alpha para pruebas piloto. Se instala desde el paquete descargable de GitHub; todavía no está publicada en npm. Licencia MIT; las contribuciones son bienvenidas ([guía](../CONTRIBUTING.md)).

[Descargar versión](https://github.com/soporte605/standards-auditor/releases/tag/v0.2.0-alpha.1) · [Referencia de configuración](usage.md) · [Changelog](../CHANGELOG.md)

## Qué puedes hacer hoy

| Capacidad             | Disponible                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Estándares por equipo | Packs YAML locales, severidades `error` / `warning` y desactivación con `off`                       |
| Documentación         | Comprobar que existan los archivos requeridos                                                       |
| Pruebas TypeScript    | Detectar `any` explícito, `@ts-ignore` y `@ts-nocheck`                                              |
| Packs compartidos     | Reglas de la empresa en un paquete npm: `package:@acme/standards/angular` ([guía](shared-packs.md)) |
| Angular               | `builtin:angular`: pruebas por artefacto, sin `fit`/`.only`, tipos estrictos y cobertura 80 %       |
| Presencia de pruebas  | Exigir que existan pruebas y un porcentaje mínimo de fuentes con prueba (`builtin:testing`)         |
| Salud del proyecto    | Panel con reglas cumplidas, severidad y cómo cumplir cada una                                       |
| Git hooks y CI        | Ejemplos de Husky y GitHub Actions: [guía](git-hooks.md)                                            |
| Cobertura             | Importar Istanbul `json-summary` y exigir mínimos globales por métrica                              |
| Guías Markdown        | Importar una copia intacta, registrar ámbito y detectar cambios mediante hashes                     |
| Resultados            | Resumen en consola, JSON para automatización y HTML independiente                                   |
| Árbol del proyecto    | Mostrar pruebas asociadas por nombre y cobertura disponible por archivo                             |

El motor no requiere Angular. Las reglas de análisis de código actuales son específicas de TypeScript; cambiar patrones permite inventariar otros lenguajes, pero no añade automáticamente un analizador para ellos.

**Todavía no interpreta las instrucciones del Markdown, genera unit tests, ejecuta el runner ni valida SemVer o la estructura de changelogs.** El inventario no demuestra que un archivo esté probado: muestra asociaciones según tus convenciones.

## Inicio rápido

### 1. Descarga e instala

Descarga `standards-auditor-0.2.0-alpha.1.tgz` desde la [prerelease](https://github.com/soporte605/standards-auditor/releases/tag/v0.2.0-alpha.1). No elijas los archivos automáticos “Source code”: el `.tgz` contiene el ejecutable ya compilado.

En una terminal situada dentro del proyecto que quieres auditar, instala el archivo indicando su ubicación real:

```sh
npm install --save-dev /ruta/al/standards-auditor-0.2.0-alpha.1.tgz
npx standards-auditor --version
```

En Windows también puedes usar una ruta como `C:/Downloads/standards-auditor-0.2.0-alpha.1.tgz`. Pon la ruta entre comillas si contiene espacios. No necesitas Rust ni compilar TypeScript para instalarlo.

### 2. Inicializa el proyecto

```sh
npx standards-auditor init
```

Crea `auditor.yaml` con el pack de documentación habilitado y un inventario informativo. No sobrescribe una configuración existente. El pack inicial exige un `README.md`; si falta, la primera auditoría lo señalará.

### 3. Ejecuta la primera auditoría

```sh
npx standards-auditor check
```

Verás errores, advertencias, fuentes con pruebas asociadas y el estado de la cobertura. El auditor no ejecuta pruebas ni modifica tu código.

Para consultar el detalle o abrir el reporte visual:

```sh
npx standards-auditor check --details
npx standards-auditor check --open
```

`--open` genera `reports/standards-auditor.html` y solicita abrirlo en el navegador. El reporte contiene gráficas de cobertura cuando hay datos, árbol de archivos y hallazgos desplegables. Funciona sin internet.

## Configura los estándares de tu equipo

Hay tres piezas con funciones diferentes:

| Archivo                                      | Para qué sirve                                                 |
| -------------------------------------------- | -------------------------------------------------------------- |
| `auditor.yaml`                               | Seleccionar packs, severidades, exclusiones e inventario       |
| Un pack como `rules/team.yaml`               | Definir comprobaciones mediante detectores disponibles         |
| Una guía como `.auditor/rules/team.tests.md` | Conservar instrucciones humanas para revisión y trabajo futuro |

### Habilitar reglas TypeScript

Este ejemplo completo de `auditor.yaml` utiliza solo packs incorporados; no requiere crear otros archivos:

```yaml
schema-version: 1
packs:
  - builtin:docs
  - builtin:typescript-tests
exclude:
  - '**/generated/**'
rules:
  typescript.no-any: warning
  typescript.no-suppression: error
```

`builtin:typescript-tests` analiza archivos `.spec` y `.test` con extensiones `ts`, `tsx`, `mts` y `cts`. `warning` informa sin bloquear; `error` bloquea cuando hay un incumplimiento; `off` desactiva una regla del pack seleccionado.

```sh
npx standards-auditor explain typescript.no-any
```

Para exigir otros documentos o definir ámbitos diferentes, crea un [pack local](examples/team.yaml) y agrega su ruta a `packs`. Cada ID debe ser único. Agregar prosa a un pack no crea un detector nuevo.

La raíz del proyecto es la carpeta que contiene `auditor.yaml`. Puedes seleccionarla explícitamente:

```sh
npx standards-auditor check --config ./otro-proyecto/auditor.yaml
```

### Adjuntar las guías del equipo

Prepara tu guía en Markdown UTF-8 e impórtala:

```sh
npx standards-auditor rules add ./unit-testing.md --id team.tests --include "src/**/*.ts"
npx standards-auditor rules list
```

La copia queda en `.auditor/rules/team.tests.md`; su registro, ámbito y hash importado se guardan en `.auditor/guides.yaml`. Puedes versionar ambos en Git y editar la copia. El listado indicará si fue modificada.

**Importar la guía no activa reglas automáticas.** En esta versión, el ámbito se registra como información para revisión; el contenido no se interpreta ni se evalúa contra el código. Consulta los [detalles de las guías](usage.md#adjuntar-las-guías-del-equipo).

## Configura cobertura y bloqueo en CI

Primero genera un reporte **Istanbul `json-summary`** con el runner de tu proyecto. El auditor lee ese artefacto; no acepta `coverage-final.json` ni ejecuta los tests por ti.

### Mostrar cobertura en el árbol y las gráficas

Agrega este bloque a `auditor.yaml`:

```yaml
inventory:
  coverage:
    report: coverage/coverage-summary.json
    minimum-lines: 85
```

`minimum-lines` es una referencia visual. **Para bloquear CI necesitas la regla siguiente.**

### Exigir mínimos globales

Crea la carpeta `rules/` y guarda este contenido como `rules/coverage.yaml`:

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

Agrega `rules/coverage.yaml` a la lista `packs` existente de `auditor.yaml`, conservando los packs que ya utilizas. El [archivo de ejemplo](examples/coverage.yaml) está disponible para copiarlo.

Los mínimos son editables: puedes exigir una o varias métricas, entre 0 y 100. Un valor igual al mínimo cumple. La ruta del reporte es relativa a `auditor.yaml`, no al archivo del pack.

La comprobación usa el `total` global del reporte, incluso con el inventario desactivado. No promedia archivos ni aplica las exclusiones del árbol a ese total. La fecha y el hash identifican el artefacto, pero no demuestran que corresponda al código actual: **genera cobertura antes de auditar en CI**.

## Comandos y reportes

| Necesidad                     | Comando                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| Crear configuración           | `npx standards-auditor init`                                            |
| Resumen de consola            | `npx standards-auditor check`                                           |
| Detalle completo              | `npx standards-auditor check --details`                                 |
| Generar HTML y abrirlo        | `npx standards-auditor check --open`                                    |
| Guardar HTML sin abrirlo      | `npx standards-auditor check --format html --output reports/audit.html` |
| Emitir JSON                   | `npx standards-auditor check --format json`                             |
| Explicar una regla habilitada | `npx standards-auditor explain team.coverage`                           |
| Listar guías                  | `npx standards-auditor rules list`                                      |
| Consultar ayuda               | `npx standards-auditor --help`                                          |

La salida HTML se resuelve desde el directorio de ejecución, también cuando usas `--config`. Reemplaza el reporte anterior en esa ruta. Si el navegador no abre, el archivo permanece disponible. Los reportes contienen rutas y mensajes del proyecto.

### Códigos de salida

| Código | Significado                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------ |
| `0`    | Sin incumplimientos de nivel error ni evidencia obligatoria incompleta; puede haber advertencias |
| `1`    | Al menos un incumplimiento de nivel error                                                        |
| `2`    | Error de uso, configuración o ejecución; o cobertura obligatoria que no pudo evaluarse           |

Un reporte de cobertura ausente, inválido o sin la métrica global requerida no equivale a `0%`: se muestra como `not-evaluated`. Cuando conviven incumplimientos y evidencia obligatoria incompleta, prevalece `2`. Una regla `warning` informa sin bloquear por sí misma.

JSON y HTML conservan las evaluaciones de cobertura incompletas. Un error de configuración o de escritura sí puede impedir generar el reporte. Consulta la [referencia completa](usage.md) para ámbitos, patrones, hashes y campos JSON.

## Integración en el equipo

Puedes añadir estos scripts al `package.json` existente, conservando los demás:

```json
{
  "scripts": {
    "audit:standards": "standards-auditor check",
    "audit:standards:html": "standards-auditor check --format html --output reports/audit.html"
  }
}
```

En CI, instala dependencias, ejecuta el comando de tests/cobertura de tu proyecto y después `npm run audit:standards`. Conserva el código de salida para que los incumplimientos bloqueen el proceso. Si guardas HTML como artefacto, configura su recolección también cuando la auditoría falle.

Con esta distribución local, `package-lock.json` puede referenciar la ruta del `.tgz`: el archivo debe estar disponible en esa ruta también para los compañeros y CI. Puedes guardarlo en una carpeta versionada `vendor/` e instalar desde allí, o descargarlo en un paso autenticado antes de `npm ci`. Un archivo ubicado solo en tu carpeta Downloads no estará disponible en otro equipo.

Para una primera adopción, revisa los hallazgos y ajusta ámbitos y severidades antes de exigirlos a todo el equipo.

## Problemas frecuentes

| Situación                                     | Qué revisar                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `init` indica que el archivo ya existe        | Edita el `auditor.yaml` existente; no hace falta reinicializar                       |
| No encuentra configuración                    | Ejecuta desde su carpeta o utiliza `--config`                                        |
| “Ningún archivo coincide”                     | Comprueba patrones y exclusiones; un ámbito vacío no demuestra cumplimiento          |
| Aparece “sin test asociado”                   | Ajusta `inventory.test-patterns`; se asocian nombres, no ejecución ni imports        |
| No aparecen gráficas de cobertura             | Configura `inventory.coverage.report` y genera un `json-summary` con totales         |
| La auditoría devuelve `2` por cobertura       | Comprueba ruta, formato y porcentajes globales requeridos                            |
| Edité la guía original y no cambia el listado | La importación crea una copia independiente; edita el archivo bajo `.auditor/rules/` |
| Falla `npm ci` en otra máquina                | Comprueba que tenga acceso al `.tgz` indicado por el lockfile                        |

Para adaptar el árbol a Angular, Python u otras convenciones, consulta [inventario y patrones](usage.md#árbol-pruebas-y-cobertura). Esta configuración no añade soporte semántico de nuevos lenguajes.

## Desarrollo y documentación

Desde un clon de este repositorio:

```sh
npm ci
npm run check
npm pack
```

`check` valida tipos, formato y pruebas. `npm pack` compila y genera el `.tgz` instalable. Para ejecutar directamente el código compilado, usa `node dist/cli.js --help`.

- [Referencia de uso](usage.md): opciones y comportamiento actual.
- [Arquitectura](architecture.md): módulos, evidencia y límites.
- [Reglas de Angular](angular.md): qué comprueba `builtin:angular` y en qué se basa.
- [Contribución](../CONTRIBUTING.md) y [publicación](releasing.md): ramas, validación y versiones.

## Licencia y distribución

El código se distribuye bajo licencia [MIT](../LICENSE). El paquete sigue marcado `private: true` para evitar una publicación accidental: el nombre público en npm sigue pendiente y no se publica allí. La prerelease de GitHub permite instalar el paquete local para evaluar la herramienta.
