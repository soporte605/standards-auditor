# Arquitectura

## Objetivo

Auditar estándares configurables de cualquier equipo. El lenguaje del motor no limita los lenguajes auditables; cada lenguaje requiere analizadores y reglas apropiados.

## Separación

- `auditor-cli`: argumentos, salida y códigos de terminación.
- `auditor-core`: contratos de reglas y hallazgos. El ejecutor se implementará después.
- Paquetes: manifiestos declarativos con identidad, versión, compatibilidad, reglas y valores predeterminados.
- Adaptadores: interpretación específica del lenguaje o framework, inicialmente TypeScript/Angular.

Solo existen las dos primeras crates. Crear nuevas crates al implementar responsabilidades concretas.

## Configuración propuesta

YAML configura detectores disponibles; una frase en lenguaje natural no constituye un detector. Se rechazarán claves desconocidas, versiones incompatibles y reglas no soportadas, en lugar de ignorarlas. Las rutas se resolverán respecto a la raíz explícita del proyecto. Las exclusiones se aplicarán antes del análisis.

Los paquetes podrán definir reglas mediante detectores soportados y parámetros. Las reglas sintácticas necesitarán un analizador. La extensión mediante código externo se evaluará después; no se cargarán bibliotecas nativas arbitrarias como parte del primer MVP.

## Reportes previstos

Consola y JSON deterministas: identificador de regla, severidad, explicación, ruta y ubicación si existe. Códigos previstos: `0` sin errores de auditoría, `1` incumplimientos de severidad error, `2` fallo de uso, configuración o ejecución. Las advertencias no bloquearán por defecto.

## Límites

Formato SemVer y consistencia entre archivos son comprobables. Determinar el incremento correcto requiere una base de comparación y evidencia de cambios de API; no se inferirá únicamente del número de versión.

La existencia de documentación no demuestra su calidad. Las reglas cualitativas se marcarán como revisión manual cuando no haya un detector fiable.

El MVP audita. Cambiar versiones, generar changelog, corregir archivos y publicar releases quedan fuera de esa primera entrega.
