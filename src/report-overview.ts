import type { Report, RuleResult } from './engine.js';
import { escapeHtml as e } from './html-utils.js';
import { groupByFolder, groupThreshold } from './grouping.js';
import { icon, meter, plural } from './report-ui.js';

export type Tone = 'good' | 'warn' | 'crit';

export function verdict(report: Report): { tone: Tone; title: string } {
  const { errors, warnings, evaluatedRules } = report.summary;
  if (report.summary.requiredIncomplete)
    return { tone: 'warn', title: 'Análisis incompleto' };
  if (errors) return { tone: 'crit', title: 'Requiere atención' };
  if (warnings) return { tone: 'warn', title: 'Con advertencias' };
  if (!evaluatedRules) return { tone: 'warn', title: 'Sin reglas habilitadas' };
  if (report.notices.length) return { tone: 'warn', title: 'Revisar alcance' };
  return { tone: 'good', title: 'Sin incumplimientos detectados' };
}

const order = (a: RuleResult, b: RuleResult): number =>
  Number(b.status === 'fail') - Number(a.status === 'fail') ||
  Number(a.severity === 'warning') - Number(b.severity === 'warning') ||
  b.findings - a.findings;

function folderBars(report: Report): string {
  const inventory = report.inventory;
  if (!inventory) return '';
  const folders = new Map<string, { missing: number; total: number }>();
  for (const file of inventory.files) {
    if (file.role !== 'source') continue;
    const dir = file.path.split('/').slice(0, -1).slice(0, 3).join('/') || '.';
    const entry = folders.get(dir) ?? { missing: 0, total: 0 };
    entry.total++;
    if (!file.tests.length) entry.missing++;
    folders.set(dir, entry);
  }
  const ranked = [...folders]
    .filter(([, entry]) => entry.missing)
    .sort((a, b) => b[1].missing - a[1].missing || a[0].localeCompare(b[0]))
    .slice(0, 8);
  if (!ranked.length) return '';
  const max = ranked[0]![1].missing;
  return `<h2 class="panel-title">Carpetas con más pruebas pendientes</h2><div class="card"><div class="bars">${ranked
    .map(
      ([dir, entry]) =>
        `<div class="bar-row"><span class="mono" title="${e(dir)}">${e(dir)}/</span><div class="bar-track" role="img" aria-label="${e(dir)}: ${entry.missing} de ${entry.total} sin prueba"><div class="bar-fill" style="width:${(entry.missing / max) * 100}%"></div></div><span class="bar-val">${entry.missing}<span class="row-sub"> de ${entry.total}</span></span></div>`,
    )
    .join('')}</div></div>`;
}

