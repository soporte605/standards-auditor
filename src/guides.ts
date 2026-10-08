import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { parseDocument, stringify } from 'yaml';
import { z } from 'zod';

const safeRelative = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes('\\') &&
      !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !value.split('/').includes('..'),
    'Usa rutas o patrones relativos con / y sin ..',
  );
const idSchema = z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/);
const entrySchema = z.strictObject({
  id: idSchema,
  path: safeRelative,
  include: z.array(safeRelative).min(1),
  'original-name': z.string().min(1),
  'imported-sha256': z.string().regex(/^[a-f0-9]{64}$/),
});
const registrySchema = z.strictObject({
  'schema-version': z.literal(1),
  guides: z.array(entrySchema),
});
type Entry = z.infer<typeof entrySchema>;
export interface Guide extends Entry {
  sha256: string;
  modified: boolean;
}
const digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex');
function missing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

// Managed paths never traverse symlinks, including intermediate directories.
async function managedPath(root: string, relative: string): Promise<string> {
  safeRelative.parse(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(
          `No se permiten enlaces simbólicos en guías: ${relative}`,
        );
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  return current;
}
async function entries(root: string): Promise<Entry[]> {
  const file = await managedPath(root, '.auditor/guides.yaml');
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length || document.warnings.length)
    throw new Error('Registro de guías YAML inválido');
  const registry = registrySchema.parse(document.toJS({ maxAliasCount: 50 }));
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const guide of registry.guides) {
    if (guide.path !== `.auditor/rules/${guide.id}.md`)
      throw new Error(`Ruta de guía inválida: ${guide.path}`);
    if (ids.has(guide.id) || paths.has(guide.path))
      throw new Error(`Guía duplicada: ${guide.id}`);
    ids.add(guide.id);
    paths.add(guide.path);
  }
  return registry.guides;
}
function validateMarkdown(data: Buffer): void {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new Error('La guía debe ser Markdown UTF-8 válido');
  }
  if (data.includes(0)) throw new Error('La guía contiene datos binarios');
  if (!data.toString('utf8').trim()) throw new Error('La guía está vacía');
}
export async function loadGuides(root: string): Promise<Guide[]> {
  const result: Guide[] = [];
  for (const entry of await entries(root)) {
    const file = await managedPath(root, entry.path);
    let data: Buffer;
    try {
      data = await readFile(file);
    } catch (error) {
      if (missing(error))
        throw new Error(`Falta la guía ${entry.id}: ${entry.path}`);
      throw error;
    }
    validateMarkdown(data);
    const sha256 = digest(data);
    result.push({
      ...entry,
      sha256,
      modified: sha256 !== entry['imported-sha256'],
    });
  }
  return result;
}

export async function addGuide(
  root: string,
  source: string,
  id: string,
  include: string[],
): Promise<Guide> {
  idSchema.parse(id);
  z.array(safeRelative).min(1).parse(include);
  if (!/\.md$/i.test(source))
    throw new Error('La guía debe tener extensión .md');
  const data = await readFile(source);
  validateMarkdown(data);
  const relative = `.auditor/rules/${id}.md`;
  const destination = await managedPath(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  const lockPath = await managedPath(root, '.auditor/guides.lock');
  const lock = await open(lockPath, 'wx');
  let created = false;
  const temporary = path.join(root, '.auditor', `guides-${randomUUID()}.tmp`);
  try {
    const existing = await entries(root);
    if (existing.some((guide) => guide.id === id))
      throw new Error(
        `Ya existe la guía ${id}; edita su archivo o usa otro --id.`,
      );
    const entry: Entry = {
      id,
      path: relative,
      include,
      'original-name': path.basename(source),
      'imported-sha256': digest(data),
    };
    await writeFile(destination, data, { flag: 'wx' });
    created = true;
    await writeFile(
      temporary,
      stringify({ 'schema-version': 1, guides: [...existing, entry] }),
      { flag: 'wx' },
    );
    await rename(temporary, await managedPath(root, '.auditor/guides.yaml'));
    return { ...entry, sha256: digest(data), modified: false };
  } catch (error) {
    if (created) await unlink(destination);
    throw error;
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!missing(error)) throw error;
    });
    await lock.close();
    await unlink(lockPath);
  }
}
