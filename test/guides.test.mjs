import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { addGuide, loadGuides } from '../dist/guides.js';
import { runCli } from '../dist/commands.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'auditor-guides-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'auditor.yaml');
  const source = path.join(root, 'input.md');
  await writeFile(
    config,
    'schema-version: 1\npacks: [builtin:docs]\ninventory: { enabled: false }\n',
  );
  await writeFile(path.join(root, 'README.md'), '# Project');
  await writeFile(
    source,
    Buffer.from('\ufeff# Reglas\r\n\r\nPrueba el comportamiento público.\r\n'),
  );
  return { root, config, source };
}

test('CLI imports exact bytes, associates scope, and audit does not activate prose as detectors', async (t) => {
  const { root, config, source } = await fixture(t);
  const before = await readFile(config);
  const logs = [];
  assert.equal(
    await runCli(
      [
        'rules',
        'add',
        source,
        '--config',
        config,
        '--id',
        'team.tests',
        '--include',
        'src/**/*.ts',
        '--include',
        'lib/**/*.ts',
      ],
      { log: (s) => logs.push(s) },
    ),
    0,
  );
  assert.deepEqual(
    await readFile(path.join(root, '.auditor/rules/team.tests.md')),
    await readFile(source),
  );
  assert.deepEqual(await readFile(config), before);
  assert.match(logs[0], /No se activaron/);
  const guides = await loadGuides(root);
  assert.deepEqual(guides[0].include, ['src/**/*.ts', 'lib/**/*.ts']);
  assert.equal(guides[0].modified, false);
  let output;
  assert.equal(
    await runCli(['check', '--config', config, '--format', 'json'], {
      log: (s) => {
        output = s;
      },
    }),
    0,
  );
  const report = JSON.parse(output);
  assert.equal(report.summary.evaluatedRules, 1);
  assert.equal(report.guides[0].id, 'team.tests');
  assert.match(report.notices[0], /sin evaluación automática/);
  await runCli(['rules', 'list', '--config', config], {
    log: (s) => {
      output = s;
    },
  });
  assert.match(output, /team.tests · original/);
});

test('editing a guide preserves import provenance and exposes the current hash', async (t) => {
  const { root, source } = await fixture(t);
  const original = await addGuide(root, source, 'team.tests', ['**/*']);
  await writeFile(path.join(root, original.path), '# Nuevas reglas');
  const [edited] = await loadGuides(root);
  assert.equal(edited.modified, true);
  assert.equal(edited['imported-sha256'], original.sha256);
  assert.notEqual(edited.sha256, original.sha256);
});

test('duplicate imports and unmanaged destination files are never overwritten', async (t) => {
  const { root, source } = await fixture(t);
  const original = await addGuide(root, source, 'team.tests', ['**/*']);
  const registry = await readFile(path.join(root, '.auditor/guides.yaml'));
  await writeFile(source, '# Changed');
  await assert.rejects(
    addGuide(root, source, 'team.tests', ['**/*']),
    /Ya existe/,
  );
  assert.deepEqual(
    await readFile(path.join(root, '.auditor/guides.yaml')),
    registry,
  );
  assert.equal((await loadGuides(root))[0].sha256, original.sha256);
  await writeFile(path.join(root, '.auditor/rules/another.md'), '# Keep');
  await assert.rejects(addGuide(root, source, 'another', ['**/*']), /EEXIST/);
  assert.equal(
    await readFile(path.join(root, '.auditor/rules/another.md'), 'utf8'),
    '# Keep',
  );
  assert.ok(
    !(await readdir(path.join(root, '.auditor'))).includes('guides.lock'),
  );
});

test('missing guide and invalid registry fail visibly instead of silently ignoring instructions', async (t) => {
  const { root, config, source } = await fixture(t);
  const guide = await addGuide(root, source, 'team.tests', ['**/*']);
  await rm(path.join(root, guide.path));
  await assert.rejects(
    runCli(['check', '--config', config], { log: () => {} }),
    /Falta la guía/,
  );
  await writeFile(
    path.join(root, '.auditor/guides.yaml'),
    'schema-version: 1\nguides: []\nguides: []\n',
  );
  await assert.rejects(loadGuides(root), /YAML inválido/);
});

test('rejects traversal, empty or binary guides, and unsupported options', async (t) => {
  const { root, source, config } = await fixture(t);
  await assert.rejects(addGuide(root, source, '../escape', ['**/*']));
  await assert.rejects(addGuide(root, source, 'valid', ['../**']));
  await writeFile(source, '  \n');
  await assert.rejects(addGuide(root, source, 'valid', ['**/*']), /vacía/);
  await writeFile(source, Buffer.from([0xff, 0x00]));
  await assert.rejects(addGuide(root, source, 'valid', ['**/*']), /UTF-8/);
  for (const args of [
    ['rules', 'add', source],
    ['rules', 'list', '--id', 'x'],
    ['rules', 'add', source, '--id', 'x', '--format', 'html'],
    ['check', '--include', '**/*'],
  ])
    await assert.rejects(
      runCli([...args, '--config', config], { log: () => {} }),
    );
});

test('managed directories cannot redirect imports outside the project', async (t) => {
  const { root, source } = await fixture(t);
  const outside = await mkdtemp(path.join(tmpdir(), 'auditor-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(
    outside,
    path.join(root, '.auditor'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(
    addGuide(root, source, 'team.tests', ['**/*']),
    /enlaces simbólicos/,
  );
  assert.deepEqual(await readdir(outside), []);
});

test('existing import lock prevents concurrent mutation without deleting the lock', async (t) => {
  const { root, source } = await fixture(t);
  await mkdir(path.join(root, '.auditor'));
  await writeFile(path.join(root, '.auditor/guides.lock'), 'busy');
  await assert.rejects(
    addGuide(root, source, 'team.tests', ['**/*']),
    /EEXIST/,
  );
  assert.equal(
    await readFile(path.join(root, '.auditor/guides.lock'), 'utf8'),
    'busy',
  );
  assert.deepEqual(await loadGuides(root), []);
});
