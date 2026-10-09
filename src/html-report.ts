import type { Report } from './engine.js';
import { escapeHtml } from './html-utils.js';
import { reportCss } from './report-css.js';
import { renderFindings, renderNotes } from './report-lists.js';
import { renderCoverage, renderMap } from './report-map.js';
import { renderRules, renderSummary, verdict } from './report-overview.js';
import { reportScript } from './report-script.js';
import { icon } from './report-ui.js';

/** A self-contained, offline report. Untrusted audit data never enters scripts. */
export function renderHtml(
  report: Report,
  context: { project: string; generatedAt: Date },
): string {
  const { errors, warnings } = report.summary;
  const passed = report.ruleResults.filter((r) => r.status === 'pass').length;
  const failing = report.ruleResults.length - passed;
  const coverageAlert = (report.coverageEvaluations ?? []).some(
    (item) => item.status !== 'pass',
  );
  const tab = (id: string, label: string, count = '', tone = ''): string =>
    `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="panel-${id}" aria-selected="${id === 'resumen'}">${label}${count ? `<span class="tab-count"${tone ? ` data-tone="${tone}"` : ''}>${count}</span>` : ''}</button>`;
  const panel = (id: string, body: string): string =>
    `<section role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0">${body}</section>`;
  const stamp = context.generatedAt
    .toISOString()
    .replace('T', ' · ')
    .replace(/\.\d{3}Z$/, ' UTC');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Auditoría · ${escapeHtml(context.project)}</title>
<style>${reportCss}</style>
<script>${reportScript}</script>
</head>
<body><main>
<div class="top"><div class="brand"><span class="logo" aria-hidden="true">sa/</span><div><h1>${escapeHtml(context.project)}</h1><p>Standards Auditor · estado frente a los estándares de tu equipo</p></div></div><div class="theme seg" role="group" aria-label="Tema"><button type="button" data-theme-set="system" aria-pressed="true" title="Tema del sistema" aria-label="Tema del sistema">${icon('system')}</button><button type="button" data-theme-set="light" aria-pressed="false" title="Tema claro" aria-label="Tema claro">${icon('sun')}</button><button type="button" data-theme-set="dark" aria-pressed="false" title="Tema oscuro" aria-label="Tema oscuro">${icon('moon')}</button></div><time datetime="${context.generatedAt.toISOString()}">${escapeHtml(stamp)}</time></div>
<nav class="tabs" role="tablist" aria-label="Secciones del reporte">
${tab('resumen', 'Resumen')}${tab('reglas', 'Reglas', report.ruleResults.length ? `${passed}/${report.ruleResults.length}` : '', failing ? 'crit' : '')}${tab('mapa', 'Mapa')}${tab('cobertura', 'Cobertura', coverageAlert ? '!' : '', coverageAlert ? 'warn' : '')}${tab('hallazgos', 'Hallazgos', String(report.findings.length), errors ? 'crit' : warnings ? 'warn' : '')}${tab('notas', 'Notas', report.notices.length ? String(report.notices.length) : '')}
</nav>
${panel('resumen', renderSummary(report))}
${panel('reglas', renderRules(report))}
${panel('mapa', renderMap(report))}
${panel('cobertura', renderCoverage(report))}
${panel('hallazgos', renderFindings(report))}
${panel('notas', renderNotes(report))}
<footer><span>Standards Auditor · reporte HTML independiente (${verdict(report).title})</span><span>Solo se evalúan las reglas y el alcance configurados.</span></footer>
</main>
</body></html>`;
}
