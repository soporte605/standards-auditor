# Plan de entregas

## Base actual

Workspace, contratos experimentales, ayuda y versión, CI y política de contribución. Sin motor de ejecución ni reglas implementadas.

## MVP 0.1.0

- Cargar YAML con validación estricta y `schema-version`.
- Habilitar y deshabilitar paquetes locales y ajustar severidades.
- Ejecutar `check` con selección de archivos y exclusiones.
- Primer detector de documentación: archivos obligatorios.
- Validar SemVer de una fuente configurada y correspondencia con el changelog.
- Reportes de consola y JSON con códigos de salida comprobados.
- Pruebas con proyectos de ejemplo y configuraciones inválidas.

## Adaptador Angular

- Incorporar y clasificar el archivo de reglas original del usuario.
- Separar reglas generales, sintácticas y de revisión manual.
- Implementar los detectores acordados y validar falsos positivos con fixtures.

## Distribución y extensibilidad

- Manifiestos de paquetes con versiones y compatibilidad.
- Instalación reproducible con versiones fijadas y verificación de integridad.
- Binarios por plataforma y proceso de publicación.
- Nuevos adaptadores cuando exista un conjunto concreto de reglas.

Las versiones de entregas posteriores se asignarán según el alcance final y su compatibilidad.
