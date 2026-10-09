import assert from 'node:assert/strict';
import test from 'node:test';
import { extractNotes } from '../scripts/release-notes.mjs';

const changelog = `# Changelog

## [Sin publicar]

### Añadido

- Algo pendiente.

## [0.2.0] - 2026-10-10

### Añadido

- Nueva regla (#3, gracias a @alguien).

### Corregido

- Un error.

## [0.1.0] - 2026-10-01

### Añadido

- Primera versión.

[Sin publicar]: https://example.test/compare/v0.2.0...HEAD
[0.2.0]: https://example.test/compare/v0.1.0...v0.2.0
`;

test('extracts only the requested version, without neighbours or link references', () => {
  const notes = extractNotes(changelog, '0.2.0');
  assert.match(notes, /Nueva regla/);
  assert.match(notes, /Un error/);
  assert.doesNotMatch(notes, /Primera versión|Algo pendiente|example\.test/);
});

test('the last section stops at the link references', () => {
  const notes = extractNotes(changelog, '0.1.0');
  assert.equal(notes, '### Añadido\n\n- Primera versión.');
});

test('missing or empty sections fail instead of publishing blank notes', () => {
  assert.throws(() => extractNotes(changelog, '9.9.9'), /no tiene la sección/);
  assert.throws(
    () =>
      extractNotes('## [1.0.0] - 2026-01-01\n\n## [0.9.0]\n\n- x\n', '1.0.0'),
    /vacía/,
  );
});

test('CRLF changelogs (Windows checkouts) are handled', () => {
  assert.match(
    extractNotes(changelog.replace(/\n/g, '\r\n'), '0.2.0'),
    /Nueva regla/,
  );
});
