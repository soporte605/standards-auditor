import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stringify } from 'yaml';
import { loadConfig } from '../dist/config.js';
import { audit } from '../dist/engine.js';
import { runCli } from '../dist/commands.js';

const values = (pct) =>
  Object.fromEntries(
    ['lines', 'branches', 'functions', 'statements'].map((name) => [
      name,
      { pct },
    ]),
  );
async function fixture(
  t,
  {
    minimum = { lines: 85, branches: 85, functions: 85, statements: 85 },
    severity = 'error',
    inventory = false,
    override,
  } = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), 'auditor-coverage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'auditor.yaml');
  const reportPath = 'coverage/coverage-summary.json';
  await mkdir(path.join(root, 'coverage'));
  await writeFile(path.join(root, 'README.md'), '# Test');
  await writeFile(
    path.join(root, 'team.yaml'),
    stringify({
      'schema-version': 1,
      name: 'team',
      rules: [
        {
          id: 'team.coverage',
          detector: 'coverage-thresholds',
          severity,
          description: 'Cobertura del equipo',
          report: reportPath,
          minimum,
        },
      ],
    }),
  );
  await writeFile(
    config,
    stringify({
      'schema-version': 1,
      packs: ['builtin:docs', 'team.yaml'],
      rules: override ? { 'team.coverage': override } : {},
      inventory: {
        enabled: inventory,
        coverage: { report: reportPath },
        'max-files': 1,
      },
    }),
  );
  return {
    root,
    config,
    set: (data) =>
      writeFile(
        path.join(root, reportPath),
        typeof data === 'string' ? data : JSON.stringify(data),
      ),
    report: async () => audit(await loadConfig(config)),
    cli: async (args = []) => {
      const messages = [];
      const code = await runCli(['check', '--config', config, ...args], {
        log: (s) => messages.push(s),
      });
      return { code, text: messages.join('\n') };
    },
  };
}

test('all four thresholds are inclusive and use report total even when the inventory is disabled', async (t) => {
  const p = await fixture(t);
  await p.set({ total: values(85) });
  const report = await p.report();
  assert.equal(report.inventory, undefined);
  assert.deepEqual(
    report.coverageEvaluations.map((item) => item.status),
    ['pass', 'pass', 'pass', 'pass'],
  );
  assert.equal(report.summary.evaluatedRules, 2);
  assert.equal(report.summary.requiredIncomplete, 0);
  const evidence = report.coverageEvaluations[0].evidence;
  assert.equal(evidence.scope, 'report-total');
  assert.equal(evidence.freshness, 'unverified');
  assert.match(evidence.sha256, /^[a-f0-9]{64}$/);
  assert.equal((await p.cli()).code, 0);
});

test('each metric has its own configurable minimum; zero is measured and insufficient results exit 1', async (t) => {
  const p = await fixture(t, {
    minimum: { lines: 0, branches: 85, functions: 90, statements: 100 },
  });
  await p.set({
    total: {
      lines: { pct: 0 },
      branches: { pct: 84.99 },
      functions: { pct: 91 },
      statements: { pct: 99 },
    },
  });
  const report = await p.report();
  assert.deepEqual(
    report.coverageEvaluations.map((item) => item.status),
    ['pass', 'fail', 'pass', 'fail'],
  );
  assert.equal(report.summary.errors, 2);
  assert.equal(report.coverageEvaluations[0].actual, 0);
  const result = await p.cli(['--details']);
  assert.equal(result.code, 1);
  assert.match(result.text, /84.99% incumple el mínimo de 85%/);
});

test('missing, malformed, empty and out-of-range evidence produce an incomplete result and still save HTML', async (t) => {
  const p = await fixture(t, { inventory: true });
  for (const input of [undefined, '{', {}, { total: values(101) }]) {
    if (input !== undefined) await p.set(input);
    const report = await p.report();
    assert.equal(report.summary.errors, 0);
    assert.equal(report.summary.requiredIncomplete, 4);
    assert.ok(
      report.coverageEvaluations.every(
        (item) => item.actual === null && item.status === 'not-evaluated',
      ),
    );
    const output = path.join(p.root, 'report.html');
    const result = await p.cli(['--format', 'html', '--output', output]);
    assert.equal(result.code, 2);
    const html = await readFile(output, 'utf8');
    assert.match(html, /Análisis incompleto/);
    assert.match(html, /No se pudo evaluar/);
    assert.match(html, /sin dato/);
    assert.ok(!html.includes('aria-label="Líneas: 0%"'));
  }
});

