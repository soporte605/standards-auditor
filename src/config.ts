import { readFile } from 'node:fs/promises';
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
};
const ruleSchema = z.discriminatedUnion('detector', [
  z.strictObject({
    ...metadata,
    detector: z.literal('required-files'),
    files: z.array(relativePath).min(1),
  }),
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
const configSchema = z.strictObject({
  'schema-version': z.literal(1),
  packs: strings,
  exclude: z.array(relativePath).default([]),
  rules: z.record(z.string(), z.enum(['off', 'warning', 'error'])).default({}),
});

export type Rule = z.infer<typeof ruleSchema>;
export interface ProjectConfig {
  root: string;
  rules: Rule[];
  exclude: string[];
}

async function readYaml(file: string): Promise<unknown> {
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

export async function loadConfig(configFile: string): Promise<ProjectConfig> {
  const root = path.dirname(path.resolve(configFile));
  const config = configSchema.parse(await readYaml(configFile));
  const collected = new Map<string, Rule>();
  for (const reference of config.packs) {
    let packFile: string;
    if (reference.startsWith('builtin:')) {
      const name = reference.slice('builtin:'.length);
      if (!['docs', 'typescript-tests'].includes(name)) {
        throw new Error(`Paquete incorporado desconocido: ${name}`);
      }
      packFile = fileURLToPath(
        new URL(`../packs/${name}.yaml`, import.meta.url),
      );
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
  for (const [id, severity] of Object.entries(config.rules)) {
    const rule = collected.get(id);
    if (!rule) throw new Error(`Regla desconocida en configuración: ${id}`);
    if (severity === 'off') collected.delete(id);
    else collected.set(id, { ...rule, severity });
  }
  return {
    root,
    rules: [...collected.values()],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/coverage/**',
      '**/target/**',
      ...config.exclude,
    ],
  };
}
