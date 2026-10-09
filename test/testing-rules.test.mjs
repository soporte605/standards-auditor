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
const config = `schema-version: 1
packs: [builtin:testing]
`;

test('a project without unit tests fails with an error and a way to fix it', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': config,
    'src/user.service.ts': 'export const user = 1;\n',
  });
  const check = run(root, 'check', '--format', 'json');
  assert.equal(check.status, 1);
  const report = JSON.parse(check.stdout);
  const finding = report.findings.find(
    (item) => item.ruleId === 'testing.has-unit-tests',
  );
  assert.equal(finding.severity, 'error');
  const result = report.ruleResults.find(
    (item) => item.ruleId === 'testing.has-unit-tests',
  );
  assert.equal(result.status, 'fail');
  assert.match(result.guidance, /spec\.ts|test\.ts/);
});

test('having a test satisfies tests-exist, and source-has-test honors its minimum', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': config,
    'src/a.ts': 'export const a = 1;\n',
    'src/a.spec.ts': 'export {};\n',
    'src/b.ts': 'export const b = 1;\n',
  });
  const report = JSON.parse(run(root, 'check', '--format', 'json').stdout);
  assert.equal(
    report.findings.some((item) => item.ruleId === 'testing.has-unit-tests'),
    false,
  );
  // 1 of 2 sources has a test: exactly the pack minimum of 50%.
  assert.equal(
    report.findings.some((item) => item.ruleId === 'testing.source-has-test'),
    false,
  );
  await writeFile(
    path.join(root, 'auditor.yaml'),
    `${config}rules:
  testing.source-has-test: error
`,
  );
  await writeFile(path.join(root, 'src/c.ts'), 'export const c = 1;\n');
  const strict = run(root, 'check', '--format', 'json');
  const findings = JSON.parse(strict.stdout).findings.filter(
    (item) => item.ruleId === 'testing.source-has-test',
  );
  assert.deepEqual(
    findings.map((item) => item.path),
    ['src/b.ts', 'src/c.ts'],
  );
  assert.equal(strict.status, 1);
});

