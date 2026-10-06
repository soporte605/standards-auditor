# Versiones y publicación

## Versión del paquete

`package.json` y `package-lock.json` contienen la versión del motor y la CLI. La base actual es `0.1.0-dev.0`, sin publicar. Usar SemVer: antes de `1.0.0`, cambios incompatibles incrementan minor y correcciones compatibles incrementan patch como política interna. Desde `1.0.0`, major indica incompatibilidad, minor nuevas funciones compatibles y patch correcciones. Referencia: https://semver.org/lang/es/.

El esquema YAML y el reporte JSON tienen versiones de formato independientes de la versión del paquete. Los paquetes de reglas incorporados viajan con el motor. La distribución independiente y versionada de paquetes externos está pendiente; por ahora los YAML locales se versionan en Git junto al proyecto.

## Validación y paquete local

```sh
npm ci
npm run check
npm pack --dry-run
npm pack
```

`prepack` compila TypeScript; el archivo `.tgz` contiene JavaScript listo para Node.js, paquetes YAML y documentación. No utiliza scripts de instalación. Probar el `.tgz` como dependencia en un proyecto temporal antes de publicar.

## Primera publicación futura

1. Elegir un nombre disponible, licencia y cuenta/organización npm.
2. Validar CI en los sistemas y versiones Node soportados.
3. Cambiar la versión con `npm version <version> --no-git-tag-version`, actualizando ambos manifiestos.
4. Actualizar changelog con versión y fecha real; conservar `Unreleased`.
5. Quitar `private: true` únicamente cuando se vaya a habilitar publicación.
6. Revisar e integrar el PR; crear un tag `v<version>` sobre el commit revisado.
7. Publicar el artefacto validado y registrar sus checksums.

No hay publicación automática, remoto ni tags creados. Los tags de versiones publicadas son inmutables. No se incrementó la versión en esta migración porque la base anterior no se había publicado.
