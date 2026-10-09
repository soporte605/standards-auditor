# Plan de entregas

El [contrato de producto](product-contract.md) es la referencia para alcance y decisiones. Esta hoja de ruta distingue la base existente de las capacidades propuestas; no asigna fechas antes de estimar cada entrega.

## Base existente

CLI TypeScript con `init`, `check` y `explain`, esquema v1, packs locales/incorporados, severidades, exclusiones, documentos requeridos, detectores de any explícito y supresiones, consola/JSON/HTML e inventario con asociación de pruebas y cobertura importada. Hay pruebas de comportamiento y CI multiplataforma. Las mejoras de presentación y apertura del reporte continúan como trabajo separado en curso.

## Etapa 1 — Contrato y clasificación

Entregables: [producto](product-contract.md) y [configuración propuesta](configuration-contract.md).

Criterio: separar instrucciones, reglas verificables y revisión contextual; preservar excepciones del original; definir evidencia faltante, precedencia, límites de generación y estados de salida. Documentación completada; el esquema v2 sigue siendo una propuesta, sin implementación.

## Etapa 2 — Guías y auditoría reproducible

Primera entrega implementada: `rules add` conserva los bytes y registra procedencia y ámbito; `rules list` muestra guías y hashes, y `check` incluye su procedencia sin interpretarlas como reglas ejecutables. Se usa un registro local independiente compatible con la configuración v1. Quedan pendientes la clasificación y la resolución de instrucciones por archivo. Implementar el contrato mínimo de configuración y una ruta de migración desde v1 antes de exponer nuevas claves.

Ya se implementaron mínimos globales por métrica como detector optativo, con evidencia, estados por métrica y salidas CI. Quedan pendientes normalizar resultados de los demás detectores, mínimos por archivo, verificación de actualidad, documentación estructural y políticas de SemVer/changelog por fases. Cada módulo será optativo. Finalizar presentación breve y HTML sobre el mismo modelo de resultados.

Criterios: fixtures que pasan/fallan, configuración inválida, conflictos entre packs, ámbitos vacíos, cobertura ausente/cero/desactualizada/no compatible y evidencia incompleta en CI. Un reporte parcial nunca certificará cumplimiento completo. Probar instalación y rutas en los tres sistemas operativos.

## Etapa 3 — Planificación y pruebas TypeScript/Vitest

Primero `tests plan` de solo lectura y exportación de contexto para un asistente. Después generación opcional y `tests verify` con comandos explícitos, timeouts y reparación limitada. Los perfiles por framework (Angular, otros) se mantendrán optativos.

Criterios: casos vinculados a APIs reales, pruebas existentes preservadas, límites de archivos respetados, tipos y runner ejecutados, cobertura vinculada a la ejecución y fallo correctamente reportado. Elegir proveedor solo antes de integrar generación remota; no condiciona el núcleo local.

## Etapa 4 — Segundo ecosistema

Adaptador Python como prueba de extensibilidad: descubrimiento, asociación de tests y lectura de evidencia de cobertura con fixtures representativas. Generación para Python requerirá una entrega separada.

Criterio: añadirlo sin modificar el núcleo para introducir conceptos exclusivos de Python o Angular. Publicar una matriz precisa de capacidades por adaptador, no una promesa de soporte universal.

## Etapa 5 — Distribución estable

Resolver nombre npm y licencia; probar el tarball en proyectos limpios; publicar prereleases, guías de adopción y migración, changelog y compatibilidad de Node. Packs versionados con compatibilidad declarada e instalación reproducible mediante lockfile.

Criterio para 1.0: contrato estable, ejemplos completos en dos ecosistemas, CI multiplataforma, política de cambios incompatibles y cero capacidades propuestas presentadas como disponibles.

## Ramas y versiones

`main` protegida, ramas cortas y PRs con checks. Versiones SemVer del paquete, versión de esquema explícita y versiones independientes de packs; guías locales trazables en Git. Registrar intención de cambios con Changesets al preparar la publicación. No automatizar publicación desde una auditoría de otro proyecto.
