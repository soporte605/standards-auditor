import { escapeHtml as e } from './html-utils.js';

const paths = {
  ok: '<path d="M3.5 8.5l3 3 6-7"/>',
  fail: '<path d="M4 4l8 8M12 4l-8 8"/>',
  warn: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.8v3M8 11.6v.01"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.2v3.6M8 5.2v.01"/>',
  idle: '<circle cx="8" cy="8" r="5.5" stroke-dasharray="2.4 2.4"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/>',
  arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
} as const;
export type IconName = keyof typeof paths;

export function icon(name: IconName, className = 'icon'): string {
  return `<svg class="${className}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}

export function pct(value: number | null): string {
  return value === null ? 'Sin dato' : `${value}%`;
}

/** A single ratio against a limit: a meter, never a pie. */
export function meter(
  value: number,
  tone: 'good' | 'warn' | 'crit' | 'accent' | 'idle',
  label: string,
  marker: number | null = null,
): string {
  const width = Math.max(0, Math.min(100, value));
  return `<div class="meter" data-tone="${tone}" role="img" aria-label="${e(label)}"><span style="width:${width}%"></span>${marker === null ? '' : `<i class="meter-marker" style="left:${Math.max(0, Math.min(100, marker))}%" title="Objetivo ${marker}%"></i>`}</div>`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
