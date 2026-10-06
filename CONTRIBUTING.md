# Contribución

## Ramas

`main` integra cambios revisados y debe mantenerse compilable. Crear ramas cortas desde `main`: `feat/<tema>`, `fix/<tema>`, `docs/<tema>` o `chore/<tema>`. Integrar mediante pull request y eliminar la rama una vez integrada. No se necesita una rama permanente `develop` en esta etapa.

Una vez creado el remoto, configurar protección de `main`: PR obligatorio, al menos una aprobación y CI aprobado. Estas protecciones son una política pendiente de configurar en el proveedor, no controles activos locales.

## Cambios

Usar commits descriptivos: `feat:`, `fix:`, `docs:`, `refactor:`, `test:` y `chore:`. El título del PR debe describir el resultado. Esta convención es manual por ahora.

Actualizar `CHANGELOG.md` bajo `Unreleased` para cambios de comportamiento. Documentar opciones públicas y añadir pruebas de comportamiento para nuevas reglas, incluyendo casos válidos, incumplimientos y errores de lectura o configuración.

## Validación

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --locked
cargo build --workspace --locked
```

Las reglas no deben modificar archivos ni ejecutar código del proyecto auditado. Mantener deterministas los reportes; la CLI debe distinguir incumplimientos de errores operativos.
