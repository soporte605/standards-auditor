import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCli } from '../dist/commands.js';
import { renderText } from '../dist/text-report.js';
import { renderHtml } from '../dist/html-report.js';

const report = {
  schemaVersion: 1,
  findings: Array.from({ length: 40 }, (_, i) => ({
    ruleId: 'typescript.no-any',
    severity: 'warning',
    path: `src/file-${i}.test.ts`,
    message: 'Usa tipos concretos.',
    line: 1,
  })),
  summary: { errors: 0, warnings: 40, evaluatedRules: 2, analyzedFiles: 40 },
  notices: ['Alcance limitado a TypeScript.'],
};

test('console summary stays short while details expose all findings and notes', () => {
  const summary = renderText(report, 'Example');
  assert.ok(summary.split('\n').length <= 6);
  assert.match(summary, /40 advertencias/);
  assert.ok(!summary.includes('src/file-'));
  assert.match(summary, /--details/);
  const details = renderText(report, 'Example', true);
  assert.match(details, /src\/file-39.test.ts/);
  assert.match(details, /NOTA Alcance limitado/);
});

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'auditor-presentation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'auditor.yaml');
  await writeFile(
    config,
    'schema-version: 1\npacks: [builtin:docs]\ninventory:\n  enabled: false\n',
  );
  return { root, config, output: path.join(root, 'report.html') };
}

test('check does not write a report or open a browser unless requested', async (t) => {
  const p = await fixture(t);
  const logs = [];
  let opened = false;
  const code = await runCli(['check', '--config', p.config], {
    log: (m) => logs.push(m),
    openReport: async () => {
      opened = true;
    },
  });
  assert.equal(code, 1);
  assert.equal(opened, false);
  assert.deepEqual(await readdir(p.root), ['auditor.yaml']);
  assert.ok(!logs.join('\n').includes('docs.required-files'));
});

test('--open saves the complete report before asking the browser to open it and preserves failure status', async (t) => {
  const p = await fixture(t);
  const logs = [];
  let opened;
  const code = await runCli(
    ['check', '--config', p.config, '--open', '--output', p.output],
    {
      log: (m) => logs.push(m),
      openReport: async (file) => {
        assert.match(await readFile(file, 'utf8'), /docs.required-files/);
        opened = file;
      },
    },
  );
  assert.equal(code, 1);
  assert.equal(opened, p.output);
  assert.match(logs.join('\n'), /Reporte HTML:/);
});

test('browser launch failure retains the report and the audit exit code', async (t) => {
  const p = await fixture(t);
  const warnings = [];
  await writeFile(path.join(p.root, 'README.md'), '# Example');
  const code = await runCli(
    ['check', '--config', p.config, '--open', '--output', p.output],
    {
      log: () => {},
      warn: (m) => warnings.push(m),
      openReport: async () => {
        throw new Error('No browser');
      },
    },
  );
  assert.equal(code, 0);
  assert.match(warnings[0], /No se pudo abrir/);
  assert.match(
    await readFile(p.output, 'utf8'),
    /Sin incumplimientos detectados/,
  );
});

test('HTML without --open does not launch a browser and conflicting flags are rejected', async (t) => {
  const p = await fixture(t);
  let opened = false;
  await runCli(
    ['check', '--config', p.config, '--format', 'html', '--output', p.output],
    {
      log: () => {},
      openReport: async () => {
        opened = true;
      },
    },
  );
  assert.equal(opened, false);
  for (const args of [
    ['check', '--open', '--format', 'json'],
    ['init', '--open'],
    ['check', '--open', '--details'],
    ['check', '--details', '--format', 'json'],
  ])
    await assert.rejects(
      runCli(args, {
        log: () => {},
        openReport: async () => {
          assert.fail('Must not open');
        },
      }),
    );
});

function withCoverage(total) {
  return {
    ...report,
    inventory: {
      files: [],
      include: [],
      sourcePatterns: [],
      testPatterns: [],
      totalFiles: 0,
      truncated: false,
      summary: { sources: 0, withTests: 0, withoutTests: 0 },
      coverage: {
        status: total ? 'available' : 'not-configured',
        report: null,
        modifiedAt: null,
        minimumLines: 85,
        total,
      },
    },
  };
}

test('coverage graphics show imported values including zero, while absence never becomes zero coverage', () => {
  const html = renderHtml(
    withCoverage({ lines: 0, branches: 40, functions: 90, statements: 80 }),
    { project: 'Example', generatedAt: new Date() },
  );
  assert.match(html, /aria-label="Líneas: 0%"/);
  assert.match(html, /aria-label="Ramas: 40%"/);
  assert.match(html, /aria-label="Funciones: 90%"/);
  assert.match(html, /aria-label="Sentencias: 80%"/);
  assert.match(
    html,
    /<details class="disclosure inventory" id="inventory-details">/,
  );
  assert.match(html, /<details class="disclosure" id="findings-details">/);
  const missing = renderHtml(withCoverage(null), {
    project: 'Example',
    generatedAt: new Date(),
  });
  assert.ok(!missing.includes('aria-label="Líneas: 0%"'));
  assert.match(missing, /Reporte de cobertura no configurado/);
});
