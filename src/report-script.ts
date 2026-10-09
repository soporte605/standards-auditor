/** One inline script; audit data only reaches it through escaped data-* attributes. */
export const reportScript = `
document.documentElement.classList.add('js');
const tabs = Array.from(document.querySelectorAll('[role=tab]'));
const panels = Array.from(document.querySelectorAll('[role=tabpanel]'));
function show(id) {
  if (!panels.some(function (p) { return p.id === 'panel-' + id; })) id = 'resumen';
  for (const t of tabs) {
    const on = t.dataset.tab === id;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  }
  for (const p of panels) p.hidden = p.id !== 'panel-' + id;
  return id;
}
function go(id, rule) {
  id = show(id);
  history.replaceState(null, '', '#' + id);
  if (rule) {
    const block = document.getElementById('rule-' + rule);
    if (block) {
      const passed = block.closest('details.passed');
      if (passed) passed.open = true;
      const files = block.querySelector('details.files');
      if (files) files.open = true;
      block.scrollIntoView({ block: 'center' });
      return;
    }
  }
  const bar = document.querySelector('.tabs');
  if (bar) window.scrollTo({ top: Math.max(0, bar.offsetTop - 8) });
}
for (const t of tabs) {
  t.addEventListener('click', function () { go(t.dataset.tab); });
  t.addEventListener('keydown', function (ev) {
    const i = tabs.indexOf(t);
    const next = ev.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : ev.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
    if (next) { ev.preventDefault(); next.focus(); go(next.dataset.tab); }
  });
}
for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', function () { go(b.dataset.go, b.dataset.rule); });
window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
show(location.hash.slice(1) || 'resumen');

for (const b of document.querySelectorAll('[data-copy]')) {
  b.hidden = false;
  b.addEventListener('click', function () {
    const text = b.dataset.copy;
    const label = b.lastChild;
    const done = function () { const old = label.textContent; label.textContent = 'copiado'; setTimeout(function () { label.textContent = old; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
    else {
      const area = document.createElement('textarea');
      area.value = text; document.body.appendChild(area); area.select();
      try { document.execCommand('copy'); } catch (error) {}
      area.remove(); done();
    }
  });
}

const toolbar = document.getElementById('findings-toolbar');
if (toolbar) {
  toolbar.hidden = false;
  const items = Array.from(document.querySelectorAll('.finding'));
  const buttons = Array.from(toolbar.querySelectorAll('[data-sev]'));
  const ruleSel = document.getElementById('finding-rule');
  const search = document.getElementById('finding-search');
  let severity = 'all';
  function filterFindings() {
    const q = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const item of items) {
      const ok = (severity === 'all' || item.dataset.severity === severity) && (!ruleSel.value || item.dataset.rule === ruleSel.value) && item.textContent.toLocaleLowerCase().includes(q);
      item.hidden = !ok;
      if (ok) visible++;
    }
    document.getElementById('visible-count').textContent = visible + ' de ' + items.length;
    document.getElementById('empty').hidden = visible !== 0;
  }
  for (const b of buttons) b.addEventListener('click', function () {
    severity = b.dataset.sev;
    for (const o of buttons) o.setAttribute('aria-pressed', String(o === b));
    filterFindings();
  });
  ruleSel.addEventListener('change', filterFindings);
  search.addEventListener('input', filterFindings);
}

const mapRoot = document.getElementById('map-root');
if (mapRoot) {
  const modeSel = document.getElementById('map-mode');
  const legends = Array.from(mapRoot.querySelectorAll('[data-legend]'));
  modeSel.addEventListener('change', function () {
    mapRoot.dataset.mode = modeSel.value;
    for (const l of legends) l.hidden = l.dataset.legend !== modeSel.value;
  });
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', function () {
    const grid = b.dataset.view === 'grid';
    document.getElementById('view-grid').hidden = !grid;
    document.getElementById('view-tree').hidden = grid;
    for (const o of document.querySelectorAll('[data-view]')) o.setAttribute('aria-pressed', String(o === b));
    for (const l of document.querySelectorAll('[data-for=grid]')) l.hidden = !grid;
  });
  const detail = document.getElementById('cell-detail');
  const dl = document.getElementById('cell-dl');
  let current = null;
  function row(term, value) {
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = value;
    dl.append(dt, dd);
  }
  for (const cell of mapRoot.querySelectorAll('.cell')) cell.addEventListener('click', function () {
    if (current) current.setAttribute('aria-expanded', 'false');
    current = cell; cell.setAttribute('aria-expanded', 'true');
    document.getElementById('cell-path').textContent = cell.dataset.path;
    dl.textContent = '';
    const tests = cell.dataset.tests ? cell.dataset.tests.split(String.fromCharCode(10)) : [];
    row('Prueba', tests.length ? tests.join(', ') : 'Sin prueba asociada');
    if (!tests.length && cell.dataset.suggest) row('Crear', cell.dataset.suggest);
    if (cell.dataset.lines) row('Cobertura', 'Líneas ' + cell.dataset.lines + '% · Ramas ' + cell.dataset.branches + '% · Funciones ' + cell.dataset.functions + '%');
    detail.hidden = false;
  });
  const search = document.getElementById('tree-search');
  const filter = document.getElementById('tree-filter');
  const files = Array.from(document.querySelectorAll('.tree-file'));
  const folders = Array.from(document.querySelectorAll('.tree-folder'));
  function filterTree() {
    const q = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const f of files) {
      const ok = (filter.value === 'all' || f.dataset[filter.value] === 'true') && f.textContent.toLocaleLowerCase().includes(q);
      f.hidden = !ok;
      if (ok) visible++;
    }
    for (const folder of folders) {
      folder.hidden = !Array.from(folder.querySelectorAll('.tree-file')).some(function (f) { return !f.hidden; });
      if (q || filter.value !== 'all') folder.querySelector('details').open = true;
    }
    document.getElementById('tree-count').textContent = visible + ' de ' + files.length + ' archivos';
    document.getElementById('tree-empty').hidden = visible !== 0;
  }
  search.addEventListener('input', filterTree);
  filter.addEventListener('change', filterTree);
}
let printState = [];
window.addEventListener('beforeprint', function () {
  printState = Array.from(document.querySelectorAll('details')).map(function (d) { return [d, d.open]; });
  for (const entry of printState) entry[0].open = true;
});
window.addEventListener('afterprint', function () {
  for (const entry of printState) entry[0].open = entry[1];
});
`;
