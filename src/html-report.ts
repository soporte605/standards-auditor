import type { Report } from './engine.js';

import { escapeHtml } from './html-utils.js';
import { renderHealth, healthCss } from './health-html.js';
import { renderOverview } from './overview-html.js';
import { reportStyles } from './report-styles.js';
import { devTheme } from './dev-theme.js';
import {
  renderInventory,
  inventoryCss,
  inventoryScript,
} from './inventory-html.js';

/** A self-contained, offline report. Untrusted audit data never enters scripts. */
export function renderHtml(
  report: Report,
  context: { project: string; generatedAt: Date },
): string {
  const { errors, warnings, evaluatedRules, analyzedFiles } = report.summary;
  const total = report.findings.length;
  const status = report.summary.requiredIncomplete
    ? 'Análisis incompleto'
    : errors
      ? 'Requiere atención'
      : warnings
        ? 'Con advertencias'
        : !evaluatedRules
          ? 'Sin reglas habilitadas'
          : report.notices.length
            ? 'Revisar alcance'
            : 'Sin incumplimientos detectados';
  const tone = report.summary.requiredIncomplete
    ? 'warning'
    : errors
      ? 'error'
      : warnings || report.notices.length || !evaluatedRules
        ? 'warning'
        : 'ok';
  const icon = { error: '✖', warning: '⚠', ok: '✔' }[tone];
  const passedRules = report.ruleResults.filter(
    (item) => item.status === 'pass',
  ).length;
  const cards = report.findings
    .map(
      (
        finding,
        index,
      ) => `<article class="finding" data-severity="${finding.severity}">
    <div class="finding-top"><span class="badge ${finding.severity}">${finding.severity === 'error' ? 'Error' : 'Advertencia'}</span><code>${escapeHtml(finding.ruleId)}</code><span class="index">${String(index + 1).padStart(2, '0')}</span></div>
    <h3>${escapeHtml(finding.message)}</h3>
    <p class="location">${escapeHtml(finding.path)}${finding.line === undefined ? '' : ` · Línea ${finding.line}${finding.column === undefined ? '' : `, columna ${finding.column}`}`}</p>
  </article>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Auditoría · ${escapeHtml(context.project)}</title>
<style>
${reportStyles}
${inventoryCss}
${healthCss}
${devTheme}
</style>
</head>
<body><main>
<nav class="brand" aria-label="Identidad del reporte"><span class="logo" aria-hidden="true">sa/</span>standards auditor<small>Reporte de estándares</small></nav>
<header><div><div class="eyebrow">standards-auditor check</div><h1>${escapeHtml(context.project)}</h1><p>Estado del proyecto frente a los estándares de tu equipo.</p></div><time datetime="${context.generatedAt.toISOString()}">${escapeHtml(
    context.generatedAt
      .toISOString()
      .replace('T', ' · ')
      .replace(/\.\d{3}Z$/, ' UTC'),
  )}</time></header>
<section class="status" data-tone="${tone}" aria-label="Resultado general"><div class="status-main"><span class="status-icon" aria-hidden="true">${icon}</span><div><h2>${status}</h2><p>${evaluatedRules} reglas habilitadas · ${analyzedFiles} archivos revisados por detectores TypeScript</p></div></div><div class="status-counts"><span class="chip error"><b>${errors}</b>${errors === 1 ? 'error' : 'errores'}</span><span class="chip warning"><b>${warnings}</b>${warnings === 1 ? 'aviso' : 'avisos'}</span><span class="chip ok"><b>${passedRules}/${report.ruleResults.length}</b>reglas ok</span></div></section>
${renderHealth(report)}
${report.coverageEvaluations?.length ? `<section class="panel" aria-label="Mínimos de cobertura"><h2>Mínimos de cobertura</h2><p>Total global del reporte importado. Actualidad no verificada; no se ejecutaron pruebas.</p><ul>${report.coverageEvaluations.map((item) => `<li><strong>${escapeHtml(item.metric)}: ${item.status === 'pass' ? 'Cumple' : item.status === 'fail' ? 'Incumple' : 'No se pudo evaluar'}</strong> · ${item.actual === null ? 'sin dato' : `${item.actual}%`} / mínimo ${item.minimum}% · ${escapeHtml(item.severity)}<details><summary>${escapeHtml(item.ruleId)}</summary><p>${escapeHtml(item.message)}</p><p>${escapeHtml(item.evidence.report)}</p><p>SHA-256: ${escapeHtml(item.evidence.sha256 ?? 'no disponible')}</p></details></li>`).join('')}</ul></section>` : ''}
${report.inventory ? renderOverview(report.inventory) : ''}
${report.inventory ? renderInventory(report.inventory) : ''}
<details class="disclosure" id="findings-details"><summary><span>Hallazgos</span><span class="count">${total} por revisar</span></summary><div class="disclosure-body"><span id="visible-count" class="count" role="status" aria-live="polite">${total} de ${total}</span>
<div class="toolbar" id="toolbar" hidden><div class="filters" role="group" aria-label="Filtrar por severidad"><button type="button" data-filter="all" aria-pressed="true">Todos</button><button type="button" data-filter="error" aria-pressed="false">Errores</button><button type="button" data-filter="warning" aria-pressed="false">Advertencias</button></div><label class="search"><span>Buscar por archivo, regla o mensaje</span><input id="search" type="search" placeholder="Ej. user.service.spec.ts"></label></div>
${cards}
<p id="empty" class="empty"${total ? ' hidden' : ''}>${total ? 'No hay hallazgos que coincidan con los filtros.' : 'No se detectaron incumplimientos con las reglas habilitadas. Revisa el alcance del análisis.'}</p>
<noscript><p class="footnote">Puedes desplegar el detalle sin JavaScript. Habilítalo para utilizar los filtros.</p></noscript></div></details>
${report.notices.length ? `<details class="disclosure notices"><summary><span>Notas del análisis</span><span class="count">${report.notices.length}</span></summary><div class="disclosure-body"><ul>${report.notices.map((notice) => `<li>${escapeHtml(notice)}</li>`).join('')}</ul></div></details>` : ''}
<footer><span>Standards Auditor · Reporte HTML independiente</span><span>Solo se evalúan las reglas y el alcance configurados.</span></footer>
</main>
<script>
const cards = Array.from(document.querySelectorAll('.finding'));
const buttons = Array.from(document.querySelectorAll('[data-filter]'));
const search = document.getElementById('search');
let severity = 'all';
function update() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of cards) {
    const matches = (severity === 'all' || card.dataset.severity === severity) && card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visible++;
  }
  document.getElementById('visible-count').textContent = visible + ' de ' + cards.length;
  document.getElementById('empty').hidden = visible !== 0;
}
for (const button of buttons) button.addEventListener('click', () => {
  severity = button.dataset.filter;
  for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
  update();
});
search.addEventListener('input', update);
document.getElementById('toolbar').hidden = false;
${inventoryScript}
for (const button of document.querySelectorAll('[data-copy]')) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const text = button.dataset.copy;
    const done = () => { button.textContent = 'copiado'; setTimeout(() => { button.textContent = 'copiar'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
    else {
      const area = document.createElement('textarea');
      area.value = text; document.body.appendChild(area); area.select();
      try { document.execCommand('copy'); } catch (error) {}
      area.remove(); done();
    }
  });
}
for (const button of document.querySelectorAll('[data-jump]')) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const section = document.getElementById('inventory-details');
    section.open = true;
    const filter = document.getElementById('tree-filter');
    filter.value = button.dataset.jump;
    filter.dispatchEvent(new Event('change'));
    section.scrollIntoView({block: 'start'});
    filter.focus({preventScroll:true});
  });
}
let printState = [];
window.addEventListener('beforeprint', () => {
  printState = Array.from(document.querySelectorAll('details')).map(item => [item, item.open]);
  for (const [item] of printState) item.open = true;
});
window.addEventListener('afterprint', () => {
  for (const [item, open] of printState) item.open = open;
});
</script>
</body></html>`;
}
