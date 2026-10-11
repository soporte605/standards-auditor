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
const angular = {
  'package.json': JSON.stringify({
    dependencies: { '@angular/core': '20' },
    devDependencies: { vitest: '3' },
  }),
  'tsconfig.json': '{}',
  'src/a.service.ts': 'export class A {}\n',
  'src/a.service.spec.ts': 'export {};\n',
  'src/b.service.ts': 'export class B {}\n',
};

test('suggest recommends the packs that fit the project and what they would find today', async (t) => {
  const root = await fixture(t, {
    ...angular,
    'auditor.yaml': 'schema-version: 1\npacks: [builtin:typescript-tests]\n',
  });
  const json = JSON.parse(run(root, 'suggest', '--format', 'json').stdout);
  const state = Object.fromEntries(json.packs.map((p) => [p.pack, p.state]));
  assert.deepEqual(state, {
    'builtin:typescript-tests': 'active',
    'builtin:testing': 'recommended',
    'builtin:angular': 'recommended',
    'builtin:docs': 'optional',
  });
  assert.deepEqual(json.missing, ['builtin:testing', 'builtin:angular']);
  const text = run(root, 'suggest');
  assert.equal(text.status, 0);
  assert.match(text.stdout, /Angular · Vitest/);
  assert.match(text.stdout, /\+ recomendado\s+builtin:angular/);
});

test('suggest proposes a minimum that passes today for gradual adoption', async (t) => {
  const root = await fixture(t, {
    ...angular,
    'auditor.yaml': 'schema-version: 1\npacks: [builtin:angular]\n',
  });
  const json = JSON.parse(run(root, 'suggest', '--format', 'json').stdout);
  const angularPack = json.packs.find((p) => p.pack === 'builtin:angular');
  assert.equal(angularPack.adjustments.length, 1);
  assert.equal(angularPack.adjustments[0].rule, 'angular.artifacts-have-tests');
  assert.match(angularPack.adjustments[0].yaml, /minimum: 50/);
  const text = run(root, 'suggest').stdout;
  assert.match(text, /      minimum: 50/);
  // Applying that minimum really makes the audit pass.
  await writeFile(
    path.join(root, 'auditor.yaml'),
    `schema-version: 1
packs: [builtin:angular]
rules:
  angular.artifacts-have-tests:
    minimum: 50
`,
  );
  const check = JSON.parse(run(root, 'check', '--format', 'json').stdout);
  assert.equal(
    check.findings.filter((f) => f.ruleId === 'angular.artifacts-have-tests')
      .length,
    0,
  );
});

test('suggest --write adds the missing packs, keeps comments and is idempotent', async (t) => {
  const root = await fixture(t, {
    ...angular,
    'auditor.yaml': `# Configuración del equipo
schema-version: 1
packs:
  - builtin:typescript-tests # calidad de specs
  - builtin:testing
exclude: []
rules: {}
`,
  });
  const first = run(root, 'suggest', '--write');
  assert.equal(first.status, 0);
  assert.match(first.stdout, /builtin:angular/);
  const written = await readFile(path.join(root, 'auditor.yaml'), 'utf8');
  assert.match(written, /# Configuración del equipo/);
  assert.match(written, /# calidad de specs/);
  assert.match(written, /builtin:angular/);
  assert.match(written, /testing\.source-has-test: off/);
  const second = run(root, 'suggest', '--write');
  assert.match(second.stdout, /no se cambió nada/);
  assert.equal(
    await readFile(path.join(root, 'auditor.yaml'), 'utf8'),
    written,
  );
  assert.equal(run(root, 'check').status, 0, 'the written config is valid');
});

test('suggest handles projects it cannot classify and invalid usage', async (t) => {
  const plain = await fixture(t, {
    'package.json': '{"name":"x"}',
    'auditor.yaml': 'schema-version: 1\npacks: [builtin:docs]\n',
  });
  const json = JSON.parse(run(plain, 'suggest', '--format', 'json').stdout);
  assert.equal(
    json.packs.find((p) => p.pack === 'builtin:angular').state,
    'not-applicable',
  );
  assert.deepEqual(json.missing, []);
  const empty = await fixture(t);
  assert.equal(run(empty, 'suggest').status, 0);
  const write = run(empty, 'suggest', '--write');
  assert.equal(write.status, 2);
  assert.match(write.stderr, /init/);
  assert.equal(run(plain, 'suggest', '--format', 'html').status, 2);
  assert.equal(run(plain, 'check', '--write').status, 2);
});
