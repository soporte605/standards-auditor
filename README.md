# Standards Auditor

**Descubre en segundos qué le falta de pruebas unitarias a un proyecto, y cómo arreglarlo.**

Tu equipo define dónde debe haber pruebas. Standards Auditor revisa el proyecto, dice qué archivos no tienen la suya, cuál sería su ruta y muestra la salud del proyecto en un reporte pensado para desarrolladores. Pensado para equipos con TypeScript (Angular y Vitest, Jest o Karma) y para quien se incorpora y aún no conoce el estándar.

**Estado:** `0.2.0-alpha.1` · Node.js 22 o superior · Linux, macOS y Windows

```text
# Ejemplo abreviado de la salida
$ npx standards-auditor check --details
Resultado: 1 error · 2 advertencias · 6 reglas habilitadas
Salud: 3/6 reglas cumplidas
  ✖ [testing.has-unit-tests] El proyecto debe tener pruebas unitarias.
  ✖ [angular.artifacts-have-tests] Cada componente, servicio, … tiene su archivo de prueba.
AVISO src/app/user.service.ts → crea src/app/user.service.spec.ts
```

## Qué revisa

| Regla                                 | Pregunta que responde                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Hay pruebas unitarias                 | ¿El proyecto tiene alguna?                                         |
| Cada artefacto tiene la suya          | ¿Los componentes, servicios, pipes y guards tienen su `.spec.ts`?  |
| Sin pruebas enfocadas ni desactivadas | ¿Quedó un `it.only`, `fit` o `xit` olvidado?                       |
| Cobertura mínima                      | ¿El reporte `json-summary` alcanza el umbral que acordó el equipo? |

Cada regla explica **cómo cumplirla**. No ejecuta tus pruebas ni modifica tu código. Las reglas, las severidades y los umbrales los decide tu equipo.

## Empezar

1. Descarga `standards-auditor-0.2.0-alpha.1.tgz` desde las [Releases](https://github.com/soporte605/standards-auditor/releases) (no el "Source code").
2. En tu proyecto:

```sh
npm install --save-dev /ruta/al/standards-auditor-0.2.0-alpha.1.tgz
npx standards-auditor init     # detecta TypeScript, Angular y tu runner
npx standards-auditor check    # resumen en consola
npx standards-auditor check --open   # reporte visual en el navegador
```

`check` devuelve `1` si hay errores, por lo que sirve en CI y como hook de `pre-push`. Con Angular activa `builtin:angular` automáticamente.

## Ajustar las reglas de tu equipo

```yaml
# auditor.yaml
schema-version: 1
packs: [builtin:typescript-tests, builtin:testing, builtin:angular]
rules:
  testing.source-has-test: off # desactiva una regla
  angular.coverage-minimum: error # sube la severidad
```

## Más

- [Guía completa](docs/guia-completa.md): configuración, cobertura, inventario y todos los comandos.
- [Reglas de Angular](docs/angular.md) · [Packs compartidos por la empresa](docs/shared-packs.md) · [Husky y CI](docs/git-hooks.md)
- [Contribuir](CONTRIBUTING.md) · [Publicar versiones](docs/releasing.md) · [Changelog](CHANGELOG.md)

Licencia [MIT](LICENSE).
