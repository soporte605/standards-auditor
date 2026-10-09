# Husky, CI y ramas protegidas

El auditor no modifica Git. Se integra en tres capas, de la más rápida a la más firme:

| Capa                    | Qué hace                                                 | Quién la puede saltar        |
| ----------------------- | -------------------------------------------------------- | ---------------------------- |
| Hook `pre-push` (Husky) | Avisa en local y bloquea push directo a `main`/`develop` | Cualquiera con `--no-verify` |
| CI (GitHub Actions)     | Ejecuta `check` en cada PR y publica el reporte HTML     | Nadie, si es check requerido |
| Protección de rama      | Exige PR y el check del CI antes de fusionar             | Solo administradores         |

El hook ayuda a quien está aprendiendo a enterarse antes de subir; la garantía real es la protección de rama junto con el check requerido en CI.

## Husky

```sh
npm install --save-dev husky
npx husky init
cp node_modules/standards-auditor/examples/husky/pre-push .husky/pre-push
```

[`examples/husky/pre-push`](../examples/husky/pre-push) rechaza el push desde ramas protegidas y ejecuta `standards-auditor check --details`. Con errores el comando sale con 1 y Git cancela el push; las advertencias no bloquean.

## CI

Copia [`examples/ci/standards-audit.yml`](../examples/ci/standards-audit.yml) a `.github/workflows/`. Después, en GitHub: _Settings → Branches → Branch protection rule_, activa "Require a pull request" y "Require status checks" con el job `audit`.

## Ritmo de adopción para proyectos existentes

Empieza con `testing.source-has-test` en `warning` y sube el mínimo de forma gradual; deja `testing.has-unit-tests` como `error` desde el principio. Cada regla puede ajustarse en `auditor.yaml` (`rules:`) sin editar el pack.
