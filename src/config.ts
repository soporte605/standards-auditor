import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { z } from 'zod';

const strings = z.array(z.string().min(1)).min(1);
const relativePath = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !value.split(/[\\/]/).includes('..'),
    'Usa rutas relativas sin segmentos ..',
  );
const patterns = z.array(relativePath).min(1);
const metadata = {
  id: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/),
  severity: z.enum(['error', 'warning']),
  description: z.string().min(1),
  guidance: z.string().min(1).optional(),
};
const minimumSchema = z
  .strictObject({
    lines: z.number().min(0).max(100).optional(),
    branches: z.number().min(0).max(100).optional(),
    functions: z.number().min(0).max(100).optional(),
    statements: z.number().min(0).max(100).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Define al menos un mínimo',
  );
const ruleSchema = z.discriminatedUnion('detector', [
  z.strictObject({
    ...metadata,
    detector: z.literal('coverage-thresholds'),
    report: relativePath,
    minimum: minimumSchema,
  }),
  z.strictObject({
    ...metadata,
    detector: z.literal('required-files'),
    files: z.array(relativePath).min(1),
  }),
  z.strictObject({
    ...metadata,
    detector: z.literal('tests-exist'),
    include: patterns,
  }),
  z.strictObject({
    ...metadata,
    detector: z.literal('source-has-test'),
    minimum: z.number().min(0).max(100).default(100),
    sources: patterns.optional(),
    'source-exclude': z.array(relativePath).optional(),
  }),
  z.strictObject({
    ...metadata,
    detector: z.literal('forbidden-files'),
    include: patterns,
  }),
  z
    .strictObject({
      ...metadata,
      detector: z.literal('typescript-forbidden-api'),
      include: patterns,
      identifiers: strings.optional(),
      members: strings.optional(),
      modules: strings.optional(),
    })
    .refine(
      (value) => value.identifiers || value.members || value.modules,
      'Define al menos identifiers, members o modules',
    ),
  z.strictObject({
    ...metadata,
    detector: z.literal('typescript-no-any'),
    include: patterns,
  }),
  z.strictObject({
    ...metadata,
    detector: z.literal('typescript-no-suppression'),
    include: patterns,
  }),
]);
const packSchema = z.strictObject({
  'schema-version': z.literal(1),
  name: z.string().min(1),
  rules: z.array(ruleSchema).min(1),
});
const testPattern = relativePath.refine((value) => {
  const remaining = value.replace(/\{(?:dir|name|ext|path)\}/g, '');
  return !/\{[a-zA-Z]+\}/.test(remaining) && /\{(?:name|path)\}/.test(value);
}, 'Usa {name} o {path}; variables admitidas: {dir}, {name}, {ext}, {path}');
const inventorySchema = z.strictObject({
  enabled: z.boolean().default(true),
  include: patterns.default([
    '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
    'README.md',
    'package.json',
    'auditor.yaml',
  ]),
  sources: patterns.default(['**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}']),
  'source-exclude': z
    .array(relativePath)
    .default([
      '**/*.{spec,test}.*',
      '**/*.d.ts',
      '**/__tests__/**',
      'test/**',
      'tests/**',
    ]),
  'test-patterns': z
    .array(testPattern)
    .min(1)
    .default([
      '{dir}/{name}.spec{ext}',
      '{dir}/{name}.test{ext}',
      '{dir}/__tests__/{name}.test{ext}',
      'test/{name}.test.{ts,tsx,js,jsx,mjs,cjs}',
      'tests/{name}.test{ext}',
    ]),
  coverage: z
    .strictObject({
      report: relativePath.optional(),
      'minimum-lines': z.number().min(0).max(100).optional(),
    })
    .default({}),
  'max-files': z.number().int().min(1).max(10000).default(1000),
});
const ruleOverride = z.union([
  z.enum(['off', 'warning', 'error']),
  z
    .strictObject({
      severity: z.enum(['warning', 'error']).optional(),
      minimum: z.union([z.number().min(0).max(100), minimumSchema]).optional(),
      sources: patterns.optional(),
      'source-exclude': z.array(relativePath).optional(),
      include: patterns.optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      'Indica al menos un ajuste',
    ),
]);
// Which adjustments each detector accepts besides severity.
const adjustable: Record<string, string[]> = {
  'source-has-test': ['minimum', 'sources', 'source-exclude'],
  'coverage-thresholds': ['minimum'],
  'tests-exist': ['include'],
  'forbidden-files': ['include'],
  'typescript-no-any': ['include'],
  'typescript-no-suppression': ['include'],
  'typescript-forbidden-api': ['include'],
  'required-files': [],
};
const configSchema = z.strictObject({
  'schema-version': z.literal(1),
  packs: strings,
  exclude: z.array(relativePath).default([]),
  rules: z.record(z.string(), ruleOverride).default({}),
  inventory: inventorySchema.prefault({}),
});

export type Rule = z.infer<typeof ruleSchema>;
export type InventoryConfig = z.infer<typeof inventorySchema>;
export interface ProjectConfig {
  root: string;
  rules: Rule[];
  exclude: string[];
  inventory: InventoryConfig;
}

export async function readYaml(file: string): Promise<unknown> {
  const document = parseDocument(await readFile(file, 'utf8'), {
    uniqueKeys: true,
  });
  if (document.errors.length || document.warnings.length) {
    throw new Error(
      `YAML inválido en ${file}: ${[...document.errors, ...document.warnings].map((item) => item.message).join('; ')}`,
    );
  }
  return document.toJS({ maxAliasCount: 50 }) as unknown;
}

const sharedPack =
  /^package:((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)(?:\/([A-Za-z0-9._/-]+))?$/;

/** Finds `package:<name>[/<pack>]` in the nearest node_modules, like Node does. */
async function resolveSharedPack(
  root: string,
  reference: string,
): Promise<string> {
  const match = sharedPack.exec(reference);
  if (!match)
    throw new Error(
      `Referencia de pack compartido inválida: ${reference}. Usa package:<paquete>[/<pack>].`,
    );
  const [, name, sub] = match as unknown as [string, string, string?];
  if (
    sub?.split('/').some((part) => part === '' || part === '..' || part === '.')
  )
    throw new Error(`Ruta de pack compartido inválida: ${reference}`);
  const file = sub
    ? /\.ya?ml$/.test(sub)
      ? sub
      : `${sub}.yaml`
    : 'auditor-pack.yaml';
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name, file);
    const exists = await stat(candidate).then(
      (item) => item.isFile(),
      () => false,
    );
    if (exists) return candidate;
    if (path.dirname(dir) === dir) break;
  }
  throw new Error(
    `Pack compartido no encontrado: ${reference}. Instálalo con npm install ${name} y revisa que incluya ${file}.`,
  );
}

export const builtinPacks = [
  'docs',
  'typescript-tests',
  'testing',
  'angular',
] as const;

export async function loadConfig(configFile: string): Promise<ProjectConfig> {
  return buildConfig(
    path.dirname(path.resolve(configFile)),
    await readYaml(configFile),
  );
}

/** Builds a project configuration from an already-parsed auditor.yaml object. */
export async function buildConfig(
  root: string,
  raw: unknown,
): Promise<ProjectConfig> {
  const config = configSchema.parse(raw);
  const collected = new Map<string, Rule>();
  for (const reference of config.packs) {
    let packFile: string;
    if (reference.startsWith('builtin:')) {
      const name = reference.slice('builtin:'.length);
      if (!(builtinPacks as readonly string[]).includes(name)) {
        throw new Error(`Paquete incorporado desconocido: ${name}`);
      }
      packFile = fileURLToPath(
        new URL(`../packs/${name}.yaml`, import.meta.url),
      );
    } else if (reference.startsWith('package:')) {
      packFile = await resolveSharedPack(root, reference);
    } else {
      packFile = path.resolve(root, relativePath.parse(reference));
    }
    const pack = packSchema.parse(await readYaml(packFile));
    for (const rule of pack.rules) {
      if (collected.has(rule.id))
        throw new Error(`Regla duplicada: ${rule.id}`);
      collected.set(rule.id, rule);
    }
  }
  for (const [id, override] of Object.entries(config.rules)) {
    const rule = collected.get(id);
    if (!rule) throw new Error(`Regla desconocida en configuración: ${id}`);
    if (override === 'off') collected.delete(id);
    else if (typeof override === 'string')
      collected.set(id, { ...rule, severity: override });
    else {
      const allowed = adjustable[rule.detector] ?? [];
      const { severity, ...adjustments } = override;
      for (const key of Object.keys(adjustments))
        if (!allowed.includes(key))
          throw new Error(
            `La regla ${id} (${rule.detector}) no admite el ajuste ${key}. Admite: ${['severity', ...allowed].join(', ')}.`,
          );
      if (
        'minimum' in adjustments &&
        (typeof adjustments.minimum === 'number') !==
          (rule.detector === 'source-has-test')
      )
        throw new Error(
          rule.detector === 'source-has-test'
            ? `El ajuste minimum de ${id} es un porcentaje (número).`
            : `El ajuste minimum de ${id} es un objeto por métrica (lines, branches…).`,
        );
      collected.set(id, {
        ...rule,
        ...adjustments,
        ...(severity ? { severity } : {}),
      } as Rule);
    }
  }
  return {
    root,
    rules: [...collected.values()],
    inventory: config.inventory,
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/coverage/**',
      '**/target/**',
      '**/reports/**',
      ...config.exclude,
    ],
  };
}
