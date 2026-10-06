import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { glob, escape } from 'glob';
import { z } from 'zod';
import type { ProjectConfig } from './config.js';

const metricSchema = z.object({
  pct: z.union([z.number().min(0).max(100), z.literal('Unknown')]),
});
const metricsSchema = z.object({
  lines: metricSchema,
  branches: metricSchema,
  functions: metricSchema,
  statements: metricSchema,
});
const coverageSchema = z.record(z.string(), metricsSchema);
export interface CoverageMetrics {
  lines: number | null;
  branches: number | null;
  functions: number | null;
  statements: number | null;
}
export interface InventoryFile {
  path: string;
  role: 'source' | 'test' | 'other';
  tests: string[];
  coverage: CoverageMetrics | null;
}
export interface Inventory {
  files: InventoryFile[];
  include: string[];
  sourcePatterns: string[];
  testPatterns: string[];
  totalFiles: number;
  truncated: boolean;
  summary: { sources: number; withTests: number; withoutTests: number };
  coverage: {
    status: 'not-configured' | 'missing' | 'available';
    report: string | null;
    modifiedAt: string | null;
    minimumLines: number | null;
    total: CoverageMetrics | null;
  };
}

function convertMetrics(
  metrics: z.infer<typeof metricsSchema>,
): CoverageMetrics {
  const value = (pct: number | 'Unknown') =>
    typeof pct === 'number' ? pct : null;
  return {
    lines: value(metrics.lines.pct),
    branches: value(metrics.branches.pct),
    functions: value(metrics.functions.pct),
    statements: value(metrics.statements.pct),
  };
}

export async function inspectInventory(
  config: ProjectConfig,
): Promise<Inventory | undefined> {
  const options = config.inventory;
  if (!options.enabled) return undefined;
  const discover = (patterns: string[], ignore = config.exclude) =>
    glob(patterns, {
      cwd: config.root,
      ignore,
      nodir: true,
      follow: false,
      dot: true,
      posix: true,
    });
  const allFiles = (await discover(options.include)).sort();
  const displayedFiles = allFiles.slice(0, options['max-files']);
  const sourceSet = new Set(
    await discover(options.sources, [
      ...config.exclude,
      ...options['source-exclude'],
    ]),
  );
  const coverage: Inventory['coverage'] = {
    status: 'not-configured',
    report: options.coverage.report ?? null,
    modifiedAt: null,
    minimumLines: options.coverage['minimum-lines'] ?? null,
    total: null,
  };
  const coverageByFile = new Map<string, CoverageMetrics>();
  if (options.coverage.report) {
    const reportPath = path.resolve(config.root, options.coverage.report);
    let content: string | undefined;
    try {
      content = await readFile(reportPath, 'utf8');
      coverage.modifiedAt = (await stat(reportPath)).mtime.toISOString();
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
      coverage.status = 'missing';
    }
    if (content !== undefined) {
      let parsed: z.infer<typeof coverageSchema>;
      try {
        parsed = coverageSchema.parse(JSON.parse(content));
      } catch {
        throw new Error(
          `Reporte de cobertura inválido: ${options.coverage.report}. Se espera Istanbul json-summary con lines, branches, functions y statements.`,
        );
      }
      if (!Object.keys(parsed).length)
        throw new Error(
          `Reporte de cobertura vacío: ${options.coverage.report}`,
        );
      coverage.status = 'available';
      for (const [file, metrics] of Object.entries(parsed)) {
        if (file === 'total') {
          coverage.total = convertMetrics(metrics);
          continue;
        }
        // Absolute paths from another platform/workspace cannot safely be guessed.
        if (path.win32.isAbsolute(file) && !path.isAbsolute(file)) continue;
        const resolved = path.isAbsolute(file)
          ? file
          : path.resolve(config.root, file.replaceAll('\\', '/'));
        const relative = path
          .relative(config.root, resolved)
          .split(path.sep)
          .join('/');
        if (
          relative === '..' ||
          relative.startsWith('../') ||
          path.isAbsolute(relative)
        )
          continue;
        coverageByFile.set(relative, convertMetrics(metrics));
      }
    }
  }
  const matchedTests = new Set<string>();
  const files: InventoryFile[] = [];
  for (const file of displayedFiles) {
    const tests: string[] = [];
    if (sourceSet.has(file)) {
      const parsed = path.posix.parse(file);
      const variables: Record<string, string> = {
        dir: parsed.dir || '.',
        name: parsed.name,
        ext: parsed.ext,
        path: file.slice(0, file.length - parsed.ext.length),
      };
      const patterns = options['test-patterns'].map((pattern) =>
        pattern.replace(/\{(dir|name|ext|path)\}/g, (_, key: string) =>
          escape(variables[key]!),
        ),
      );
      tests.push(
        ...(await discover(patterns)).filter((test) => test !== file).sort(),
      );
      for (const test of tests) matchedTests.add(test);
    }
    files.push({
      path: file,
      role: sourceSet.has(file) ? 'source' : 'other',
      tests,
      coverage: coverageByFile.get(file) ?? null,
    });
  }
  for (const file of files) if (matchedTests.has(file.path)) file.role = 'test';
  const sources = files.filter((file) => file.role === 'source');
  return {
    files,
    include: options.include,
    sourcePatterns: options.sources,
    testPatterns: options['test-patterns'],
    totalFiles: allFiles.length,
    truncated: displayedFiles.length < allFiles.length,
    summary: {
      sources: sources.length,
      withTests: sources.filter((file) => file.tests.length).length,
      withoutTests: sources.filter((file) => !file.tests.length).length,
    },
    coverage,
  };
}