test('missing total is not inferred from file averages', async (t) => {
  const p = await fixture(t);
  await p.set({ 'src/a.ts': values(100), 'src/b.ts': values(100) });
  assert.equal((await p.cli()).code, 2);
  assert.ok(
    (await p.report()).coverageEvaluations.every(
      (item) => item.actual === null,
    ),
  );
});

test('unknown or omitted metrics remain incomplete while available ones retain their evaluations', async (t) => {
  const p = await fixture(t);
  await p.set({
    total: {
      lines: { pct: 90 },
      branches: { pct: 'Unknown' },
      functions: { pct: 0 },
    },
  });
  const report = await p.report();
  assert.deepEqual(
    report.coverageEvaluations.map((item) => item.status),
    ['pass', 'not-evaluated', 'fail', 'not-evaluated'],
  );
  assert.equal(report.summary.errors, 1);
  assert.equal(report.summary.notEvaluated, 2);
  assert.equal((await p.cli()).code, 2); // Incomplete required evidence takes precedence over violations.
});

test('only selected metrics are required and unconfigured coverage remains opt-in', async (t) => {
  const p = await fixture(t, { minimum: { lines: 85 } });
  await p.set({ total: { lines: { pct: 85 } } });
  assert.equal((await p.cli()).code, 0);
  assert.equal((await p.report()).coverageEvaluations.length, 1);
  await writeFile(
    p.config,
    'schema-version: 1\npacks: [builtin:docs]\ninventory: { enabled: false }\n',
  );
  await p.set('{ invalid');
  assert.equal((await p.cli()).code, 0);
  assert.equal((await p.report()).coverageEvaluations, undefined);
});

test('warning policies and project overrides preserve visible failures without blocking CI', async (t) => {
  for (const options of [{ severity: 'warning' }, { override: 'warning' }]) {
    const p = await fixture(t, options);
    assert.equal((await p.cli()).code, 0);
    assert.equal((await p.report()).summary.notEvaluated, 4);
    await p.set({ total: values(0) });
    const report = await p.report();
    assert.equal(report.summary.warnings, 4);
    assert.equal(report.summary.errors, 0);
    assert.equal((await p.cli()).code, 0);
  }
  const disabled = await fixture(t, { override: 'off' });
  await disabled.set('{ invalid');
  assert.equal((await disabled.cli()).code, 0);
  assert.equal((await disabled.report()).coverageEvaluations, undefined);
});

test('truncation and file totals do not change global policy values; JSON contains full evidence', async (t) => {
  const p = await fixture(t, { inventory: true });
  await mkdir(path.join(p.root, 'src'));
  await writeFile(path.join(p.root, 'src/a.ts'), '');
  await writeFile(path.join(p.root, 'src/b.ts'), '');
  await p.set({
    total: values(80),
    'src/a.ts': values(100),
    'src/b.ts': values(100),
  });
  const result = await p.cli(['--format', 'json']);
  assert.equal(result.code, 1);
  const report = JSON.parse(result.text);
  assert.equal(report.inventory.truncated, true);
  assert.ok(report.coverageEvaluations.every((item) => item.actual === 80));
  assert.equal(report.inventory.coverage.total.lines, 80);
});

test('bad options and misspelled metrics fail validation before reading reports', async (t) => {
  for (const minimum of [
    {},
    { lines: -1 },
    { lines: 101 },
    { lines: '85' },
    { branch: 85 },
  ]) {
    const p = await fixture(t, { minimum });
    await assert.rejects(p.report());
  }
});

test('executable returns real CI exit codes and explains configured minimums', async (t) => {
  const p = await fixture(t, { minimum: { lines: 85 } });
  const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
  for (const [input, expected] of [
    [{ total: values(85) }, 0],
    [{ total: values(84) }, 1],
    [{ total: {} }, 2],
  ]) {
    await p.set(input);
    const result = spawnSync(
      process.execPath,
      [cli, 'check', '--config', p.config, '--format', 'json'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, expected, result.stderr);
    assert.equal(JSON.parse(result.stdout).coverageEvaluations.length, 1);
  }
  const result = spawnSync(
    process.execPath,
    [cli, 'explain', 'team.coverage', '--config', p.config],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Mínimos globales/);
  assert.match(result.stdout, /"lines":85/);
});
