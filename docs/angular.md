# Reglas de Angular

`builtin:angular` reúne comprobaciones objetivas basadas en documentación pública:

- [Guía de pruebas de Angular](https://angular.dev/guide/testing) y la [guía de estilo](https://angular.dev/style-guide).
- Documentación de [Vitest](https://vitest.dev/guide/coverage) y [Jasmine](https://jasmine.github.io/) para pruebas enfocadas, desactivadas y cobertura.

```yaml
# auditor.yaml
schema-version: 1
packs:
  - builtin:angular
rules:
  testing.source-has-test: off # si también cargas builtin:testing
  angular.coverage-minimum: error # sube la severidad cuando exista el reporte
```

| Regla                          | Severidad | Qué comprueba                                                                                  |
| ------------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| `angular.artifacts-have-tests` | warning   | Componentes, servicios, directivas, pipes, guards y resolvers tienen su `.spec.ts` (mín. 80 %) |
| `angular.no-focused-tests`     | error     | No hay `fit`, `fdescribe`, `it.only`, `test.only` ni `describe.only`                           |
| `angular.no-disabled-tests`    | warning   | No hay `xit`, `xdescribe`, `it.skip`, `test.skip` ni `describe.skip`                           |
| `angular.no-testbed-get`       | warning   | No se usa `TestBed.get`; se prefiere `TestBed.inject`                                          |
| `angular.coverage-minimum`     | warning   | El reporte `json-summary` alcanza 80 % en las cuatro métricas                                  |

Cada regla trae `guidance`, que aparece en el panel de salud y en `standards-auditor explain <regla>`.

Las reglas de tipado (`any`, `@ts-ignore`) no forman parte del pack: ya las cubren ESLint y el modo estricto de TypeScript. Hay un ejemplo en [`examples/packs/typescript-estricto.yaml`](../examples/packs/typescript-estricto.yaml) por si tu equipo las quiere.

## Límites

- Las comprobaciones leen el código; no ejecutan las pruebas ni miden su calidad.
- Los umbrales (80 %) son un punto de partida. Para otros valores, copia el pack a un archivo propio o publica uno compartido ([packs compartidos](shared-packs.md)).
- Las convenciones propias de tu arquitectura (por ejemplo, probar solo facades o servicios) no forman parte del estándar: defínelas en un pack del equipo.
