import type { Report } from './engine.js';

export function renderText(
  report: Report,
  project: string,
  details = false,
  hint = true,
): string {
  const { errors, warnings, evaluatedRules } = report.summary;
  const lines = [
    `Standards Auditor · ${project}`,
    `Resultado: ${errors} ${errors === 1 ? 'error' : 'errores'} · ${warnings} ${warnings === 1 ? 'advertencia' : 'advertencias'} · ${evaluatedRules} reglas habilitadas`,
  ];
  if (report.ruleResults.length) {
    const passed = report.ruleResults.filter((r) => r.status === 'pass').length;
    lines.push(
      `Salud: ${passed}/${report.ruleResults.length} reglas cumplidas`,
    );
    if (details)
      for (const rule of report.ruleResults)
        lines.push(
          `  ${rule.status === 'pass' ? '✔' : rule.status === 'fail' ? '✖' : '◌'} [${rule.ruleId}] ${rule.description}${rule.status === 'fail' && rule.guidance ? ` Cómo cumplirla: ${rule.guidance}` : ''}`,
        );
  }
  if (report.inventory) {
    const { summary, coverage, truncated, files, totalFiles } =
      report.inventory;
    lines.push(
      summary.sources
        ? `Pruebas: ${summary.withTests}/${summary.sources} fuentes con test asociado · ${summary.withoutTests} sin test asociado`
        : 'Pruebas: sin fuentes en el alcance del inventario',
    );
    const coverageText =
      coverage.status === 'not-configured'
        ? 'reporte no configurado'
        : coverage.status === 'missing'
          ? 'reporte no encontrado'
          : coverage.status === 'invalid'
            ? 'reporte inválido o ilegible'
            : coverage.total?.lines == null
              ? 'reporte importado sin total de líneas'
              : `${coverage.total.lines}% de líneas (total del reporte)`;
    lines.push(
      `Cobertura: ${coverageText}${coverage.minimumLines === null ? '' : ` · objetivo visual ${coverage.minimumLines}%`}`,
    );
    if (truncated)
      lines.push(`Inventario parcial: ${files.length}/${totalFiles} archivos`);
  }
  if (report.coverageEvaluations?.length) {
    const evaluations = report.coverageEvaluations;
    lines.push(
      `Mínimos de cobertura: ${evaluations.filter((item) => item.status === 'pass').length} cumplen · ${evaluations.filter((item) => item.status === 'fail').length} incumplen · ${evaluations.filter((item) => item.status === 'not-evaluated').length} sin evaluar`,
    );
    if (report.summary.requiredIncomplete)
      lines.push(
        'Análisis incompleto: faltan datos obligatorios de cobertura (salida 2).',
      );
    if (details)
      for (const item of evaluations)
        lines.push(
          `[${item.ruleId}] ${item.message} Mínimo: ${item.minimum}%; severidad: ${item.severity}.`,
        );
  }
  if (!evaluatedRules)
    lines.push('Sin reglas habilitadas; no se evaluaron estándares.');
  if (report.notices.length)
    lines.push(
      `Alcance: ${report.notices.length} ${report.notices.length === 1 ? 'nota' : 'notas'} para revisar`,
    );
  if (details) {
    for (const finding of report.findings)
      lines.push(
        `${finding.severity === 'error' ? 'ERROR' : 'AVISO'} ${finding.path}${finding.line ? `:${finding.line}:${finding.column ?? 1}` : ''} [${finding.ruleId}] ${finding.message}`,
      );
    for (const notice of report.notices) lines.push(`NOTA ${notice}`);
  } else if (hint)
    lines.push('Detalle: check --details · Reporte visual: check --open');
  return lines.join('\n');
}
