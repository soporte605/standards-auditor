# Ramas y versiones

## Versiones independientes

- Motor y CLI: misma versión en `[workspace.package]` de `Cargo.toml`.
- Cada paquete: su propia versión SemVer, al implementarse.
- Formato de configuración: `schema-version` entero, independiente de las versiones del motor y paquetes.

La compatibilidad del motor y los paquetes deberá declararse explícitamente. El formato de configuración, los identificadores de reglas, la salida JSON y los códigos de terminación forman parte de la interfaz pública prevista.

## Desarrollo inicial

`0.1.0-dev.0` identifica esta base sin publicar. Antes de `1.0.0`, política del proyecto: cambios incompatibles incrementan minor y correcciones compatibles incrementan patch; documentar siempre las incompatibilidades. SemVer permite inestabilidad en `0.x`, por lo que esta política añade previsibilidad.

Después de `1.0.0`: major para cambios incompatibles, minor para funciones compatibles y patch para correcciones compatibles. Referencia: https://semver.org/lang/es/.

## Primera publicación

1. Completar el alcance de la entrega y validar en CI.
2. Elegir licencia y destino de distribución.
3. Actualizar la versión del workspace y regenerar `Cargo.lock` con Cargo.
4. Mover entradas de `Unreleased` a una sección con versión y fecha real.
5. Revisar e integrar el PR en `main`.
6. Crear el tag correspondiente, por ejemplo `v0.1.0`, sobre el commit revisado.
7. Construir y publicar artefactos de las plataformas verificadas con checksums.

Los tags de versiones publicadas son inmutables. El paso de publicación es manual y no está implementado por CI. No existe ningún release o tag inicial todavía.