test('rules can be switched off and health counts passing rules', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': `${config}rules:
  testing.has-unit-tests: off
`,
    'src/a.ts': 'export const a = 1;\n',
    'src/a.test.ts': 'export {};\n',
  });
  const text = run(root, 'check');
  assert.equal(text.status, 0);
  assert.match(text.stdout, /Salud: 1\/1 reglas cumplidas/);
});

test('HTML report shows project health with guidance for failing rules', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': config,
    'src/a.ts': 'export const a = 1;\n',
  });
  const output = path.join(root, 'out.html');
  run(root, 'check', '--format', 'html', '--output', output);
  const html = await readFile(output, 'utf8');
  assert.match(html, /Salud del proyecto/);
  assert.match(html, /0<small> \/ 2 reglas cumplidas/);
  assert.match(html, /Cómo cumplirla/);
});

test('init suggests packs and exclusions from package.json', async (t) => {
  const root = await fixture(t, {
    'package.json': JSON.stringify({
      devDependencies: { '@angular/core': '^20.0.0', vitest: '^3.0.0' },
    }),
    'tsconfig.json': '{}',
  });
  const init = run(root, 'init');
  assert.equal(init.status, 0);
  assert.match(init.stdout, /Angular · Vitest/);
  const written = await readFile(path.join(root, 'auditor.yaml'), 'utf8');
  assert.match(written, /builtin:testing/);
  assert.match(written, /\*\.module\.ts/);
  // The generated file is valid and the new project is judged immediately.
  const check = run(root, 'check', '--format', 'json');
  assert.equal(check.status, 1);
  assert.ok(
    JSON.parse(check.stdout).findings.some(
      (item) => item.ruleId === 'testing.has-unit-tests',
    ),
  );
});

test('Angular/Vitest pack enforces the facade/service testing boundary', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': `schema-version: 1
packs: [builtin:angular-vitest]
`,
    'src/user.facade.ts': 'export class UserFacade {}\n',
    'src/user.service.ts': 'export class UserService {}\n',
    'src/user.facade.spec.ts': `import { describe, it, expect, vi } from 'vitest';
describe('UserFacade', () => {
  it('should work', () => { expect(vi.fn()).toBeDefined(); });
});
`,
    'src/user.service.spec.ts': `const spy = jasmine.createSpy('x');
import { TestBed } from '@angular/core/testing';
const fixture = TestBed.createComponent(Foo);
setTimeout(() => undefined, 500);
const s = 'jasmine in a string is fine';
`,
    'src/user.component.ts': 'export class UserComponent {}\n',
    'src/user.component.spec.ts': 'export {};\n',
  });
  const report = JSON.parse(run(root, 'check', '--format', 'json').stdout);
  const by = (id) => report.findings.filter((item) => item.ruleId === id);
  assert.deepEqual(
    by('angular.no-component-specs').map((item) => item.path),
    ['src/user.component.spec.ts'],
  );
  assert.deepEqual(
    by('angular.no-jasmine-jest').map((item) => [item.path, item.line]),
    [['src/user.service.spec.ts', 1]],
  );
  assert.equal(by('angular.no-component-testing-api').length, 1);
  assert.equal(by('angular.no-artificial-sleeps').length, 1);
  assert.equal(by('angular.facades-services-have-tests').length, 0);
  const missing = report.ruleResults.find(
    (item) => item.ruleId === 'angular.coverage-minimum',
  );
  assert.equal(missing.status, 'not-evaluated');
});

test('Angular init skips the generic per-source rule in favor of facade/service tests', async (t) => {
  const root = await fixture(t, {
    'package.json': JSON.stringify({ dependencies: { '@angular/core': '20' } }),
    'tsconfig.json': '{}',
  });
  run(root, 'init');
  const written = await readFile(path.join(root, 'auditor.yaml'), 'utf8');
  assert.match(written, /builtin:angular-vitest/);
  assert.match(written, /testing\.source-has-test: off/);
  const check = run(root, 'check', '--format', 'json');
  const ids = JSON.parse(check.stdout).ruleResults.map((item) => item.ruleId);
  assert.ok(ids.includes('angular.no-component-specs'));
  assert.ok(!ids.includes('testing.source-has-test'));
});

const sharedPack = `schema-version: 1
name: acme-angular
rules:
  - id: acme.changelog
    detector: required-files
    severity: error
    description: Mantén un CHANGELOG.md.
    guidance: Registra cada cambio relevante antes de abrir el PR.
    files: [CHANGELOG.md]
`;

test('a pack shared through an installed npm package applies and can be tuned locally', async (t) => {
  const root = await fixture(t, {
    'auditor.yaml': `schema-version: 1
packs: ['package:@acme/standards/angular']
`,
    'node_modules/@acme/standards/package.json': '{"name":"@acme/standards"}',
    'node_modules/@acme/standards/angular.yaml': sharedPack,
  });
  const failing = run(root, 'check', '--format', 'json');
  assert.equal(failing.status, 1);
  assert.equal(JSON.parse(failing.stdout).findings[0].ruleId, 'acme.changelog');
  assert.match(run(root, 'explain', 'acme.changelog').stdout, /Registra cada/);
  await writeFile(
    path.join(root, 'auditor.yaml'),
    `schema-version: 1
packs: ['package:@acme/standards/angular']
rules:
  acme.changelog: warning
`,
  );
  assert.equal(run(root, 'check').status, 0);
});

test('a package pack without a path uses auditor-pack.yaml and parent node_modules are found', async (t) => {
  const root = await fixture(t, {
    'node_modules/acme-standards/auditor-pack.yaml': sharedPack,
    'app/auditor.yaml': `schema-version: 1
packs: ['package:acme-standards']
`,
  });
  const result = spawnSync(
    process.execPath,
    [cli, 'check', '--format', 'json'],
    {
      cwd: path.join(root, 'app'),
      encoding: 'utf8',
    },
  );
  assert.equal(JSON.parse(result.stdout).findings[0].ruleId, 'acme.changelog');
});

test('missing or malformed shared pack references are operational errors', async (t) => {
  for (const reference of [
    'package:@acme/not-installed/angular',
    'package:@acme/standards/../../etc/passwd',
    'package:Not A Package',
  ]) {
    const root = await fixture(t, {
      'auditor.yaml': `schema-version: 1
packs: ['${reference}']
`,
    });
    const result = run(root, 'check');
    assert.equal(result.status, 2, reference);
    assert.match(result.stderr, /Pack compartido|Referencia|Ruta/);
  }
});
