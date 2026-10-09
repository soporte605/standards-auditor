# Packs compartidos por la empresa

Un pack compartido es un paquete npm que contiene archivos YAML de reglas. Cada proyecto lo instala y lo referencia; así todos heredan los mismos estándares y se actualizan cambiando una versión.

## Usar un pack compartido

```sh
npm install --save-dev @acme/standards
```

```yaml
# auditor.yaml
schema-version: 1
packs:
  - package:@acme/standards/angular # node_modules/@acme/standards/angular.yaml
  - package:@acme/standards # sin ruta: auditor-pack.yaml en la raíz del paquete
rules:
  acme.changelog: warning # el proyecto puede bajar la severidad o poner off
```

La versión queda fijada por `package.json` y el lockfile, y se actualiza con un PR como cualquier dependencia. Los identificadores de regla deben ser únicos entre todos los packs.

## Publicar uno

Crea un repositorio con esta forma y publícalo en tu registro privado (npm, GitHub Packages) o instálalo directamente desde Git (`"@acme/standards": "github:acme/standards#v1.2.0"`):

```text
package.json          # name: "@acme/standards"
angular.yaml          # schema-version: 1, name, rules
node.yaml
auditor-pack.yaml     # pack predeterminado (opcional)
```

Cada regla puede incluir `guidance`, que aparece en el panel de salud y en `explain` para explicar a quien se incorpora cómo cumplirla.

## Límites

- El auditor no descarga nada: lee solo lo ya instalado en `node_modules`, buscando hacia arriba desde `auditor.yaml`.
- Las rutas con `..` se rechazan.
- Un proyecto puede cambiar la severidad o desactivar una regla, pero no sus umbrales internos (por ejemplo `minimum`); para eso, copia el pack o publica una variante.
