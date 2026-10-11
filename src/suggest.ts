import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { isSeq, parseDocument } from 'yaml';
import { buildConfig, readYaml } from './config.js';
import type { Detection } from './detect.js';
import { detectProject } from './detect.js';
import { audit } from './engine.js';
import { associateSources } from './test-association.js';

interface CatalogEntry {
  pack: string;
  title: string;
  optional: boolean;
  applies: (detection: Detection | null) => boolean;
  reason: string;
}

const catalog: CatalogEntry[] = [
  {
    pack: 'typescript-tests',
    title: 'Calidad de las pruebas: sin any ni @ts-ignore en los specs',
    optional: false,
    applies: (d) => d?.typescript === true,
    reason: 'TypeScript detectado',
  },
  {
    pack: 'testing',
    title: 'Hay pruebas unitarias y cada fuente tiene la suya',
    optional: false,
    applies: (d) => d?.typescript === true,
    reason: 'TypeScript detectado',
  },
  {
    pack: 'angular',
    title: 'Pruebas de Angular: un spec por artefacto, sin fit ni .only',
    optional: false,
    applies: (d) => d?.framework === 'Angular',
    reason: 'Angular detectado',
  },
  {
    pack: 'docs',
    title: 'Existe un README que explique cómo usar el proyecto',
    optional: true,
    applies: () => true,
    reason: 'Útil en cualquier proyecto',
  },
];

/** Packs worth activating for a project, in the order they should appear. */
export function recommendedPacks(detection: Detection | null): string[] {
  return catalog
    .filter((entry) => !entry.optional && entry.applies(detection))
    .map((entry) => entry.pack);
}

/** Rules made redundant by another active pack (switched off by init and suggest --write). */
export function redundantRules(packs: string[]): string[] {
  return packs.includes('angular') && packs.includes('testing')
    ? ['testing.source-has-test']
    : [];
}

export interface Adjustment {
  rule: string;
  yaml: string;
  reason: string;
}
export interface PackSuggestion {
  pack: string;
  title: string;
  state: 'active' | 'recommended' | 'optional' | 'not-applicable';
  reason: string;
  errors: number;
  warnings: number;
  rules: number;
  adjustments: Adjustment[];
}
export interface Suggestion {
  detection: Detection | null;
  monorepo: boolean;
  configFile: string | null;
  packs: PackSuggestion[];
  missing: string[];
  notes: string[];
}

const exists = (file: string): Promise<boolean> =>
  stat(file).then(
    () => true,
    () => false,
  );

async function isMonorepo(root: string): Promise<boolean> {
  for (const marker of [
    'nx.json',
    'pnpm-workspace.yaml',
    'lerna.json',
    'turbo.json',
  ])
    if (await exists(path.join(root, marker))) return true;
  try {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    );
    if (manifest && typeof manifest === 'object' && 'workspaces' in manifest)
      return true;
  } catch {
    // Without a root manifest, several nested packages still mean a multi-package repo.
  }
  const nested = await glob(['*/package.json', '*/*/package.json'], {
    cwd: root,
    ignore: ['**/node_modules/**'],
    follow: false,
    posix: true,
  });
  return nested.length >= 2;
}

