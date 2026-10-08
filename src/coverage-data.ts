import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

export const metricNames = [
  'lines',
  'branches',
  'functions',
  'statements',
] as const;
export type Metric = (typeof metricNames)[number];
export type CoverageMetrics = Record<Metric, number | null>;
const metricSchema = z.object({
  pct: z.union([z.number().min(0).max(100), z.literal('Unknown')]),
});
const metricsSchema = z.object({
  lines: metricSchema.optional(),
  branches: metricSchema.optional(),
  functions: metricSchema.optional(),
  statements: metricSchema.optional(),
});
const schema = z.record(z.string(), metricsSchema);
export interface CoverageData {
  status: 'available' | 'missing' | 'invalid';
  report: string;
  modifiedAt: string | null;
  sha256: string | null;
  total: CoverageMetrics | null;
  files: Record<string, CoverageMetrics>;
  message: string;
}
function metrics(input: z.infer<typeof metricsSchema>): CoverageMetrics {
  return Object.fromEntries(
    metricNames.map((name) => [
      name,
      typeof input[name]?.pct === 'number' ? input[name].pct : null,
    ]),
  ) as CoverageMetrics;
}
export async function readCoverage(
  root: string,
  report: string,
): Promise<CoverageData> {
  const result: CoverageData = {
    status: 'invalid',
    report,
    modifiedAt: null,
    sha256: null,
    total: null,
    files: Object.create(null) as Record<string, CoverageMetrics>,
    message: '',
  };
  let content: Buffer;
  try {
    const file = path.resolve(root, report);
    content = await readFile(file);
    result.modifiedAt = (await stat(file)).mtime.toISOString();
    result.sha256 = createHash('sha256').update(content).digest('hex');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      result.status = 'missing';
      result.message = `Reporte de cobertura no encontrado: ${report}`;
    } else
      result.message = `No se pudo leer el reporte de cobertura: ${report}`;
    return result;
  }
  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(JSON.parse(content.toString('utf8')));
    if (!Object.keys(parsed).length) throw new Error('empty');
  } catch {
    result.message = `Reporte de cobertura inválido: ${report}. Se espera Istanbul json-summary con porcentajes entre 0 y 100.`;
    return result;
  }
  result.status = 'available';
  result.message =
    'Total global importado; no se verificó su correspondencia con el código actual.';
  for (const [file, value] of Object.entries(parsed)) {
    if (file === 'total') {
      result.total = metrics(value);
      continue;
    }
    if (path.win32.isAbsolute(file) && !path.isAbsolute(file)) continue;
    const resolved = path.isAbsolute(file)
      ? file
      : path.resolve(root, file.replaceAll('\\', '/'));
    const relative = path.relative(root, resolved).split(path.sep).join('/');
    if (
      relative === '..' ||
      relative.startsWith('../') ||
      path.isAbsolute(relative)
    )
      continue;
    result.files[relative] = metrics(value);
  }
  return result;
}
