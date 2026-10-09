import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../dist/config.js';
import { audit } from '../dist/engine.js';
import { renderHtml } from '../dist/html-report.js';

async function project(t, files, options = '') {
  const root = await mkdtemp(path.join(tmpdir(), 'auditor-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contents = {
    'README.md': '# Test project',
    'auditor.yaml': 'schema-version: 1\npacks: [builtin:docs]\n' + options,
    ...files,
  };
  for (const [file, text] of Object.entries(contents)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  }
  return {
    root,
    report: async () =>
      audit(await loadConfig(path.join(root, 'auditor.yaml'))),
  };
}
const metrics = (pct) =>
  Object.fromEntries(
    ['lines', 'branches', 'functions', 'statements'].map((name) => [
      name,
      { total: 10, covered: pct === 0 ? 0 : 9, skipped: 0, pct },
    ]),
  );

test('tree associates colocated and separate tests, excluding dependencies and test files as sources', async (t) => {
  const p = await project(t, {
    'src/users/user.ts': 'export const user = 1;',
    'src/users/user.spec.ts': 'test();',
    'src/order.ts': 'export const order = 1;',
    'test/order.test.mjs': 'test();',
    'src/missing.ts': 'export const missing = 1;',
    'src/types.d.ts': 'declare const foo: string;',
    'node_modules/lib/thing.ts': 'ignored',
    'reports/sample.ts': 'ignored',
  });
  const report = await p.report();
  const inv = report.inventory;
  assert.deepEqual(inv.summary, { sources: 3, withTests: 2, withoutTests: 1 });
  assert.deepEqual(
    inv.files.find((f) => f.path === 'src/users/user.ts').tests,
    ['src/users/user.spec.ts'],
  );
  assert.deepEqual(inv.files.find((f) => f.path === 'src/order.ts').tests, [
    'test/order.test.mjs',
  ]);
  assert.equal(
    inv.files.find((f) => f.path === 'src/users/user.spec.ts').role,
    'test',
  );
  assert.equal(
    inv.files.find((f) => f.path === 'src/types.d.ts').role,
    'other',
  );
  assert.equal(inv.coverage.status, 'not-configured');
  assert.equal(inv.coverage.minimumLines, null);
  assert.ok(
    inv.files.every(
      (f) =>
        !f.path.startsWith('node_modules/') && !f.path.startsWith('reports/'),
    ),
  );
  assert.equal(report.summary.errors, 0);
  const html = renderHtml(report, {
    project: 'Test project',
    generatedAt: new Date(),
  });
  assert.match(html, /Mapa del proyecto/);
  assert.match(html, /Reporte de cobertura no configurado/);
  assert.match(html, /Objetivo de cobertura de líneas no definido/);
  assert.match(html, /Sin prueba/);
});

test('custom source and test patterns support a Python project', async (t) => {
  const p = await project(
    t,
    { 'app/calculator.py': 'pass', 'tests/test_calculator.py': 'pass' },
    `inventory:
  include: [app/**, tests/**]
  sources: ['app/**/*.py']
  test-patterns: ['tests/test_{name}.py']
`,
  );
  assert.deepEqual((await p.report()).inventory.summary, {
    sources: 1,
    withTests: 1,
    withoutTests: 0,
  });
});

test('coverage missing, measured zero and file absent from report remain distinct', async (t) => {
  const p = await project(
    t,
    { 'src/zero.ts': '', 'src/missing.ts': '' },
    `inventory:
  coverage:
    report: coverage/coverage-summary.json
    minimum-lines: 85
`,
  );
  assert.equal((await p.report()).inventory.coverage.status, 'missing');
  await mkdir(path.join(p.root, 'coverage'));
  await writeFile(
    path.join(p.root, 'coverage/coverage-summary.json'),
    JSON.stringify({
      total: metrics(90),
      [path.join(p.root, 'src/zero.ts')]: metrics(0),
    }),
  );
  const report = await p.report();
  const inv = report.inventory;
  assert.equal(inv.coverage.status, 'available');
  assert.equal(inv.coverage.total.lines, 90);
  assert.ok(inv.coverage.modifiedAt);
  assert.equal(
    inv.files.find((f) => f.path === 'src/zero.ts').coverage.lines,
    0,
  );
  assert.equal(
    inv.files.find((f) => f.path === 'src/missing.ts').coverage,
    null,
  );
  const html = renderHtml(report, {
    project: 'Example',
    generatedAt: new Date(),
  });
  assert.match(html, /0% líneas · Bajo objetivo/);
  assert.match(html, /Sin dato de líneas/);
  assert.equal(report.summary.errors, 0);
});

test('relative coverage paths and Unknown metrics are handled without inventing numbers', async (t) => {
  const p = await project(
    t,
    {
      'src/main.ts': '',
      'coverage/coverage-summary.json': JSON.stringify({
        'src/main.ts': metrics('Unknown'),
      }),
    },
    `inventory:
  coverage:
    report: coverage/coverage-summary.json
`,
  );
  const inv = (await p.report()).inventory;
  assert.equal(inv.coverage.status, 'available');
  assert.equal(inv.coverage.total, null);
  assert.equal(
    inv.files.find((f) => f.path === 'src/main.ts').coverage.lines,
    null,
  );
});

test('malformed coverage is an operational error and disabled inventory does not read it', async (t) => {
  const p = await project(
    t,
    { 'coverage/coverage-summary.json': '{"total":{"lines":{"pct":101}}}' },
    `inventory:
  coverage:
    report: coverage/coverage-summary.json
`,
  );
  await assert.rejects(p.report(), /Reporte de cobertura inválido/);
  await writeFile(
    path.join(p.root, 'auditor.yaml'),
    'schema-version: 1\npacks: [builtin:docs]\ninventory:\n  enabled: false\n  coverage:\n    report: coverage/coverage-summary.json\n',
  );
  assert.equal((await p.report()).inventory, undefined);
});

test('inventory honors exclusions, declares truncation and counts only displayed sources', async (t) => {
  const p = await project(
    t,
    { 'src/a.ts': '', 'src/b.ts': '', 'src/generated/skip.ts': '' },
    `exclude: [src/generated/**]
inventory:
  include: [src/**]
  max-files: 1
`,
  );
  const inv = (await p.report()).inventory;
  assert.equal(inv.totalFiles, 2);
  assert.equal(inv.files.length, 1);
  assert.equal(inv.truncated, true);
  assert.equal(inv.summary.sources, 1);
});

test('configuration rejects misspelled variables, keys and coverage paths outside project', async (t) => {
  for (const options of [
    'inventory:\n  test-patterns: ["{unknown}/{name}.test.ts"]',
    'inventory:\n  typo: true',
    'inventory:\n  coverage:\n    report: ../outside.json',
    'inventory:\n  coverage:\n    minimum-lines: 101',
  ]) {
    const p = await project(t, {}, options);
    await assert.rejects(p.report());
  }
});

test('HTML tree escapes file names and coverage report labels', async (t) => {
  const p = await project(
    t,
    { 'src/a&b.ts': '' },
    'inventory:\n  include: [src/**]\n',
  );
  const report = await p.report();
  const html = renderHtml(report, { project: 'Tree', generatedAt: new Date() });
  assert.ok(!html.includes('a&b.ts'));
  assert.match(html, /a&amp;b.ts/);
});
