import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface Detection {
  typescript: boolean;
  framework: string | null;
  runner: string | null;
}

const frameworks: [string, string][] = [
  ['@angular/core', 'Angular'],
  ['next', 'Next.js'],
  ['@nestjs/core', 'NestJS'],
  ['vue', 'Vue'],
  ['react', 'React'],
];
const runners: [string, string][] = [
  ['vitest', 'Vitest'],
  ['jest', 'Jest'],
  ['karma', 'Karma'],
];
const baseExclude = [
  '**/*.{spec,test}.*',
  '**/*.d.ts',
  '**/__tests__/**',
  'test/**',
  'tests/**',
  '**/*.config.{ts,js,mjs,cjs}',
];
const frameworkExclude: Record<string, string[]> = {
  Angular: [
    '**/main.ts',
    '**/*.module.ts',
    '**/*.routes.ts',
    '**/environments/**',
  ],
  'Next.js': ['**/layout.tsx', '**/middleware.ts'],
  React: ['**/main.{ts,tsx}', '**/index.tsx'],
  Vue: ['**/main.ts'],
  NestJS: ['**/main.ts', '**/*.module.ts'],
};

/** Reads package.json and tsconfig.json to suggest a starting configuration. */
export async function detectProject(root: string): Promise<Detection | null> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    );
  } catch {
    return null;
  }
  const dependencies = new Set<string>();
  if (manifest && typeof manifest === 'object')
    for (const key of ['dependencies', 'devDependencies'])
      for (const name of Object.keys(
        (manifest as Record<string, Record<string, unknown> | undefined>)[
          key
        ] ?? {},
      ))
        dependencies.add(name);
  const tsconfig = await stat(path.join(root, 'tsconfig.json')).then(
    (item) => item.isFile(),
    () => false,
  );
  return {
    typescript: tsconfig || dependencies.has('typescript'),
    framework: frameworks.find(([name]) => dependencies.has(name))?.[1] ?? null,
    runner: runners.find(([name]) => dependencies.has(name))?.[1] ?? null,
  };
}

export function suggestedConfig(detection: Detection): string {
  const exclude = [
    ...baseExclude,
    ...(detection.framework
      ? (frameworkExclude[detection.framework] ?? [])
      : []),
  ];
  const angular = detection.framework === 'Angular';
  const detected = ['TypeScript', detection.framework, detection.runner].filter(
    Boolean,
  );
  return `# Configuración sugerida a partir de package.json (${detected.join(' · ')}).
# Ajusta packs, severidades y exclusiones a los estándares de tu equipo.
schema-version: 1
packs:
  - builtin:typescript-tests
  - builtin:testing
${angular ? '  - builtin:angular\n' : ''}  # - ./rules/team.yaml
exclude: []
rules:
  # Cambia la severidad (error, warning) o desactiva una regla con off.
${angular ? '  # Con Angular se exige prueba a componentes, servicios y demás artefactos.\n  testing.source-has-test: off\n  # En un monorepo, limita la regla a tu app Angular y ajusta el umbral:\n  # angular.artifacts-have-tests:\n  #   sources: ["apps/web/**/*.{component,service,directive,pipe,guard,resolver}.ts"]\n  #   minimum: 80' : '  # testing.source-has-test: error\n  {}'}
inventory:
  enabled: true
  # Archivos que no necesitan una prueba propia.
  source-exclude:
${exclude.map((item) => `    - '${item}'`).join('\n')}
  # coverage:
  #   report: coverage/coverage-summary.json
  #   minimum-lines: 85
`;
}
