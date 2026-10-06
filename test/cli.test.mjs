import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
async function fixture(t, files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'standards-auditor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  }
  return root;
}
function run(root, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  return result;
}
const tsConfig = `schema-version: 1
packs: [builtin:typescript-tests]
`;

test('init creates a generic config and refuses to overwrite team settings', async (t) => {
  const root = await fixture(t);
  assert.equal(run(root, 'init').status, 0);
  const before = await readFile(path.join(root, 'auditor.yaml'), 'utf8');
  assert.equal(run(root, 'init').status, 2);
  assert.equal(await readFile(path.join(root, 'auditor.yaml'), 'utf8'), before);
  const check = run(root, 'check', '--format', 'json');
  assert.equal(check.status, 1);
  assert.equal(
    JSON.parse(check.stdout).findings[0].ruleId,
    'docs.required-files',
  );
  await writeFile(path.join(root, 'README.md'), '# Example');
  assert.equal(run(root, 'check').status, 0);
});

test('TypeScript rules detect real syntax, not text in comments, strings or templates', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': tsConfig,
    'sample.test.ts': [
      '// any in prose',
      'const message = "any // @ts-ignore";',
      'const template = `',
      '// @ts-ignore',
      '`;',
      'const value: any = 1;',
      '// @ts-ignore',
      'const wrong: string = 42;',
      'const cast = value as any;',
    ].join('\n'),
  });
  const result = run(root, 'check', '--format', 'json');
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(
    report.findings.map((f) => [f.ruleId, f.line]),
    [
      ['typescript.no-any', 6],
      ['typescript.no-suppression', 7],
      ['typescript.no-any', 9],
    ],
  );
  assert.deepEqual(report.summary, {
    errors: 1,
    warnings: 2,
    evaluatedRules: 2,
    analyzedFiles: 1,
  });
  assert.equal(run(root, 'check', '--format', 'json').stdout, result.stdout);
});

test('block directives and comment-only files are checked', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': tsConfig,
    'empty.spec.ts': '// @ts-nocheck\n',
    'block.spec.ts': '/*\n * @ts-ignore\n */\nconst value = 1;\n',
  });
  const result = run(root, 'check', '--format', 'json');
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).summary.errors, 2);
});

test('warnings do not block and rules can be promoted or disabled', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': tsConfig,
    'sample.spec.ts': 'let value: any;',
  });
  assert.equal(run(root, 'check').status, 0);
  await writeFile(
    path.join(root, 'auditor.yaml'),
    tsConfig + 'rules:\n  typescript.no-any: error\n',
  );
  assert.equal(run(root, 'check').status, 1);
  await writeFile(
    path.join(root, 'auditor.yaml'),
    tsConfig + 'rules:\n  typescript.no-any: off\n',
  );
  assert.equal(run(root, 'check').status, 0);
});

test('exclusions and default dependency exclusions are respected', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml':
      tsConfig +
      'exclude: [generated/**]\nrules:\n  typescript.no-any: error\n',
    'generated/example.test.ts': 'let a: any;',
    'node_modules/dependency/example.test.ts': 'let a: any;',
    'dist/example.test.ts': 'let a: any;',
    'src/example.test.ts': 'const value: unknown = 1;',
  });
  const result = run(root, 'check', '--format', 'json');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).summary.analyzedFiles, 1);
});

test('an empty test scope is explicitly reported', async (t) => {
  const root = await fixture(t, { 'auditor.yaml': tsConfig });
  const result = run(root, 'check', '--format', 'json');
  assert.equal(JSON.parse(result.stdout).notices.length, 2);
});

test('local packs work from a different working directory and explain exposes their intent', async (t) => {
  const root = await fixture(t, {
    'project/auditor.yaml': 'schema-version: 1\npacks: [./rules/team.yaml]\n',
    'project/rules/team.yaml': `schema-version: 1
name: team
rules:
  - id: team.docs
    detector: required-files
    severity: error
    description: Documenta las convenciones del equipo.
    files: [CONTRIBUTING.md]
`,
    'project/CONTRIBUTING.md': '# Contribuir',
  });
  assert.equal(run(root, 'check', '-c', 'project/auditor.yaml').status, 0);
  const result = run(
    root,
    'explain',
    'team.docs',
    '-c',
    'project/auditor.yaml',
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Documenta las convenciones/);
});

test('invalid YAML, unknown keys, unknown rules and unknown packs fail explicitly', async (t) => {
  const root = await fixture(t);
  for (const config of [
    'schema-version: [',
    'schema-version: 1\nschema-version: 1\npacks: [builtin:docs]',
    'schema-version: 2\npacks: [builtin:docs]',
    'schema-version: 1\npacks: [builtin:docs]\nunknown: true',
    'schema-version: 1\npacks: [builtin:missing]',
    'schema-version: 1\npacks: [builtin:docs]\nrules: {missing.rule: off}',
    'schema-version: 1\npacks: [builtin:docs, builtin:docs]',
    'schema-version: 1\npacks: [../outside.yaml]',
  ]) {
    await writeFile(path.join(root, 'auditor.yaml'), config);
    const result = run(root, 'check');
    assert.equal(result.status, 2, config);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.length);
  }
});

test('bad commands and missing config are operational errors', async (t) => {
  const root = await fixture(t);
  for (const args of [
    ['check'],
    ['unknown'],
    ['check', 'extra'],
    ['check', '--format', 'xml'],
    ['explain'],
    ['check', '--unknown'],
  ]) {
    assert.equal(run(root, ...args).status, 2, args.join(' '));
  }
  assert.match(run(root, '--version').stdout, /0\.1\.0-dev\.0/);
  assert.equal(run(root, '--help').status, 0);
});

test('a directory cannot satisfy a required file', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': 'schema-version: 1\npacks: [builtin:docs]',
  });
  await mkdir(path.join(root, 'README.md'));
  assert.equal(run(root, 'check').status, 1);
});
