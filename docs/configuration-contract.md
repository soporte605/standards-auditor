# Contrato de configuración propuesto

Estado: propuesta de esquema v2. **La CLI actual solo acepta esquema v1; este ejemplo no es ejecutable todavía.** No reemplazar `auditor.yaml` del proyecto con él.

## Archivos del equipo

```text
proyecto/
├── auditor.yaml
├── .auditor/
│   ├── rules/unit-testing.md
│   └── packs/team.yaml
└── reports/auditor.html
```

Markdown conserva instrucciones humanas. YAML selecciona ámbitos, perfiles, detectores y parámetros. Un pack agrupa reglas reutilizables. Adjuntar una guía no habilita detectores ni cambia el código del proyecto.

## Ejemplo de configuración futura

```yaml
schema-version: 2
profiles:
  - builtin:typescript-vitest
packs:
  - .auditor/packs/team.yaml
guides:
  - id: team.unit-testing
    path: .auditor/rules/unit-testing.md
    include: ['src/**/*.ts']
    use: [plan, generate, review]
testing:
  adapter: typescript-vitest
  include: ['src/**/*.ts']
  exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.d.ts']
  test-patterns: ['{dir}/{name}.spec.{ext}', '{dir}/{name}.test.{ext}']
standards:
  coverage:
    enabled: true
    format: istanbul-json-summary
    report: coverage/coverage-summary.json
    scope: testing
    thresholds:
      mode: global
      minimum: { statements: 85, branches: 85, functions: 85, lines: 85 }
  versioning:
    enabled: false
  changelog:
    enabled: false
  documentation:
    enabled: true
    required-files: [README.md]
rules:
  team.typescript.no-any:
    severity: warning
report:
  default: text
  html-path: reports/auditor.html
```

Los porcentajes son una decisión de este equipo. El perfil Angular futuro restringirá `testing.include` a facades/servicios y aportará su guía específica. Un perfil TypeScript general no heredará esas restricciones.

Los módulos `versioning` y `changelog` requerirán, al habilitarse, una fuente de versión y una estrategia documentada (`semver`, `changesets` o changelog estructurado), además de fase PR/publicación y base de comparación cuando aplique. Hasta definir y validar sus parámetros completos no se considerarán parte del esquema implementable.

## Pack declarativo futuro

```yaml
schema-version: 2
name: team-quality
version: 1.0.0
rules:
  - id: team.typescript.no-any
    description: Evitar any explícito en pruebas
    category: testing
    severity: warning
    detector: typescript-no-any
    options:
      include: ['src/**/*.spec.ts', 'src/**/*.test.ts']
    source:
      guide: team.unit-testing
      section: TypeScript Quality
```

La versión del pack es independiente de la del motor. Los packs npm futuros declararán compatibilidad del motor en su manifiesto; el esquema declarará compatibilidad de configuración. `source` vincula una regla a su justificación, no convierte texto en código.

Cada detector publicará esquema de opciones, lenguajes soportados, tipo de evidencia y límites. Detector desconocido, opciones inválidas o perfil inexistente producirán error de configuración. No se aceptarán silenciosamente reglas sin implementación.

## Resolución

1. Validar versión y estructura; rechazar claves desconocidas para detectar errores de escritura.
2. Resolver perfiles y packs disponibles localmente, sin descargar código durante el análisis.
3. Aplicar valores del perfil y después sobrescrituras explícitas del proyecto.
4. Expandir ámbitos y exclusiones; normalizar rutas relativas a la raíz que contiene `auditor.yaml`.
5. Emitir configuración efectiva y procedencia antes de ejecutar detectores.

Dos definiciones distintas del mismo ID entre packs serán un conflicto, salvo una sobrescritura explícita del proyecto. Los arrays se reemplazarán completos al sobrescribirlos. `off` deshabilitará una regla; `warning` y `error` cambiarán severidad, no su significado. Las opciones omitidas conservarán valores por defecto del detector.

Las guías aplicables se acumularán como contexto, con sus ámbitos y orden declarados. Una contradicción detectada se mostrará para resolución; no se prometerá detectar todas las contradicciones del lenguaje natural. Una contradicción conocida que afecte la generación detendrá el plan de ese archivo hasta resolverla. Una guía no sobrescribirá automáticamente una regla activa.

Las rutas serán portables, sin depender del separador del sistema. No se recorrerán symlinks fuera de la raíz. Los archivos generados y dependencias estarán excluidos por defecto. Un patrón sin coincidencias se informará explícitamente. Un inventario truncado no se utilizará para certificar un análisis completo.

## Markdown libre y activación de reglas

`rules add` copiará el archivo sin reescribirlo y registrará hash y ruta original. No sobrescribirá una guía existente sin una opción explícita. No necesita frontmatter ni formato especial; los encabezados ayudan a citar secciones. El idioma de la guía y los nombres de pruebas serán decisión del equipo.

La clasificación será una propuesta revisable que identifica instrucciones, posibles detectores y criterios contextuales. El MVP permitirá asociar detectores manualmente; la interpretación automática de prosa no será requisito de funcionamiento. Habilitar una regla requerirá una entrada explícita en configuración o un pack seleccionado.

## Resultado normalizado y CI

Cada evaluación tendrá `ruleId`, `status`, `severity`, `scope`, `message` y `evidence`, con localización cuando exista. `evidence` indicará formato, fuente y limitaciones; no contendrá secretos ni código completo por defecto. Los reportes HTML escaparán contenido proveniente del proyecto.

Códigos de salida propuestos:

| Código | Significado                                                                    |
| ------ | ------------------------------------------------------------------------------ |
| 0      | Sin reglas de nivel error incumplidas ni evaluaciones obligatorias incompletas |
| 1      | Al menos una regla de nivel error incumplida                                   |
| 2      | Configuración/ejecución inválida o regla de nivel error que no pudo evaluarse  |

Si concurren incumplimientos y problemas operativos, prevalece 2 y se conservan todos los resultados. Una regla warning no evaluada permanece visible sin bloquear. `not-applicable` no cuenta como aprobación. Reglas deshabilitadas se enumeran como configuración, no como evaluaciones.

## Migración

Mantener compatibilidad explícita con v1 hasta publicar una migración. La importación de guías puede desarrollarse primero como función aislada y probada, pero no añadirá claves que la CLI actual rechaza. Una migración futura escribirá un archivo nuevo con diff y diagnóstico; no reinterpretará silenciosamente configuraciones antiguas.

## Entrega incremental disponible

`rules add` y `rules list` ya utilizan `.auditor/guides.yaml` con su propio `schema-version: 1`, manteniendo `auditor.yaml` v1 intacto. El registro contiene `id`, `path`, `include`, `original-name` e `imported-sha256`. Al leerlo se calcula el hash actual y se identifica si la copia fue editada. Los ámbitos son declaraciones para uso posterior; aún no hay clasificación ni resolución de instrucciones por archivo. Véase el [uso actual](../README.md#adjuntar-las-guías-del-equipo).

Este registro es un paso incremental y no implementa el ejemplo v2 anterior. La futura migración tendrá que incorporar tanto la configuración v1 como este registro, preservando las copias y sus hashes.

La entrega de cobertura también es incremental sobre packs v1: detector `coverage-thresholds`, ruta `report` y objeto `minimum`. No requiere ni implementa el bloque `standards` v2 propuesto arriba. Véase el [ejemplo ejecutable](../examples/coverage.yaml) y la configuración actual en README.
