import path from 'node:path';
import { glob, escape } from 'glob';
import type { ProjectConfig } from './config.js';

/** Expands `{dir}`, `{name}`, `{ext}` and `{path}` for one source file. */
export function expandTestPatterns(file: string, patterns: string[]): string[] {
  const parsed = path.posix.parse(file);
  const variables: Record<string, string> = {
    dir: parsed.dir || '.',
    name: parsed.name,
    ext: parsed.ext,
    path: file.slice(0, file.length - parsed.ext.length),
  };
  return patterns.map((pattern) =>
    pattern.replace(/\{(dir|name|ext|path)\}/g, (_, key: string) =>
      escape(variables[key]!),
    ),
  );
}

export function discover(
  config: ProjectConfig,
  patterns: string[],
  ignore = config.exclude,
): Promise<string[]> {
  return glob(patterns, {
    cwd: config.root,
    ignore,
    nodir: true,
    follow: false,
    dot: true,
    posix: true,
  });
}

/** Maps every source file in the inventory scope to its associated tests. */
export async function associateSources(
  config: ProjectConfig,
): Promise<Map<string, string[]>> {
  const options = config.inventory;
  const sources = (
    await discover(config, options.sources, [
      ...config.exclude,
      ...options['source-exclude'],
    ])
  ).sort();
  const result = new Map<string, string[]>();
  for (const file of sources) {
    const tests = await discover(
      config,
      expandTestPatterns(file, options['test-patterns']),
    );
    result.set(file, tests.filter((test) => test !== file).sort());
  }
  return result;
}
