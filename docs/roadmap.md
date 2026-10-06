# Plan de entregas

## Implementado en la base TypeScript

- Paquete npm local con CLI `init`, `check` y `explain`.
- YAML validado, paquetes incorporados y locales, severidades y exclusiones.
- Documentos obligatorios, `any` explícito y supresiones de tipos en TypeScript.
- Reportes de consola/JSON/HTML y códigos de salida.
- Árbol configurable con asociación de pruebas y cobertura Istanbul json-summary importada.
- Pruebas de comportamiento, tipos estrictos y CI multiplataforma.
- Documento original y clasificación de principios generales y convenciones específicas.

## Siguiente entrega

- Detector SemVer sobre una fuente y clave configurables.
- Comprobación estructural del changelog y correspondencia con versión declarada.
- Secciones de documentación requeridas.
- Umbrales de cobertura configurables como reglas que puedan bloquear CI; hoy el objetivo de líneas es informativo.
- Más casos de prueba y medición de cobertura del propio auditor.

## Adaptadores posteriores

- Reglas Vitest basadas en imports y AST, sin búsquedas ambiguas por texto.
- Paquete Angular/facades optativo según el documento original.
- Nuevos lenguajes cuando existan reglas y evidencia de validación concretas.

## Distribución

Elegir nombre/licencia y publicar npm. Después, versionado e instalación reproducible de paquetes de reglas externos. La generación de pruebas y las correcciones automáticas quedan fuera del alcance actual.
