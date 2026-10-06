#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { audit } from './engine.js';
import { renderHtml } from './html-report.js';

const initialConfig = `# Activa solo los paquetes que correspondan a tu proyecto.
schema-version: 1
packs:
  - builtin:docs
  # - builtin:typescript-tests
  # - ./rules/team.yaml
exclude: []
rules: {}
inventory:
  enabled: true
  # Ajusta include, sources y test-patterns a las convenciones de tu equipo.
  # coverage:
  #   report: coverage/coverage-summary.json
  #   minimum-lines: 85
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'V' },
      config: { type: 'string', short: 'c' },
      format: { type: 'string' },
      output: { type: 'string', short: 'o' },
    },
  });
  if (values.help || (positionals.length === 0 && !values.version)) {
    console.log(`standards-auditor — estándares configurables por equipo

Uso:
  standards-auditor init                  Crear auditor.yaml sin sobrescribirlo
  standards-auditor check                 Auditar el proyecto
  standards-auditor check --format json   Emitir un reporte JSON
  standards-auditor check --format html   Guardar un reporte HTML visual
  standards-auditor explain <regla>       Explicar una regla habilitada

Opciones: --config <ruta>, --output <reporte.html> (solo HTML), --help, --version
HTML predeterminado: reports/standards-auditor.html, relativo al directorio actual.
Códigos: 0 sin errores, 1 incumplimientos, 2 error de configuración o ejecución.
No ejecuta pruebas. Solo escribe el reporte cuando se solicita HTML.`);
    return 0;
  }
  if (values.version) {
    const metadata: unknown = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    if (!metadata || typeof metadata !== 'object' || !('version' in metadata))
      throw new Error('Versión no disponible');
    console.log(`standards-auditor ${String(metadata.version)}`);
    return 0;
  }
  const [command, id, ...extra] = positionals;
  if (
    !['init', 'check', 'explain'].includes(command ?? '') ||
    extra.length ||
    (command === 'explain' ? !id : id !== undefined)
  )
    throw new Error('Comando inválido. Consulta --help.');
  if (
    values.format !== undefined &&
    (command !== 'check' || !['text', 'json', 'html'].includes(values.format))
  ) {
    throw new Error('Usa --format text, json o html con check.');
  }
  if (
    values.output !== undefined &&
    (command !== 'check' || values.format !== 'html')
  )
    throw new Error('--output solo está disponible con check --format html.');
  const outputFile = path.resolve(
    values.output ?? 'reports/standards-auditor.html',
  );
  if (values.format === 'html' && !/\.html?$/i.test(outputFile))
    throw new Error('La ruta de salida debe terminar en .html o .htm.');
  const configFile = path.resolve(values.config ?? 'auditor.yaml');
  if (command === 'init') {
    await writeFile(configFile, initialConfig, { flag: 'wx' });
    console.log(
      `Configuración creada: ${configFile}\nEdita sus paquetes y ejecuta standards-auditor check.`,
    );
    return 0;
  }
  const config = await loadConfig(configFile);
  if (command === 'explain') {
    const rule = config.rules.find((item) => item.id === id);
    if (!rule) throw new Error(`Regla desconocida o deshabilitada: ${id}`);
    console.log(
      `${rule.id} (${rule.severity})\n${rule.description}\nDetector: ${rule.detector}\nAlcance: ${('files' in rule ? rule.files : rule.include).join(', ')}`,
    );
    return 0;
  }
  const report = await audit(config);
  if (values.format === 'html') {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(
      outputFile,
      renderHtml(report, {
        project: path.basename(config.root),
        generatedAt: new Date(),
      }),
      'utf8',
    );
    console.log(
      `Reporte HTML: ${outputFile}\nResultado: ${report.summary.errors} errores, ${report.summary.warnings} advertencias.`,
    );
  } else if (values.format === 'json')
    console.log(JSON.stringify(report, null, 2));
  else {
    for (const item of report.findings) {
      console.log(
        `${item.severity === 'error' ? 'ERROR' : 'AVISO'} ${item.path}${item.line ? `:${item.line}:${item.column}` : ''} [${item.ruleId}] ${item.message}`,
      );
    }
    for (const notice of report.notices) console.log(`NOTA ${notice}`);
    if (report.inventory) {
      const inventory = report.inventory;
      console.log(
        `Inventario informativo: ${inventory.summary.withTests} fuentes con test asociado; ${inventory.summary.withoutTests} sin test asociado. Cobertura: ${inventory.coverage.status === 'not-configured' ? 'reporte no configurado' : inventory.coverage.status === 'missing' ? 'reporte no encontrado' : 'reporte disponible'}.`,
      );
      if (inventory.truncated)
        console.log(
          `NOTA Inventario limitado a ${inventory.files.length} de ${inventory.totalFiles} archivos.`,
        );
    }
    console.log(
      `Resultado: ${report.summary.errors} errores, ${report.summary.warnings} advertencias. ${report.summary.evaluatedRules} reglas habilitadas; ${report.summary.analyzedFiles} archivos analizados por detectores TypeScript.`,
    );
  }
  return report.summary.errors ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(
    `No se pudo completar la operación: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
}
