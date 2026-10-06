import type { Report } from './engine.js';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

/** A self-contained, offline report. Untrusted audit data never enters scripts. */
export function renderHtml(
  report: Report,
  context: { project: string; generatedAt: Date },
): string {
  const { errors, warnings, evaluatedRules, analyzedFiles } = report.summary;
  const total = report.findings.length;
  const status = errors
    ? 'Requiere atención'
    : warnings
      ? 'Con advertencias'
      : !evaluatedRules
        ? 'Sin reglas habilitadas'
        : report.notices.length
          ? 'Revisar alcance'
          : 'Sin incumplimientos detectados';
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
:root{color-scheme:light;--ink:#172c35;--muted:#51656c;--paper:#f5f5f0;--line:#dce2df;--orange:#d84c26;--red:#aa2923;--amber:#855300;--green:#22624c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1160px;margin:auto;padding:36px 32px 64px}.brand{display:flex;align-items:center;gap:12px;font-weight:750;letter-spacing:-.03em}.logo{background:var(--ink);color:#fff;border-radius:10px;padding:7px 11px;font:700 16px/1.5 monospace}.brand small{margin-left:auto;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}header{display:flex;justify-content:space-between;gap:30px;align-items:end;margin:52px 0 30px}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:.15em;color:var(--muted);font-weight:700}h1{font-size:clamp(28px,5vw,46px);line-height:1.15;letter-spacing:-.045em;margin:12px 0;overflow-wrap:anywhere}header p{margin:0;color:var(--muted)}time{white-space:nowrap;font-size:13px}.hero{background:var(--ink);color:#fff;border-radius:18px;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;gap:32px}.hero h2{font-size:25px;letter-spacing:-.025em;margin:4px 0 8px}.hero p{color:#c7d4d6;margin:0;max-width:580px}.hero .eyebrow{color:#c7d4d6}.distribution{min-width:210px}.bar{height:9px;background:#587078;border-radius:9px;overflow:hidden;display:flex;margin:12px 0}.bar .errors{background:#ff957e}.bar .warnings{background:#f1cc72}.distribution small{color:#dbe4e5}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0 38px}.metric{border:1px solid var(--line);border-radius:14px;background:#fff;padding:20px 24px}.metric strong{display:block;font-size:34px;line-height:1.25;letter-spacing:-.04em}.metric span{color:var(--muted);font-size:13px}.metric.error strong{color:var(--red)}.metric.warning strong{color:var(--amber)}.section-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.section-head h2{font-size:22px;letter-spacing:-.03em;margin:0}.count{color:var(--muted);font-size:13px}.toolbar{display:flex;gap:16px;align-items:end;justify-content:space-between;margin:18px 0}.filters{display:flex;gap:6px;flex-wrap:wrap}button{font:inherit;border:1px solid var(--line);background:#fff;color:var(--ink);padding:8px 14px;border-radius:8px;cursor:pointer}button[aria-pressed="true"]{background:var(--ink);color:#fff;border-color:var(--ink)}button:focus-visible,input:focus-visible{outline:3px solid var(--orange);outline-offset:3px}.search{width:min(100%,340px)}.search span{font-size:12px;color:var(--muted);display:block;margin-bottom:5px}input{width:100%;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}.finding{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px 24px;margin:12px 0;break-inside:avoid}.finding-top{display:flex;align-items:center;gap:12px}.badge{font-size:11px;font-weight:750;border-radius:6px;padding:3px 8px}.badge.error{background:#fde9e4;color:var(--red)}.badge.warning{background:#fff1cb;color:var(--amber)}code{font-size:12px;overflow-wrap:anywhere}.index{margin-left:auto;color:var(--muted);font:12px monospace}h3{font-size:15px;font-weight:600;margin:14px 0 8px;overflow-wrap:anywhere}.location{font:12px/1.7 monospace;color:var(--muted);margin:0;overflow-wrap:anywhere}.empty{border:1px dashed #b8c7c0;border-radius:12px;padding:30px;color:var(--muted);text-align:center}.notices{margin:32px 0;padding:20px 24px;border-left:3px solid #b88727;background:#fff9e9;border-radius:0 12px 12px 0}.notices h2{font-size:17px;margin:0 0 8px}.notices li{overflow-wrap:anywhere}footer{border-top:1px solid var(--line);margin-top:32px;padding-top:20px;color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:20px}.footnote{color:var(--muted);font-size:12px}[hidden]{display:none!important}
@media(max-width:700px){main{padding:24px 18px}header{display:block;margin-top:36px}header time{display:block;margin-top:16px}.brand small{display:none}.hero{display:block;padding:24px}.distribution{margin-top:24px}.metrics{grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:16px}.toolbar{align-items:stretch;flex-direction:column}.search{width:100%}.finding{padding:18px}.finding-top{flex-wrap:wrap}footer{display:block}}
@media print{body{background:white}main{max-width:none;padding:0}.toolbar{display:none}.hero{background:white;color:var(--ink);border:1px solid var(--line)}.hero p,.hero .eyebrow,.distribution small{color:var(--muted)}.finding[hidden]{display:block!important}.metrics{grid-template-columns:repeat(4,1fr)}header{margin-top:20px}footer{display:block}}
</style>
</head>
<body><main>
<nav class="brand" aria-label="Identidad del reporte"><span class="logo" aria-hidden="true">sa/</span>standards auditor<small>Reporte de estándares</small></nav>
<header><div><div class="eyebrow">Auditoría del proyecto</div><h1>${escapeHtml(context.project)}</h1><p>Una vista clara de los estándares que requieren tu atención.</p></div><time datetime="${context.generatedAt.toISOString()}">${escapeHtml(
    context.generatedAt
      .toISOString()
      .replace('T', ' · ')
      .replace(/\.\d{3}Z$/, ' UTC'),
  )}</time></header>
<section class="hero" aria-label="Resultado general"><div><div class="eyebrow">Resultado del análisis</div><h2>${status}</h2><p>${errors ? 'Revisa primero los errores. Las advertencias señalan mejoras que no bloquean la auditoría.' : 'El resultado refleja únicamente las reglas habilitadas y su alcance; no certifica la calidad completa del proyecto.'}</p></div><div class="distribution"><strong>${total} hallazgos</strong><div class="bar" aria-hidden="true"><span class="errors" style="width:${total ? (errors / total) * 100 : 0}%"></span><span class="warnings" style="width:${total ? (warnings / total) * 100 : 0}%"></span></div><small>${errors} errores · ${warnings} advertencias</small></div></section>
<section class="metrics" aria-label="Resumen"><div class="metric error"><strong>${errors}</strong><span>Errores</span></div><div class="metric warning"><strong>${warnings}</strong><span>Advertencias</span></div><div class="metric"><strong>${evaluatedRules}</strong><span>Reglas habilitadas</span></div><div class="metric"><strong>${analyzedFiles}</strong><span>Fuentes TypeScript analizadas</span></div></section>
<section aria-labelledby="findings-heading"><div class="section-head"><h2 id="findings-heading">Hallazgos</h2><span id="visible-count" class="count" role="status" aria-live="polite">${total} de ${total}</span></div>
<div class="toolbar" id="toolbar" hidden><div class="filters" role="group" aria-label="Filtrar por severidad"><button type="button" data-filter="all" aria-pressed="true">Todos</button><button type="button" data-filter="error" aria-pressed="false">Errores</button><button type="button" data-filter="warning" aria-pressed="false">Advertencias</button></div><label class="search"><span>Buscar por archivo, regla o mensaje</span><input id="search" type="search" placeholder="Ej. user.service.spec.ts"></label></div>
${cards}
<p id="empty" class="empty"${total ? ' hidden' : ''}>${total ? 'No hay hallazgos que coincidan con los filtros.' : 'No se detectaron incumplimientos con las reglas habilitadas. Revisa el alcance del análisis.'}</p>
<noscript><p class="footnote">Todos los hallazgos están visibles. Habilita JavaScript para utilizar los filtros.</p></noscript></section>
${report.notices.length ? `<aside class="notices"><h2>Notas sobre el alcance</h2><ul>${report.notices.map((notice) => `<li>${escapeHtml(notice)}</li>`).join('')}</ul></aside>` : ''}
<footer><span>Standards Auditor · Reporte HTML independiente</span><span>El conteo de fuentes no incluye las comprobaciones de existencia de documentos.</span></footer>
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
</script>
</body></html>`;
}