export function renderSummary(report: Report): string {
  const { errors, warnings, evaluatedRules, analyzedFiles } = report.summary;
  const v = verdict(report);
  const icons = { good: 'ok', warn: 'warn', crit: 'fail' } as const;
  const results = report.ruleResults;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failingError = results.some(
    (r) => r.status === 'fail' && r.severity === 'error',
  );
  const failingAny = results.some((r) => r.status === 'fail');
  const rulesTone = failingError ? 'crit' : failingAny ? 'warn' : 'good';
  const inv = report.inventory;
  const withTests = inv?.summary.withTests ?? 0;
  const sources = inv?.summary.sources ?? 0;
  const testPct = sources ? Math.round((withTests / sources) * 100) : 0;
  const lines = inv?.coverage.total?.lines ?? null;
  const coverageNote =
    inv === undefined
      ? 'Inventario desactivado'
      : inv.coverage.status === 'not-configured'
        ? 'Reporte no configurado'
        : inv.coverage.status === 'missing'
          ? 'Reporte no encontrado'
          : inv.coverage.status === 'invalid'
            ? 'Reporte ilegible'
            : lines === null
              ? 'Sin total de líneas'
              : inv.coverage.minimumLines === null
                ? 'Total del reporte importado'
                : `Objetivo ${inv.coverage.minimumLines}%`;
  const kpi = (
    go: string,
    label: string,
    value: string,
    note: string,
    bar: string,
    tone = '',
  ): string =>
    `<button type="button" class="kpi" data-go="${go}"><div class="kpi-label"><span>${label}</span>${icon('arrow')}</div><div class="kpi-value"${tone ? ` data-tone="${tone}"` : ''}>${value}</div>${bar}<div class="kpi-note">${note}</div></button>`;
  const attention = [...results]
    .filter((r) => r.status !== 'pass')
    .sort(order)
    .slice(0, 5);
  const start = attention.length
    ? attention
        .map((rule) => {
          const state =
            rule.status === 'fail'
              ? rule.severity === 'error'
                ? 'fail'
                : 'warn'
              : 'idle';
          return `<div class="row" data-s="${state}"><span class="status-icon">${icon(rule.status === 'fail' ? (rule.severity === 'error' ? 'fail' : 'warn') : 'idle')}</span><div class="row-main"><div class="row-title">${e(rule.description)}</div><div class="row-sub"><code>${e(rule.ruleId)}</code>${rule.status === 'fail' ? ` · ${plural(rule.findings, 'archivo', 'archivos')}` : ' · sin evaluar'}</div></div><button type="button" class="go" data-go="reglas" data-rule="${e(rule.ruleId)}">Ver ${icon('arrow')}</button></div>`;
        })
        .join('')
    : `<div class="row" data-s="pass"><span class="status-icon">${icon('ok')}</span><div class="row-main"><div class="row-title">${evaluatedRules ? 'Todo en orden' : 'No hay reglas habilitadas'}</div><div class="row-sub">${evaluatedRules ? 'Todas las reglas habilitadas se cumplen.' : 'Activa un pack en auditor.yaml para empezar a evaluar.'}</div></div></div>`;
  return `<div class="verdict" data-tone="${v.tone}">${icon(icons[v.tone])}<div><h2>${v.title}</h2><p>${evaluatedRules} reglas habilitadas · ${analyzedFiles} archivos revisados por detectores TypeScript</p></div></div>
<div class="kpis">
${kpi('reglas', 'Reglas cumplidas', `${passed}<small>/ ${results.length}</small>`, results.length - passed ? `${plural(results.length - passed, 'regla requiere', 'reglas requieren')} atención` : 'Todas se cumplen', meter(results.length ? (passed / results.length) * 100 : 0, rulesTone, `${passed} de ${results.length} reglas cumplidas`), rulesTone === 'good' ? 'good' : rulesTone === 'crit' ? 'crit' : '')}
${kpi('mapa', 'Fuentes con prueba', sources ? `${testPct}<small>%</small>` : '—', inv ? (sources ? `${withTests} de ${sources} · ${inv.summary.withoutTests} sin prueba asociada` : 'Sin fuentes en el alcance') : 'Inventario desactivado', meter(testPct, sources ? 'accent' : 'idle', `${withTests} de ${sources} fuentes con prueba asociada`))}
${kpi('cobertura', 'Cobertura de líneas', lines === null ? '—' : `${lines}<small>%</small>`, coverageNote, meter(lines ?? 0, lines === null ? 'idle' : 'accent', lines === null ? 'Sin dato de cobertura' : `Líneas: ${lines}%`, inv?.coverage.minimumLines ?? null))}
${kpi('hallazgos', 'Hallazgos', `${errors}<small>${errors === 1 ? 'error' : 'errores'}</small>`, `${plural(warnings, 'aviso', 'avisos')}${warnings ? ` en ${plural(new Set(report.findings.filter((f) => f.severity === 'warning').map((f) => f.ruleId)).size, 'regla', 'reglas')}` : ''} · ${plural(report.notices.length, 'nota', 'notas')}`, '', errors ? 'crit' : errors === 0 && warnings === 0 ? 'good' : '')}
</div>
<h2 class="panel-title">Por dónde empezar</h2><div class="card">${start}</div>
${folderBars(report)}`;
}

