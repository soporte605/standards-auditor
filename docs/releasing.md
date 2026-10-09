# Versiones y publicación

## Versión del paquete

`package.json` y `package-lock.json` contienen la versión del motor y la CLI. La base actual es `0.1.0-alpha.1`, sin publicar. Usar SemVer: antes de `1.0.0`, cambios incompatibles incrementan minor y correcciones compatibles incrementan patch como política interna. Desde `1.0.0`, major indica incompatibilidad, minor nuevas funciones compatibles y patch correcciones. Referencia: https://semver.org/lang/es/.

El esquema YAML y el reporte JSON tienen versiones de formato independientes de la versión del paquete. Los paquetes de reglas incorporados viajan con el motor. La distribución independiente y versionada de paquetes externos está pendiente; por ahora los YAML locales se versionan en Git junto al proyecto.

## Validación y paquete local

```sh
npm ci
npm run check
npm pack --dry-run
npm pack
```

`prepack` compila TypeScript; el archivo `.tgz` contiene JavaScript listo para Node.js, paquetes YAML y documentación. No utiliza scripts de instalación. Probar el `.tgz` como dependencia en un proyecto temporal antes de publicar.

## Publicar una versión

La Release se crea sola al subir un tag `vX.Y.Z`; el flujo replica el de `monitor_sistema`.

1. Desde `develop`, crear `chore/release-vX.Y.Z`.
2. En `CHANGELOG.md`, mover lo de `[Sin publicar]` a `## [X.Y.Z] - AAAA-MM-DD` y actualizar los enlaces del final (`[Sin publicar]` compara contra el nuevo tag).
3. Subir la versión: `npm version X.Y.Z --no-git-tag-version` (actualiza `package.json` y `package-lock.json`).
4. Comprobar localmente: `npm run check`, `node scripts/release-notes.mjs X.Y.Z` (debe imprimir las notas) y `npm pack --dry-run`.
5. Commit `chore(release): vX.Y.Z` y PR hacia `develop`.
6. Tras fusionar, abrir un PR de `develop` hacia `main` (`gh pr create --base main --head develop --title "chore(release): vX.Y.Z"`) y fusionarlo con CI en verde.
7. Con `main` actualizado, crear y subir el tag anotado sobre el commit fusionado: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
8. `.github/workflows/release.yml` ejecuta `npm ci` y `npm run check`, extrae las notas del CHANGELOG, empaqueta el `.tgz`, calcula `SHA256SUMS` y crea la Release. Una versión con guion (`0.2.0-alpha.1`) se marca como prerelease. Seguirlo con `gh run watch` y confirmar que la Release tiene el `.tgz` y `SHA256SUMS`.

El workflow falla, sin publicar nada, si el tag no coincide con la versión de `package.json` o si la sección del CHANGELOG falta o está vacía. Los tags publicados son inmutables: si una versión sale mal, se corrige con una versión nueva.

Si una Release cambia los nombres de los archivos descargables, actualizar la sección de instalación del README.

## Publicación en npm

Todavía no hay publicación en npm. Antes de habilitarla: elegir un nombre disponible y cuenta u organización npm, la licencia MIT ya está definida; quitar `private: true` y añadir un paso `npm publish` con provenance al workflow, protegido por un entorno con aprobación manual.

## Protección de ramas

Las reglas viven en `.github/rulesets/` (copia de las de `monitor_sistema`): `main` y `develop` exigen Pull Request y los seis checks del CI (Ubuntu, macOS y Windows con Node 22 y 24), y no permiten borrar ni forzar el historial. `main` solo admite merge commit. Los administradores pueden saltarlas únicamente mediante un PR. Aplicarlas una sola vez, cuando el repositorio sea público (los rulesets de repositorios privados requieren un plan de pago):

```sh
gh api repos/soporte605/standards-auditor/rulesets --method POST --input .github/rulesets/main.json
gh api repos/soporte605/standards-auditor/rulesets --method POST --input .github/rulesets/develop.json
```

Ajustes recomendados: _Settings → General_: borrar ramas al fusionar, `develop` como rama de trabajo predeterminada para los PR y _Require approval for first-time contributors_ en _Actions → General_.
