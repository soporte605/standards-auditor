# Paquetes de reglas

Disponibles: `builtin:docs` y `builtin:typescript-tests`. Un paquete es un YAML con `schema-version`, `name` y `rules`. Ver los archivos de esta carpeta y [el ejemplo de equipo](../examples/team.yaml).

Detectores aceptados:

| Detector                    | Parámetros              | Uso                                      |
| --------------------------- | ----------------------- | ---------------------------------------- |
| `required-files`            | `files`: lista de rutas | Presencia de documentos u otros archivos |
| `typescript-no-any`         | `include`: patrones     | Tipos `any` explícitos                   |
| `typescript-no-suppression` | `include`: patrones     | Directivas `@ts-ignore` y `@ts-nocheck`  |

Cada regla define `id` (formato `dominio.nombre`), `detector`, `severity` (`warning`/`error`) y `description`. Las claves no reconocidas se rechazan. Identificadores duplicados también se rechazan: usa un identificador propio para tus reglas.

Para adoptar un paquete, añádelo a `packs` en `auditor.yaml`. Para desactivarlo, quítalo de la lista; para desactivar una regla, configura su identificador como `off`. Eliminar todo el análisis es posible deshabilitando las reglas y queda visible en el resumen de reglas habilitadas.

Los archivos locales permiten configurar detectores existentes sin programar. Nuevos detectores requieren una implementación en el motor. Los paquetes incorporados se versionan con npm; los YAML locales, con Git. No hay cargador de código externo ni registro remoto de reglas todavía.
