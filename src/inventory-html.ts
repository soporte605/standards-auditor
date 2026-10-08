import type { Inventory, InventoryFile } from './inventory.js';
import { escapeHtml as e } from './html-utils.js';

interface Folder {
  folders: Map<string, Folder>;
  files: InventoryFile[];
}
function folder(): Folder {
  return { folders: new Map(), files: [] };
}
function percent(value: number | null): string {
  return value === null ? 'Sin dato' : `${value}%`;
}

export function renderInventory(inventory: Inventory): string {
  const root = folder();
  for (const file of inventory.files) {
    const parts = file.path.split('/');
    let current = root;
    for (const part of parts.slice(0, -1)) {
      if (!current.folders.has(part)) current.folders.set(part, folder());
      current = current.folders.get(part)!;
    }
    current.files.push(file);
  }
  const coverage = inventory.coverage;
  function leaf(file: InventoryFile): string {
    const source = file.role === 'source';
    const lines = file.coverage?.lines ?? null;
    const below =
      source &&
      lines !== null &&
      coverage.minimumLines !== null &&
      lines < coverage.minimumLines;
    const missingTests = source && !file.tests.length;
    const testLabel = source
      ? missingTests
        ? 'Sin test asociado'
        : `${file.tests.length} test(s) asociado(s)`
      : file.role === 'test'
        ? 'Archivo de pruebas asociado'
        : 'Fuera del alcance de tests';
    const coverageLabel = source
      ? lines === null
        ? 'Sin dato de líneas'
        : `${lines}% líneas${below ? ' · Bajo objetivo' : ''}`
      : '';
    return `<li class="tree-file" data-missing-tests="${missingTests}" data-no-coverage="${source && lines === null}" data-below="${below}"><details class="file-detail"><summary><span class="file-name">${e(file.path.split('/').at(-1)!)}</span><span class="tree-badges"><span class="badge ${missingTests ? 'warning' : source ? 'positive' : 'neutral'}">${testLabel}</span>${coverageLabel ? `<span class="badge ${below ? 'warning' : 'neutral'}">${coverageLabel}</span>` : ''}</span></summary><div class="file-info"><code>${e(file.path)}</code>
    ${
      source
        ? `<p>${missingTests ? 'Ningún archivo coincide con las convenciones configuradas. Puede haber pruebas con otra organización.' : 'Asociación por ruta y nombre; no confirma que las pruebas se ejecuten ni que cubran esta fuente.'}</p>${file.tests.length ? `<ul>${file.tests.map((test) => `<li><code>${e(test)}</code></li>`).join('')}</ul>` : ''}
    ${file.coverage ? `<p>Líneas: ${percent(file.coverage.lines)} · Ramas: ${percent(file.coverage.branches)} · Funciones: ${percent(file.coverage.functions)} · Sentencias: ${percent(file.coverage.statements)}</p>` : '<p>No hay métricas asociadas a este archivo en el reporte importado.</p>'}`
        : '<p>Este archivo no se evalúa como fuente que deba tener pruebas asociadas.</p>'
    }</div></details></li>`;
  }
  function branch(node: Folder): string {
    return `<ul>${[...node.folders].map(([name, child]) => `<li class="tree-folder"><details open><summary><span aria-hidden="true">▱</span> ${e(name)}</summary>${branch(child)}</details></li>`).join('')}${node.files.map(leaf).join('')}</ul>`;
  }
  return `<details class="disclosure inventory" id="inventory-details"><summary><span>Mapa del proyecto</span><span class="count">${inventory.files.length} archivos · ${inventory.summary.withoutTests} fuentes sin test asociado</span></summary><div class="disclosure-body">
  ${inventory.truncated ? `<p class="inventory-limit">Árbol parcial: se muestran ${inventory.files.length} de ${inventory.totalFiles} archivos. Los conteos corresponden a esta selección; ajusta inventory.max-files o el alcance.</p>` : ''}
  <div class="toolbar" id="tree-toolbar" hidden><label class="search"><span>Buscar en el árbol</span><input id="tree-search" type="search" placeholder="Nombre, ruta o prueba asociada"></label><label class="tree-select">Mostrar<select id="tree-filter"><option value="all">Todos los archivos</option><option value="missing-tests">Sin test asociado</option><option value="no-coverage">Sin dato de líneas</option><option value="below">Bajo objetivo de líneas</option></select></label><span id="tree-count" class="count" role="status" aria-live="polite">${inventory.files.length} archivos</span></div>
  <div class="project-tree" id="project-tree">${branch(root)}</div><p id="tree-empty" class="empty"${inventory.files.length ? ' hidden' : ''}>${inventory.files.length ? 'No hay archivos que coincidan con los filtros.' : 'Ningún archivo coincide con el alcance del inventario. Revisa inventory.include y las exclusiones.'}</p>
  <details class="scope"><summary>Convenciones y alcance</summary><p>Informativo: este inventario no bloquea CI. Asociar una prueba por nombre no confirma su ejecución ni su cobertura.</p><p>Archivos: <code>${e(inventory.include.join(', '))}</code></p><p>Fuentes: <code>${e(inventory.sourcePatterns.join(', '))}</code></p><p>Pruebas: <code>${e(inventory.testPatterns.join(', '))}</code></p><p>Modifica estas convenciones en auditor.yaml para adaptarlas a tu lenguaje y estructura.</p></details></div></details>`;
}

