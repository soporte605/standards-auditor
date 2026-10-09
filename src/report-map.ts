import type { Report } from './engine.js';
import type { InventoryFile } from './inventory.js';
import { escapeHtml as e } from './html-utils.js';
import { icon, meter, pct } from './report-ui.js';
import { suggestTestPath } from './test-association.js';

const bucket = (lines: number | null): string =>
  lines === null ? '' : String(Math.min(4, Math.floor(lines / 20)));

function groupKey(path: string): string {
  return path.split('/').slice(0, -1).slice(0, 3).join('/') || '.';
}

export function renderMap(report: Report): string {
  const inv = report.inventory;
  if (!inv)
    return `<div class="card"><p class="empty">El inventario está desactivado (<code>inventory.enabled: false</code>). Actívalo para ver el mapa del proyecto.</p></div>`;
  const sources = inv.files.filter((f) => f.role === 'source');
  const groups = new Map<string, InventoryFile[]>();
  for (const file of sources) {
    const key = groupKey(file.path);
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  const hasCoverage = inv.coverage.status === 'available';
  const cells = (list: InventoryFile[]): string =>
    list
      .map((file) => {
        const has = file.tests.length ? '1' : '0';
        const suggestion = file.tests.length
          ? ''
          : (suggestTestPath(file.path, inv.testPatterns) ?? '');
        const c = bucket(file.coverage?.lines ?? null);
        return `<button type="button" class="cell" data-has="${has}"${c ? ` data-cov="${c}"` : ''} data-path="${e(file.path)}" data-tests="${e(file.tests.join('\n'))}" data-lines="${file.coverage?.lines ?? ''}" data-branches="${file.coverage?.branches ?? ''}" data-functions="${file.coverage?.functions ?? ''}" data-suggest="${e(suggestion)}" aria-expanded="false" aria-label="${e(file.path)}: ${has === '1' ? 'con prueba' : 'sin prueba'}" title="${e(file.path)}"></button>`;
      })
      .join('');
  const grid = sources.length
    ? `<div class="groups">${[...groups]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dir, list]) => {
          const missing = list.filter((f) => !f.tests.length).length;
          return `<section class="group"><div class="group-head"><span class="mono" title="${e(dir)}">${e(dir)}/</span><span>${list.length - missing}/${list.length}</span></div><div class="cells">${cells(list)}</div></section>`;
        })
        .join('')}</div>`
    : `<div class="card"><p class="empty">No hay fuentes en el alcance del inventario. Revisa <code>inventory.sources</code> y las exclusiones.</p></div>`;

  // Tree view (same data, hierarchical, with filters).
  interface Folder {
    folders: Map<string, Folder>;
    files: InventoryFile[];
  }
  const root: Folder = { folders: new Map(), files: [] };
  for (const file of inv.files) {
    let cur = root;
    for (const part of file.path.split('/').slice(0, -1)) {
      if (!cur.folders.has(part))
        cur.folders.set(part, { folders: new Map(), files: [] });
      cur = cur.folders.get(part)!;
    }
    cur.files.push(file);
  }
  const target = inv.coverage.minimumLines;
  const leaf = (file: InventoryFile): string => {
    const source = file.role === 'source';
    const lines = file.coverage?.lines ?? null;
    const below = source && lines !== null && target !== null && lines < target;
    const missing = source && !file.tests.length;
    const badge = source
      ? missing
        ? `<span class="pill" data-tone="crit">Sin prueba</span>`
        : `<span class="pill" data-tone="good">${file.tests.length} prueba${file.tests.length === 1 ? '' : 's'}</span>`
      : file.role === 'test'
        ? `<span class="pill" data-tone="accent">Prueba</span>`
        : `<span class="pill">Fuera del alcance</span>`;
    const cov =
      source && lines !== null
        ? `<span class="pill" data-tone="${below ? 'warn' : ''}">${lines}% líneas${below ? ' · Bajo objetivo' : ''}</span>`
        : '';
    return `<li class="tree-file" data-missing="${missing}" data-nocov="${source && lines === null}" data-below="${below}"><details><summary><code>${e(file.path.split('/').at(-1)!)}</code>${badge}${cov}</summary><div class="file-info"><code>${e(file.path)}</code>${file.tests.length ? `<p>Pruebas: ${file.tests.map((t) => `<code>${e(t)}</code>`).join(', ')}</p>` : source ? '<p>Ningún archivo coincide con las convenciones configuradas.</p>' : ''}${file.coverage ? `<p>Líneas ${pct(file.coverage.lines)} · Ramas ${pct(file.coverage.branches)} · Funciones ${pct(file.coverage.functions)} · Sentencias ${pct(file.coverage.statements)}</p>` : ''}</div></details></li>`;
  };
  const branch = (node: Folder): string =>
    `<ul>${[...node.folders].map(([name, child]) => `<li class="tree-folder"><details open><summary>${e(name)}</summary>${branch(child)}</details></li>`).join('')}${node.files.map(leaf).join('')}</ul>`;

  return `<h2 class="panel-title">Mapa del proyecto</h2><div class="toolbar">
<div class="seg" role="group" aria-label="Vista"><button type="button" data-view="grid" aria-pressed="true">Cuadrícula</button><button type="button" data-view="tree" aria-pressed="false">Árbol</button></div>
<label class="legend" data-for="grid">Colorear por <select id="map-mode"><option value="tests">Pruebas</option><option value="coverage"${hasCoverage ? '' : ' disabled'}>Cobertura${hasCoverage ? '' : ' (sin reporte)'}</option></select></label>
<span class="spacer"></span>
<span class="count legend" id="map-count">${sources.length} fuentes · ${inv.summary.withoutTests} sin prueba</span>
</div>
${inv.truncated ? `<p class="how">Mapa parcial: se muestran ${inv.files.length} de ${inv.totalFiles} archivos y los conteos corresponden a esa selección. Ajusta <code>inventory.max-files</code> o el alcance.</p>` : ''}
<div id="map-root" data-mode="tests">
<div id="view-grid">
<div class="legend" data-legend="tests" style="margin-bottom:12px"><span><i class="sw has"></i> Con prueba</span><span><i class="sw no"></i> Sin prueba</span><span>Cada celda es un archivo fuente; pulsa una para ver el detalle.</span></div>
<div class="legend" data-legend="coverage" style="margin-bottom:12px" hidden><span><i class="sw c0"></i> 0–19%</span><span><i class="sw c1"></i> 20–39%</span><span><i class="sw c2"></i> 40–59%</span><span><i class="sw c3"></i> 60–79%</span><span><i class="sw c4"></i> 80–100%</span><span><i class="sw oth"></i> Sin dato</span></div>
${grid}
<div class="detail" id="cell-detail" hidden><h3 class="mono" id="cell-path"></h3><dl id="cell-dl"></dl></div>
</div>
<div id="view-tree" hidden>
<div class="toolbar"><input id="tree-search" type="search" placeholder="Buscar por nombre o ruta" aria-label="Buscar en el árbol"><select id="tree-filter" aria-label="Filtrar el árbol"><option value="all">Todos los archivos</option><option value="missing">Sin prueba asociada</option><option value="nocov">Sin dato de líneas</option><option value="below">Bajo el objetivo de líneas</option></select><span id="tree-count" class="count legend" role="status" aria-live="polite">${inv.files.length} archivos</span></div>
<div class="tree" id="project-tree">${branch(root)}</div>
<p id="tree-empty" class="empty" hidden>No hay archivos que coincidan con los filtros.</p>
</div>
</div>
<details class="files" style="margin-top:18px"><summary>Convenciones y alcance</summary><p class="how">Informativo: asociar una prueba por nombre no confirma que se ejecute ni que cubra esa fuente. Archivos: <code>${e(inv.include.join(', '))}</code>. Fuentes: <code>${e(inv.sourcePatterns.join(', '))}</code>. Pruebas: <code>${e(inv.testPatterns.join(', '))}</code>. Se ajustan en <code>inventory</code> de auditor.yaml.</p></details>`;
}

const metrics = [
  ['lines', 'Líneas'],
  ['branches', 'Ramas'],
  ['functions', 'Funciones'],
  ['statements', 'Sentencias'],
] as const;

export function renderCoverage(report: Report): string {
  const inv = report.inventory;
  const evals = report.coverageEvaluations ?? [];
  const parts: string[] = [];
  if (!inv) {
    parts.push(
      `<div class="card"><p class="empty">El inventario está desactivado, así que no se importa cobertura para mostrarla.</p></div>`,
    );
  } else if (inv.coverage.total) {
    const total = inv.coverage.total;
    parts.push(
      `<div class="meters">${metrics
        .map(([key, label]) => {
          const value = total[key] ?? null;
          const below =
            key === 'lines' &&
            value !== null &&
            inv.coverage.minimumLines !== null &&
            value < inv.coverage.minimumLines;
          return `<div class="kpi" style="cursor:default"><div class="kpi-label"><span>${label}</span></div><div class="kpi-value">${value === null ? '—' : `${value}<small>%</small>`}</div>${meter(value ?? 0, value === null ? 'idle' : below ? 'warn' : 'accent', `${label}: ${value === null ? 'sin dato' : `${value}%`}`, key === 'lines' ? inv.coverage.minimumLines : null)}<div class="kpi-note">${below ? 'Bajo el objetivo' : value === null ? 'Sin dato' : ''}</div></div>`;
        })
        .join('')}</div>`,
    );
    parts.push(
      `<p class="row-sub" style="margin-top:10px">Total del reporte importado${inv.coverage.report ? ` (<code>${e(inv.coverage.report)}</code>)` : ''}${inv.coverage.modifiedAt ? `, modificado ${e(inv.coverage.modifiedAt)}` : ''}. Puede incluir archivos fuera del mapa y corresponder a una ejecución anterior; el auditor no ejecuta pruebas.</p>`,
    );
  } else {
    const statusText =
      inv.coverage.status === 'not-configured'
        ? 'Reporte de cobertura no configurado'
        : inv.coverage.status === 'missing'
          ? 'Reporte de cobertura no encontrado'
          : inv.coverage.status === 'invalid'
            ? 'Reporte de cobertura inválido o ilegible'
            : 'Reporte importado sin totales globales';
    parts.push(
      `<div class="card cov-empty" data-s="idle"><span class="status-icon">${icon('idle')}</span><div><h3>${statusText}</h3><p>${inv.coverage.status === 'available' ? 'Hay datos por archivo, pero no un total global.' : 'La ausencia de un reporte no equivale a 0 % de cobertura. Genera un reporte <code>json-summary</code> y conéctalo para ver las métricas.'}</p>${inv.coverage.status === 'available' ? '' : `<pre>// vitest.config.ts → test.coverage\nreporter: ['text', 'json-summary']\n\n# auditor.yaml\ninventory:\n  coverage:\n    report: coverage/coverage-summary.json\n    minimum-lines: 80</pre>`}</div></div>`,
    );
  }
  if (inv && inv.coverage.minimumLines === null)
    parts.push(
      `<p class="row-sub" style="margin-top:10px">Objetivo de cobertura de líneas no definido (<code>inventory.coverage.minimum-lines</code>).</p>`,
    );
  if (evals.length) {
    parts.push(
      `<h2 class="panel-title">Mínimos exigidos</h2><div class="card"><table class="table"><thead><tr><th>Métrica</th><th class="num">Actual</th><th class="num">Mínimo</th><th>Estado</th></tr></thead><tbody>${evals
        .map(
          (item) =>
            `<tr><td><b>${e(item.metric)}</b><div class="row-sub"><code>${e(item.ruleId)}</code></div></td><td class="num">${item.actual === null ? 'sin dato' : `${item.actual}%`}</td><td class="num">${item.minimum}%</td><td><span class="pill" data-tone="${item.status === 'pass' ? 'good' : item.status === 'fail' ? (item.severity === 'error' ? 'crit' : 'warn') : ''}">${item.status === 'pass' ? 'Cumple' : item.status === 'fail' ? 'Incumple' : 'No se pudo evaluar'}</span><details class="files"><summary>Evidencia</summary><p class="row-sub">${e(item.message)}<br><code>${e(item.evidence.report)}</code><br>SHA-256: <code>${e(item.evidence.sha256 ?? 'no disponible')}</code></p></details></td></tr>`,
        )
        .join('')}</tbody></table></div>`,
    );
  }
  const covered = (inv?.files ?? [])
    .filter((f) => f.role === 'source' && f.coverage?.lines != null)
    .sort((a, b) => (a.coverage!.lines ?? 0) - (b.coverage!.lines ?? 0))
    .slice(0, 10);
  if (covered.length)
    parts.push(
      `<h2 class="panel-title">Archivos con menos cobertura de líneas</h2><div class="card"><div class="bars">${covered
        .map(
          (f) =>
            `<div class="bar-row"><span class="mono" title="${e(f.path)}">${e(f.path)}</span><div class="bar-track" role="img" aria-label="${e(f.path)}: ${f.coverage!.lines}% de líneas"><div class="bar-fill" style="width:${f.coverage!.lines}%"></div></div><span class="bar-val">${f.coverage!.lines}%</span></div>`,
        )
        .join('')}</div></div>`,
    );
  return parts.join('\n');
}
