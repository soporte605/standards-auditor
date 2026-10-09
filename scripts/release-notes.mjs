// Extrae las notas de una versión del CHANGELOG para la Release de GitHub.
// Uso: node scripts/release-notes.mjs <X.Y.Z[-pre]> [CHANGELOG.md]
// Falla si la versión no coincide con package.json o la sección falta o está vacía.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function extractNotes(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const heading = `## [${version}]`;
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1)
    throw new Error(`CHANGELOG.md no tiene la sección ${heading}.`);
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## \[/.test(line) || /^\[[^\]]+\]: /.test(line)) break;
    body.push(line);
  }
  const notes = body.join('\n').trim();
  if (!notes) throw new Error(`La sección ${heading} está vacía.`);
  return notes;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [version, file = 'CHANGELOG.md'] = process.argv.slice(2);
  if (!version) {
    console.error(
      'Uso: node scripts/release-notes.mjs <versión> [CHANGELOG.md]',
    );
    process.exit(2);
  }
  try {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    if (manifest.version !== version)
      throw new Error(
        `La versión ${version} no coincide con package.json (${manifest.version}).`,
      );
    console.log(extractNotes(readFileSync(file, 'utf8'), version));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
