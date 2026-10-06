# Contribución

## Ramas

`main` conserva la base integrada. Crear ramas cortas `feat/<tema>`, `fix/<tema>`, `docs/<tema>` o `chore/<tema>` y usar pull requests. No se necesita una rama permanente `develop`.

La migración desde Rust se desarrolla en `feat/typescript-engine`; la base anterior permanece en el historial. No se reescribe la historia de `main`.

Al configurar el remoto: proteger `main`, exigir un PR revisado y CI aprobado. Estas protecciones todavía no están activas porque no hay remoto.

## Desarrollo

Node.js 22 o superior y npm. Usar `npm ci` para respetar el lockfile.

```sh
npm run check
npm pack --dry-run
```

`check` valida tipos, formato y pruebas de comportamiento. Para nuevas reglas, añadir casos válidos, incumplimientos, exclusiones y límites del detector. No añadir dependencias de Angular al núcleo. Los criterios subjetivos se documentan como revisión contextual.

Usar commits descriptivos (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Actualizar `CHANGELOG.md` bajo `Unreleased` y explicar cambios de configuración o JSON. Los detectores auditan sin modificar ni ejecutar código del proyecto.