export const inventoryCss = `
.inventory{margin:12px 0}.inventory-limit{background:#fff1cb;padding:12px;border-radius:8px}.tree-select{font-size:12px;color:var(--muted)}select{display:block;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:14px system-ui;color:var(--ink);background:white;margin-top:5px;max-width:100%}.project-tree{border:1px solid var(--line);background:white;border-radius:12px;padding:14px;overflow-wrap:anywhere}.project-tree ul{list-style:none;margin:0;padding-left:18px;border-left:1px solid var(--line)}.project-tree>ul{padding-left:0;border:0}.project-tree summary{cursor:pointer;padding:9px 4px;font-size:13px}.tree-folder>details>summary{font-weight:700}.file-name{font-family:monospace}.tree-badges{display:inline-flex;gap:6px;flex-wrap:wrap;margin-left:12px}.file-info{padding:4px 14px 14px;color:var(--muted);font-size:12px}.file-info p{margin:8px 0}.scope{font-size:12px;color:var(--muted);margin-top:14px}.scope summary{cursor:pointer;font-weight:600}.scope code{overflow-wrap:anywhere}summary:focus-visible,select:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
@media(max-width:700px){.inventory .section-head{align-items:start;flex-direction:column}.inventory-summary>div{padding:12px}.tree-badges{display:flex;margin:7px 0 0 12px}.project-tree{padding:8px}.project-tree ul{padding-left:12px}.inventory .toolbar{gap:12px}}
`;

export const inventoryScript = `
const tree = document.getElementById('project-tree');
if (tree) {
  const treeFiles = Array.from(tree.querySelectorAll('.tree-file'));
  const folders = Array.from(tree.querySelectorAll('.tree-folder'));
  const treeSearch = document.getElementById('tree-search');
  const treeFilter = document.getElementById('tree-filter');
  function filterTree() {
    const query = treeSearch.value.trim().toLocaleLowerCase();
    const filter = treeFilter.value;
    let visible = 0;
    for (const file of treeFiles) {
      const status = filter === 'all' || file.getAttribute('data-' + filter) === 'true';
      file.hidden = !(status && file.textContent.toLocaleLowerCase().includes(query));
      if (!file.hidden) visible++;
    }
    for (const folder of folders) {
      folder.hidden = !Array.from(folder.querySelectorAll('.tree-file')).some(file => !file.hidden);
      if (query || filter !== 'all') folder.querySelector('details').open = true;
    }
    document.getElementById('tree-count').textContent = visible + ' de ' + treeFiles.length + ' archivos';
    document.getElementById('tree-empty').hidden = visible !== 0;
  }
  treeSearch.addEventListener('input', filterTree);
  treeFilter.addEventListener('change', filterTree);
  document.getElementById('tree-toolbar').hidden = false;
}
`;
