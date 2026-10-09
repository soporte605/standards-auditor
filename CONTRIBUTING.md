# Cómo contribuir

¡Gracias por querer mejorar Standards Auditor! Puedes reportar un fallo o proponer una idea con un [issue](https://github.com/soporte605/standards-auditor/issues/new/choose), mejorar la documentación o enviar código. Quita rutas con tu usuario y datos privados de reportes y capturas antes de compartirlos. Las vulnerabilidades se reportan en privado: ver [SECURITY.md](SECURITY.md).

## Enviar cambios

1. Haz un fork y crea una rama desde `develop` (no desde `main`).
2. Ejecuta `npm ci` y `npm run check` antes de cada commit.
3. Abre el Pull Request hacia `develop`. Si GitHub lo propone hacia `main`, cambia la rama de destino. La primera vez, el mantenedor tiene que aprobar la ejecución del CI.

Al contribuir aceptas que tu aportación se publique bajo la [licencia MIT](LICENSE) del proyecto.

## Ramas

| Rama                                   | Uso                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `main`                                 | Solo versiones publicadas, cada una con su tag `vX.Y.Z`. Protegida. |
| `develop`                              | Integración del trabajo en curso. Todo entra por Pull Request.      |
| `feat/…`, `fix/…`, `docs/…`, `chore/…` | Una rama corta por cambio, creada desde `develop`.                  |

Los PR de trabajo van hacia `develop`, nunca hacia `main`. No se reescribe la historia de `main` ni se mueven tags publicados. La protección de ramas depende de la configuración y el plan de GitHub: exigir PR y el check `check` del CI en `main` y `develop`.

## Desarrollo

Node.js 22 o superior y npm. Usar `npm ci` para respetar el lockfile.

```sh
npm run check
npm pack --dry-run
```

`check` valida tipos, formato y pruebas de comportamiento. Para nuevas reglas, añadir casos válidos, incumplimientos, exclusiones y límites del detector. No añadir dependencias de Angular al núcleo. Los criterios subjetivos se documentan como revisión contextual.

Usar commits descriptivos (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Actualizar `CHANGELOG.md` bajo `[Sin publicar]` y explicar cambios de configuración o JSON. Los detectores auditan sin modificar ni ejecutar código del proyecto.

## Changelog y versiones

El `CHANGELOG.md` sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) en español (`Añadido`, `Cambiado`, `Corregido`, `Eliminado`) y SemVer. Todo cambio visible para quien usa la herramienta lleva su entrada en `[Sin publicar]`. Las contribuciones externas se registran siempre, con número de PR y agradecimiento: `(#34, gracias a @usuario)`. Las notas de cada Release se generan desde esa sección, así que deben leerse bien por sí solas. El proceso para publicar está en [docs/releasing.md](docs/releasing.md).
