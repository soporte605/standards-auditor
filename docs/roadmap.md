# Plan de entregas

## Implementado en la base TypeScript

- Paquete npm local con CLI `init`, `check` y `explain`.
- YAML validado, paquetes incorporados y locales, severidades y exclusiones.
- Documentos obligatorios, `any` explícito y supresiones de tipos en TypeScript.
- Reportes de consola/JSON y códigos de salida.
- Pruebas de comportamiento, tipos estrictos y CI multiplataforma.
- Documento original y clasificación de principios generales y convenciones específicas.

## Siguiente entrega

- Detector SemVer sobre una fuente y clave configurables.
- Comprobación estructural del changelog y correspondencia con versión declarada.
- Secciones de documentación requeridas.
- Importación de cobertura real con umbrales configurables.
- Más casos de prueba y medición de cobertura del propio auditor.

## Adaptadores posteriores

- Reglas Vitest basadas en imports y AST, sin búsquedas ambiguas por texto.
- Paquete Angular/facades optativo según el documento original.
- Nuevos lenguajes cuando existan reglas y evidencia de validación concretas.

## Distribución

Elegir nombre/licencia y publicar npm. Después, versionado e instalación reproducible de paquetes de reglas externos. La generación de pruebas y las correcciones automáticas quedan fuera del alcance actual.
