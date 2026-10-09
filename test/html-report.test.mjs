import assert from 'node:assert/strict';
import test from 'node:test';
import { renderHtml } from '../dist/html-report.js';

test('HTML escapes project names, paths, messages, rules and notices as text', () => {
  const payload = '</script><img src=x onerror="alert(1)">&';
  const html = renderHtml(
    {
      schemaVersion: 1,
      ruleResults: [],
      findings: [
        { ruleId: payload, severity: 'error', message: payload, path: payload },
      ],
      summary: { errors: 1, warnings: 0, evaluatedRules: 1, analyzedFiles: 1 },
      notices: [payload],
    },
    { project: payload, generatedAt: new Date('2026-10-06T12:00:00Z') },
  );
  assert.ok(!html.includes(payload));
  assert.match(
    html,
    /&lt;\/script&gt;&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;/,
  );
  assert.equal((html.match(/<script>/g) ?? []).length, 1);
  assert.ok(!html.includes('<script src='));
});

test('zero enabled rules are not presented as a successful audit', () => {
  const html = renderHtml(
    {
      schemaVersion: 1,
      ruleResults: [],
      findings: [],
      summary: { errors: 0, warnings: 0, evaluatedRules: 0, analyzedFiles: 0 },
      notices: [],
    },
    { project: 'Empty project', generatedAt: new Date('2026-10-06T12:00:00Z') },
  );
  assert.match(html, /Sin reglas habilitadas/);
  assert.ok(!html.includes('Sin incumplimientos detectados'));
});