export async function suggest(configFile: string): Promise<Suggestion> {
  const file = path.resolve(configFile);
  const root = path.dirname(file);
  const hasConfig = await exists(file);
  const raw: Record<string, unknown> = hasConfig
    ? ((await readYaml(file)) as Record<string, unknown>)
    : {};
  const active = new Set(
    (Array.isArray(raw.packs) ? raw.packs : [])
      .filter((item): item is string => typeof item === 'string')
      .filter((item) => item.startsWith('builtin:'))
      .map((item) => item.slice('builtin:'.length)),
  );
  const detection = await detectProject(root);
  const monorepo = await isMonorepo(root);
  const notes: string[] = [];
  const packs: PackSuggestion[] = [];
  for (const entry of catalog) {
    const applies = entry.applies(detection);
    const config = await buildConfig(root, {
      'schema-version': 1,
      packs: [`builtin:${entry.pack}`],
      exclude: raw.exclude ?? [],
      inventory: raw.inventory ?? {},
    });
    const report = await audit(config);
    const adjustments: Adjustment[] = [];
    for (const rule of config.rules) {
      if (rule.detector !== 'source-has-test') continue;
      const result = report.ruleResults.find((r) => r.ruleId === rule.id);
      if (result?.status !== 'fail') continue;
      const sources = await associateSources(config, rule);
      const covered = [...sources.values()].filter((t) => t.length).length;
      const percent = sources.size ? (covered / sources.size) * 100 : 0;
      adjustments.push({
        rule: rule.id,
        yaml: `${rule.id}:\n  minimum: ${Math.floor(percent)}`,
        reason: `${covered} de ${sources.size} fuentes (${Math.round(percent)}%) tienen prueba; con ese mínimo el CI pasa hoy y puedes subirlo poco a poco`,
      });
    }
    packs.push({
      pack: `builtin:${entry.pack}`,
      title: entry.title,
      state: active.has(entry.pack)
        ? 'active'
        : !applies
          ? 'not-applicable'
          : entry.optional
            ? 'optional'
            : 'recommended',
      reason: applies ? entry.reason : 'No aplica a este proyecto',
      errors: report.summary.errors,
      warnings: report.summary.warnings,
      rules: config.rules.length,
      adjustments,
    });
  }
  const states = new Map(packs.map((p) => [p.pack, p.state]));
  const covers = (name: string): boolean =>
    ['active', 'recommended'].includes(states.get(name) ?? '');
  if (covers('builtin:angular') && covers('builtin:testing')) {
    // angular.artifacts-have-tests replaces the generic per-source rule.
    for (const p of packs)
      p.adjustments = p.adjustments.filter(
        (a) => a.rule !== 'testing.source-has-test',
      );
    notes.push(
      'Con Angular, testing.source-has-test duplica a angular.artifacts-have-tests: `suggest --write` lo desactiva.',
    );
  }
  if (monorepo && packs.some((p) => p.adjustments.length))
    notes.push(
      'Parece un monorepo: acota `sources` de la regla a tu app (por ejemplo apps/web/**/*.service.ts) para no medir otros paquetes.',
    );
  if (!detection)
    notes.push(
      'No hay package.json aquí: no se pudo detectar el lenguaje ni el framework.',
    );
  if (!hasConfig)
    notes.push(
      'No hay auditor.yaml: `init` lo crea y `suggest --write` lo completa.',
    );
  return {
    detection,
    monorepo,
    configFile: hasConfig ? file : null,
    packs,
    missing: packs.filter((p) => p.state === 'recommended').map((p) => p.pack),
    notes,
  };
}

/** Adds the recommended packs to auditor.yaml, keeping its comments. */
export async function applySuggestion(
  result: Suggestion,
): Promise<{ added: string[]; disabled: string[] }> {
  if (!result.configFile)
    throw new Error(
      'No hay auditor.yaml. Ejecuta primero standards-auditor init.',
    );
  const document = parseDocument(await readFile(result.configFile, 'utf8'));
  let packs = document.get('packs', true);
  if (!isSeq(packs)) throw new Error('auditor.yaml no tiene una lista packs.');
  const present = new Set(packs.items.map((item) => String(item)));
  const added: string[] = [];
  for (const pack of result.missing)
    if (!present.has(pack)) {
      packs.add(document.createNode(pack));
      present.add(pack);
      added.push(pack);
    }
  packs = document.get('packs', true);
  const disabled: string[] = [];
  const names = [...present].map((pack) => pack.replace(/^builtin:/, ''));
  for (const rule of redundantRules(names))
    if (document.getIn(['rules', rule]) === undefined) {
      document.setIn(['rules', rule], 'off');
      disabled.push(rule);
    }
  if (added.length || disabled.length)
    await writeFile(result.configFile, document.toString(), 'utf8');
  return { added, disabled };
}

const label: Record<PackSuggestion['state'], string> = {
  active: '✔ activo',
  recommended: '+ recomendado',
  optional: '· opcional',
  'not-applicable': '– no aplica',
};

export function renderSuggestion(result: Suggestion, project: string): string {
  const lines = [`Standards Auditor · suggest · ${project}`];
  const d = result.detection;
  lines.push(
    d
      ? `Proyecto detectado: ${['TypeScript', d.framework, d.runner].filter((x) => x && (x !== 'TypeScript' || d.typescript)).join(' · ') || 'sin TypeScript'}${result.monorepo ? ' · monorepo' : ''}`
      : 'Proyecto detectado: sin package.json',
    '',
    'Packs incorporados (qué encontrarían hoy en tu proyecto):',
  );
  for (const pack of result.packs)
    lines.push(
      `  ${label[pack.state].padEnd(14)} ${pack.pack.padEnd(26)} ${pack.errors} ${pack.errors === 1 ? 'error' : 'errores'} · ${pack.warnings} ${pack.warnings === 1 ? 'aviso' : 'avisos'}\n  ${' '.repeat(14)} ${pack.title}`,
    );
  const adjustments = result.packs.flatMap((p) => p.adjustments);
  if (adjustments.length) {
    lines.push(
      '',
      'Adopción gradual (ajustes sugeridos para auditor.yaml):',
      '  rules:',
    );
    for (const item of adjustments)
      lines.push(
        ...item.yaml.split('\n').map((line) => `    ${line}`),
        `    # ${item.reason}`,
      );
  }
  for (const note of result.notes) lines.push('', `Nota: ${note}`);
  lines.push(
    '',
    result.missing.length
      ? `Para activar lo recomendado: standards-auditor suggest --write (${result.missing.join(', ')})`
      : 'No hay packs recomendados pendientes de activar.',
  );
  return lines.join('\n');
}
