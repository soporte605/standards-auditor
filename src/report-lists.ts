import type { Report } from './engine.js';
import { escapeHtml as e } from './html-utils.js';
import { icon } from './report-ui.js';

const limit = 1000;

export function renderFindings(report: Report): string {
  const all = report.findings;
  const errors = all.filter((f) => f.severity === 'error').length;
  const rules = [...new Set(all.map((f) => f.ruleId))].sort();
  const shown = all.slice(0, limit);
  const rows = shown
    .map((f) => {
      const where = `${f.path}${f.line === undefined ? '' : `:${f.line}${f.column === undefined ? '' : `:${f.column}`}`}`;
      const err = f.severity === 'error';
      const fix = f.suggestion
        ? `<div class="fix">crear <code>${e(f.suggestion)}</code><button type="button" class="copy" data-copy="${e(f.suggestion)}" hidden>${icon('copy')}copiar</button></div>`
        : '';
      return `<div class="finding" data-severity="${f.severity}" data-rule="${e(f.ruleId)}" data-s="${err ? 'fail' : 'warn'}"><span class="status-icon">${icon(err ? 'fail' : 'warn')}</span><div class="finding-main"><code>${e(where)}</code><div class="finding-msg">${e(f.suggestion ? 'Falta una prueba asociada.' : f.message)}</div>${fix}</div><div class="finding-aside"><span class="pill" data-tone="${err ? 'crit' : 'warn'}">${e(f.ruleId)}</span></div></div>`;
    })
    .join('');
  if (!all.length)
    return `<div class="card"><p class="empty">${report.summary.evaluatedRules ? 'No se detectaron incumplimientos con las reglas habilitadas. Revisa el alcance del análisis en Notas.' : 'Sin reglas habilitadas; no se evaluaron estándares.'}</p></div>`;
  return `<div class="toolbar" id="findings-toolbar" hidden>
<div class="seg" role="group" aria-label="Filtrar por severidad"><button type="button" data-sev="all" aria-pressed="true">Todos ${all.length}</button><button type="button" data-sev="error" aria-pressed="false">Errores ${errors}</button><button type="button" data-sev="warning" aria-pressed="false">Avisos ${all.length - errors}</button></div>
<select id="finding-rule" aria-label="Filtrar por regla"><option value="">Todas las reglas</option>${rules.map((r) => `<option value="${e(r)}">${e(r)}</option>`).join('')}</select>
<input id="finding-search" type="search" placeholder="Buscar archivo, regla o mensaje" aria-label="Buscar hallazgos">
<span id="visible-count" class="count legend" role="status" aria-live="polite">${all.length} de ${all.length}</span></div>
<div class="card" id="findings-list">${rows}</div>
${all.length > limit ? `<p class="how">Se muestran los primeros ${limit} de ${all.length}. El listado completo está en <code>check --format json</code>.</p>` : ''}
<p id="empty" class="empty" hidden>No hay hallazgos que coincidan con los filtros.</p>
<noscript><p class="row-sub">Los filtros requieren JavaScript; el listado es completo sin él.</p></noscript>`;
}

export function renderNotes(report: Report): string {
  const notes = report.notices.filter((n) => !n.startsWith('Guía '));
  const guides = report.guides ?? [];
  const parts: string[] = [];
  if (notes.length)
    parts.push(
      `<h2 class="panel-title">Alcance y análisis</h2><ul class="card notes">${notes.map((n) => `<li class="note" data-s="idle"><span class="status-icon">${icon('info')}</span><div>${e(n)}</div></li>`).join('')}</ul>`,
    );
  if (guides.length)
    parts.push(
      `<h2 class="panel-title">Guías del equipo (${guides.length})</h2><div class="card"><table class="table"><thead><tr><th>Guía</th><th>Ámbito</th><th>Estado</th></tr></thead><tbody>${guides
        .map(
          (g) =>
            `<tr><td><b>${e(g.id)}</b><div class="row-sub"><code>${e(g.path)}</code></div></td><td><code>${e(g.include.join(', '))}</code></td><td><span class="pill" data-tone="${g.modified ? 'warn' : 'good'}">${g.modified ? 'Modificada' : 'Original'}</span><div class="row-sub"><code>${e(g.sha256.slice(0, 12))}</code></div></td></tr>`,
        )
        .join(
          '',
        )}</tbody></table></div><p class="row-sub" style="margin-top:8px">Las guías son instrucciones para revisión; no se evalúan automáticamente.</p>`,
    );
  if (!parts.length)
    return `<div class="card"><p class="empty">Sin notas: el análisis no tiene observaciones de alcance.</p></div>`;
  return parts.join('\n');
}
