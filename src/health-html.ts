import type { Report } from './engine.js';
import { escapeHtml as e } from './html-utils.js';

export const healthCss = `
.health-head{display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-bottom:14px}
.health-score{font-size:34px;font-weight:700;line-height:1}
.health-score small{font-size:14px;font-weight:500;color:var(--muted)}
.health-bar{flex:1;min-width:160px;height:10px;border-radius:6px;background:var(--surface2);overflow:hidden}
.health-bar span{display:block;height:100%;background:var(--green)}
.health-bar.attention span{background:var(--red)}
.health-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.health-rule{border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:grid;gap:4px}
.health-rule[data-status="fail"]{border-color:#e8b9b0;background:var(--surface)af8}
.health-rule-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.health-icon{font-weight:700}
.health-rule[data-status="pass"] .health-icon{color:var(--green)}
.health-rule[data-status="fail"] .health-icon{color:var(--red)}
.health-rule[data-status="not-evaluated"] .health-icon{color:var(--amber)}
.health-rule p{margin:0;color:var(--muted);font-size:13px}
.health-rule .how{color:var(--ink)}
`;

const label = {
  pass: ['✔', 'Cumple'],
  fail: ['✖', 'No cumple'],
  'not-evaluated': ['◌', 'Sin evaluar'],
} as const;

export function healthSummary(report: Report): {
  passed: number;
  total: number;
} {
  return {
    passed: report.ruleResults.filter((item) => item.status === 'pass').length,
    total: report.ruleResults.length,
  };
}

const maxListed = 30;

function renderFindings(report: Report, ruleId: string, open: boolean): string {
  const items = report.findings.filter((item) => item.ruleId === ruleId);
  if (!items.length) return '';
  const rows = items
    .slice(0, maxListed)
    .map((item) => {
      const where = `${item.path}${item.line === undefined ? '' : `:${item.line}`}`;
      const fix = item.suggestion
        ? `<span class="fix">crear <code>${e(item.suggestion)}</code><button type="button" class="copy" data-copy="${e(item.suggestion)}" hidden>copiar</button></span>`
        : '';
      return `<li><code>${e(where)}</code>${fix}</li>`;
    })
    .join('');
  const more =
    items.length > maxListed
      ? `<p class="more">y ${items.length - maxListed} más; el detalle completo está en Hallazgos.</p>`
      : '';
  return `<details class="rule-findings"${open ? ' open' : ''}><summary>${items.length} ${items.length === 1 ? 'archivo' : 'archivos'}</summary><ul>${rows}</ul>${more}</details>`;
}

export function renderHealth(report: Report): string {
  if (!report.ruleResults.length) return '';
  const { passed, total } = healthSummary(report);
  const failing = report.ruleResults.some((item) => item.status === 'fail');
  const ordered = [...report.ruleResults].sort(
    (a, b) =>
      Number(b.status === 'fail') - Number(a.status === 'fail') ||
      Number(a.severity === 'warning') - Number(b.severity === 'warning'),
  );
  let opened = 0;
  const items = ordered
    .map((rule) => {
      const [icon, text] = label[rule.status];
      const open = rule.status === 'fail' && opened++ < 2;
      return `<li class="health-rule" data-status="${rule.status}"><div class="health-rule-top"><span class="health-icon" aria-hidden="true">${icon}</span><strong>${e(rule.description)}</strong><span class="badge ${rule.severity}">${rule.severity === 'error' ? 'Error' : 'Advertencia'}</span><span class="badge ${rule.status === 'pass' ? 'positive' : 'neutral'}">${text}${rule.findings ? ` · ${rule.findings}` : ''}</span></div><p class="rule-id"><code>${e(rule.ruleId)}</code></p>${rule.guidance && rule.status !== 'pass' ? `<p class="how"><strong>Cómo cumplirla:</strong> ${e(rule.guidance)}</p>` : ''}${renderFindings(report, rule.ruleId, open)}</li>`;
    })
    .join('');
  return `<section class="panel" aria-label="Salud del proyecto"><div class="section-head"><h2>Salud del proyecto</h2><span class="caption">Según las reglas definidas por tu equipo</span></div><div class="health-head"><div class="health-score">${passed}<small> / ${total} reglas cumplidas</small></div><div class="health-bar${failing ? ' attention' : ''}" role="img" aria-label="${passed} de ${total} reglas cumplidas"><span style="width:${total ? (passed / total) * 100 : 0}%"></span></div></div><ul class="health-list">${items}</ul></section>`;
}