function filesList(report: Report, ruleId: string, open: boolean): string {
  const items = report.findings.filter((item) => item.ruleId === ruleId);
  if (!items.length) return '';
  const row = (item: (typeof items)[number]): string => {
    const where =
      item.path === '.'
        ? 'Todo el proyecto'
        : `${item.path}${item.line === undefined ? '' : `:${item.line}`}`;
    const fix = item.suggestion
      ? `<span class="fix">crear <code>${e(item.suggestion)}</code><button type="button" class="copy" data-copy="${e(item.suggestion)}" hidden>${icon('copy')}copiar</button></span>`
      : '';
    return `<li><code>${e(where)}</code>${fix}</li>`;
  };
  if (items.length <= groupThreshold)
    return `<details class="files"${open ? ' open' : ''}><summary>${plural(items.length, 'archivo', 'archivos')}</summary><ul>${items.map(row).join('')}</ul></details>`;
  const byFile = new Map(items.map((item) => [item.path, item]));
  const groups = groupByFolder(items.map((item) => item.path));
  return `<details class="files"${open ? ' open' : ''}><summary>${plural(items.length, 'archivo', 'archivos')} en ${plural(groups.length, 'carpeta', 'carpetas')}</summary><div class="folders">${groups
    .map(
      (group, index) =>
        `<details class="folder"${open && index === 0 && group.files.length <= 10 ? ' open' : ''}><summary><code>${e(group.dir)}/</code><span class="pill">${group.files.length}</span></summary><ul>${group.files.map((file) => row(byFile.get(file)!)).join('')}</ul></details>`,
    )
    .join('')}</div></details>`;
}

function statsLine(rule: RuleResult): string {
  const stats = rule.stats;
  if (!stats) return '';
  const meets = stats.percent >= stats.minimum;
  return `<div class="rule-stats">${meter(stats.percent, meets ? 'good' : rule.severity === 'error' ? 'crit' : 'warn', `${stats.covered} de ${stats.total} fuentes con prueba`, stats.minimum)}<span>${stats.covered} de ${stats.total} con prueba (${stats.percent}%) · mínimo ${stats.minimum}%</span></div>`;
}

function ruleBlock(report: Report, rule: RuleResult, open: boolean): string {
  const state =
    rule.status === 'pass'
      ? 'pass'
      : rule.status === 'fail'
        ? rule.severity === 'error'
          ? 'fail'
          : 'warn'
        : 'idle';
  const glyph = {
    pass: 'ok',
    fail: 'fail',
    warn: 'warn',
    idle: 'idle',
  } as const;
  const label =
    rule.status === 'pass'
      ? 'Cumple'
      : rule.status === 'fail'
        ? 'No cumple'
        : 'Sin evaluar';
  return `<div class="rule" id="rule-${e(rule.ruleId)}" data-rule="${e(rule.ruleId)}"><div class="rule-head" data-s="${state}"><span class="status-icon">${icon(glyph[state])}</span><div class="row-main"><div class="rule-title">${e(rule.description)}</div><div class="rule-id"><code>${e(rule.ruleId)}</code></div></div><div class="rule-meta"><span class="pill" data-tone="${rule.severity === 'error' ? 'crit' : 'warn'}">${rule.severity === 'error' ? 'Error' : 'Advertencia'}</span><span class="pill" data-tone="${rule.status === 'pass' ? 'good' : ''}">${label}${rule.findings ? ` · ${rule.findings}` : ''}</span></div></div>${statsLine(rule)}${rule.guidance && rule.status !== 'pass' ? `<p class="how"><b>Cómo cumplirla:</b> ${e(rule.guidance)}</p>` : ''}${filesList(report, rule.ruleId, open)}</div>`;
}

export function renderRules(report: Report): string {
  const results = report.ruleResults;
  if (!results.length)
    return `<div class="card"><p class="empty">No hay reglas habilitadas. Activa un pack en <code>auditor.yaml</code> para empezar a evaluar.</p></div>`;
  const attention = [...results].filter((r) => r.status !== 'pass').sort(order);
  const passing = results.filter((r) => r.status === 'pass');
  let opened = 0;
  return `${
    attention.length
      ? `<h2 class="panel-title">Requieren atención (${attention.length})</h2><div class="card">${attention.map((rule) => ruleBlock(report, rule, rule.status === 'fail' && opened++ < 2)).join('')}</div>`
      : `<div class="card"><p class="empty">Todas las reglas habilitadas se cumplen.</p></div>`
  }${
    passing.length
      ? `<details class="passed"><summary>${icon('ok')} Reglas que cumplen (${passing.length})</summary><div class="card">${passing.map((rule) => ruleBlock(report, rule, false)).join('')}</div></details>`
      : ''
  }`;
}
