import path from 'node:path';
import type { ProjectConfig } from './config.js';
import {
  discover as discoverFiles,
  expandTestPatterns,
} from './test-association.js';

export type { CoverageMetrics } from './coverage-data.js';
import { readCoverage } from './coverage-data.js';
import type { CoverageMetrics, CoverageData } from './coverage-data.js';
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
    status: 'not-configured' | 'missing' | 'available' | 'invalid';
    report: string | null;
    modifiedAt: string | null;
    minimumLines: number | null;
    total: CoverageMetrics | null;
  };
}

export async function inspectInventory(
  config: ProjectConfig,
  policyEvidence = new Map<string, CoverageData>(),
): Promise<Inventory | undefined> {
  const options = config.inventory;
  if (!options.enabled) return undefined;
  const discover = (patterns: string[], ignore = config.exclude) =>
    discoverFiles(config, patterns, ignore);
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
    const data =
      policyEvidence.get(reportPath) ??
      (await readCoverage(config.root, options.coverage.report));
    if (data.status === 'invalid' && !policyEvidence.has(reportPath))
      throw new Error(data.message);
    coverage.status = data.status;
    coverage.modifiedAt = data.modifiedAt;
    coverage.total = data.total;
    for (const [file, metrics] of Object.entries(data.files))
      coverageByFile.set(file, metrics);
  }
  const matchedTests = new Set<string>();
  const files: InventoryFile[] = [];
  for (const file of displayedFiles) {
    const tests: string[] = [];
    if (sourceSet.has(file)) {
      const patterns = expandTestPatterns(file, options['test-patterns']);
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
