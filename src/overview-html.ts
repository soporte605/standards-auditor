import type { Inventory } from './inventory.js';
import { escapeHtml as e } from './html-utils.js';

export function renderOverview(inventory: Inventory): string {
  const { coverage, summary } = inventory;
  const metrics = [
    ['lines', 'Líneas'],
    ['branches', 'Ramas'],
    ['functions', 'Funciones'],
    ['statements', 'Sentencias'],
  ] as const;
  const gauges = metrics
    .map(([key, label]) => {
      const value = coverage.total?.[key] ?? null;
      const below =
        key === 'lines' &&
        value !== null &&
        coverage.minimumLines !== null &&
        value < coverage.minimumLines;
      const tone = value === null ? 'unknown' : below ? 'low' : 'measured';
      return `<div class="gauge ${tone}"><svg viewBox="0 0 90 90" role="img" aria-label="${label}: ${value === null ? 'sin datos' : `${value}%`}"><circle class="gauge-track" cx="45" cy="45" r="36"/><circle class="gauge-value" cx="45" cy="45" r="36" pathLength="100" stroke-dasharray="${value ?? 0} 100" transform="rotate(-90 45 45)"/><text x="45" y="49" text-anchor="middle">${value === null ? '—' : `${value}%`}</text></svg><span>${label}</span>${below ? '<small>Bajo objetivo</small>' : ''}</div>`;
    })
    .join('');
  const coverageStatus =
    coverage.status === 'not-configured'
      ? 'Reporte de cobertura no configurado'
      : coverage.status === 'missing'
        ? 'Reporte de cobertura no encontrado'
        : coverage.status === 'invalid'
          ? 'Reporte de cobertura inválido o ilegible'
          : 'Reporte de cobertura importado';
  const associationWidth = summary.sources
    ? (summary.withTests / summary.sources) * 100
    : 0;
  return `<section class="overview-grid" aria-label="Resumen visual">
  <div class="panel coverage-panel"><div class="section-head"><h2>Cobertura</h2><span class="caption">${coverage.total ? 'Total del reporte' : 'Sin métricas globales'}</span></div>
  ${coverage.total ? `<div class="gauges">${gauges}</div>` : `<div class="coverage-empty"><span aria-hidden="true">◌</span><div><strong>${coverageStatus}</strong><p>${coverage.status === 'available' ? 'Hay datos por archivo, sin un total global disponible.' : 'Conecta un reporte para visualizar las métricas.'}</p></div></div>`}
  <details class="scope coverage-context"><summary>Origen y objetivo${coverage.minimumLines === null ? '' : ` · ${coverage.minimumLines}% de líneas`}</summary><p>${coverageStatus}</p>${coverage.report ? `<p><code>${e(coverage.report)}</code></p>` : ''}<p>${coverage.minimumLines === null ? 'Objetivo de cobertura de líneas no definido.' : `Objetivo de líneas: ${coverage.minimumLines}% (solo referencia visual).`}</p><p>El total puede incluir archivos fuera del árbol. No es una calificación de calidad.</p><p>${coverage.status === 'available' ? `Última modificación: ${e(coverage.modifiedAt ?? 'desconocida')}. Puede corresponder a una ejecución anterior; no se ejecutaron pruebas.` : 'Sin reporte no se conoce la cobertura medida. Su ausencia no equivale a 0% ni indica que el runner carezca de configuración.'}</p></details></div>
  <div class="panel association-panel"><div class="section-head"><h2>Pruebas asociadas</h2><span class="caption">Inventario</span></div><div class="association-number"><strong>${summary.withTests}</strong><span>/ ${summary.sources} fuentes</span></div><div class="association-bar" role="img" aria-label="${summary.withTests} de ${summary.sources} fuentes con test asociado"><span style="width:${associationWidth}%"></span></div><p>${summary.sources ? `${summary.withoutTests} fuentes sin test asociado` : 'Sin fuentes en el alcance configurado'}</p><button type="button" class="text-action" data-jump="${summary.withoutTests ? 'missing-tests' : 'all'}" hidden>Explorar archivos <span aria-hidden="true">↗</span></button><p class="caption">Asociación por nombre; no confirma ejecución ni cobertura.</p></div>
  </section>`;
}
