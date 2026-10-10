import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { audit } from './engine.js';
import { renderHtml } from './html-report.js';
import { renderText } from './text-report.js';
import { addGuide, loadGuides } from './guides.js';
import { detectProject, suggestedConfig } from './detect.js';

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

export interface CliServices {
  openReport?: (file: string) => Promise<void>;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

export async function runCli(
  args: string[],
  services: CliServices = {},
): Promise<number> {
  const log = services.log ?? console.log;
  const warn = services.warn ?? console.error;
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'V' },
      config: { type: 'string', short: 'c' },
      format: { type: 'string' },
      output: { type: 'string', short: 'o' },
      open: { type: 'boolean' },
      details: { type: 'boolean' },
      id: { type: 'string' },
      include: { type: 'string', multiple: true },
    },
  });
  if (values.help || (positionals.length === 0 && !values.version)) {
    log(`standards-auditor — estándares configurables por equipo

Uso:
  standards-auditor init                  Crear auditor.yaml sin sobrescribirlo
  standards-auditor check                 Mostrar un resumen en consola
  standards-auditor check --details       Mostrar todos los hallazgos
  standards-auditor check --open          Generar HTML y abrirlo
  standards-auditor check --format json   Emitir un reporte JSON
  standards-auditor check --format html   Guardar un reporte HTML visual
  standards-auditor explain <regla>       Explicar una regla habilitada
  standards-auditor rules add <guia.md> --id <id> [--include <glob>]
  standards-auditor rules list            Mostrar guías y ámbitos registrados

Opciones: --config <ruta>, --output <reporte.html> (solo HTML), --help, --version
HTML predeterminado: reports/standards-auditor.html, relativo al directorio actual.
Códigos: 0 sin errores, 1 incumplimientos, 2 fallo operativo o evidencia obligatoria incompleta.
No ejecuta pruebas. rules add conserva una copia Markdown; no activa detectores.
El ámbito predeterminado de una guía es **/*; --include admite repetición.`);
    return 0;
  }
  if (values.version) {
    const metadata: unknown = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    if (!metadata || typeof metadata !== 'object' || !('version' in metadata))
      throw new Error('Versión no disponible');
    log(`standards-auditor ${String(metadata.version)}`);
    return 0;
  }
  const [command, id, ...extra] = positionals;
  if (command === 'rules') {
    if (
      values.format !== undefined ||
      values.output !== undefined ||
      values.open ||
      values.details
    )
      throw new Error('Las opciones de reporte solo se usan con check.');
    const config = await loadConfig(
      path.resolve(values.config ?? 'auditor.yaml'),
    );
    if (id === 'add' && extra.length === 1 && values.id) {
      const guide = await addGuide(
        config.root,
        path.resolve(extra[0]!),
        values.id,
        values.include ?? ['**/*'],
      );
      log(
        `Guía importada: ${guide.id}\nArchivo: ${guide.path}\nÁmbito: ${guide.include.join(', ')}\nSHA-256: ${guide.sha256}\nNo se activaron reglas automáticas.`,
      );
      return 0;
    }
    if (
      id === 'list' &&
      extra.length === 0 &&
      values.id === undefined &&
      values.include === undefined
    ) {
      const guides = await loadGuides(config.root);
      log(
        guides.length
          ? guides
              .map(
                (guide) =>
                  `${guide.id} · ${guide.modified ? 'modificada' : 'original'}\n  ${guide.path}\n  Ámbito: ${guide.include.join(', ')}\n  SHA-256: ${guide.sha256}`,
              )
              .join('\n')
          : 'Sin guías registradas. Usa rules add <guia.md> --id <id>.',
      );
      return 0;
    }
    throw new Error(
      'Usa rules add <guia.md> --id <id> [--include <glob>] o rules list.',
    );
  }
  if (values.id !== undefined || values.include !== undefined)
    throw new Error('--id y --include solo se usan con rules add.');
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
    values.open &&
    (command !== 'check' ||
      (values.format !== undefined && values.format !== 'html'))
  )
    throw new Error(
      '--open se usa con check, sin --format o con --format html.',
    );
  const format = values.open ? 'html' : (values.format ?? 'text');
  if (values.details && (command !== 'check' || format !== 'text'))
    throw new Error(
      '--details solo está disponible con check en formato text.',
    );
  if (values.output !== undefined && (command !== 'check' || format !== 'html'))
    throw new Error(
      '--output solo está disponible con check --format html o check --open.',
    );
  const outputFile = path.resolve(
    values.output ?? 'reports/standards-auditor.html',
  );
  if (format === 'html' && !/\.html?$/i.test(outputFile))
    throw new Error('La ruta de salida debe terminar en .html o .htm.');
  const configFile = path.resolve(values.config ?? 'auditor.yaml');
  if (command === 'init') {
    const detection = await detectProject(path.dirname(configFile));
    const suggested = detection?.typescript ? detection : null;
    await writeFile(
      configFile,
      suggested ? suggestedConfig(suggested) : initialConfig,
      { flag: 'wx' },
    );
    log(
      `Configuración creada: ${configFile}${suggested ? `\nDetectado: TypeScript${suggested.framework ? ` · ${suggested.framework}` : ''}${suggested.runner ? ` · ${suggested.runner}` : ''}. Se activaron los packs typescript-tests, testing${suggested.framework === 'Angular' ? ' y angular' : ''}.` : ''}\nEdita sus paquetes y ejecuta standards-auditor check.`,
    );
    return 0;
  }
  const config = await loadConfig(configFile);
  if (command === 'explain') {
    const rule = config.rules.find((item) => item.id === id);
    if (!rule) throw new Error(`Regla desconocida o deshabilitada: ${id}`);
    log(
      `${rule.id} (${rule.severity})\n${rule.description}\nDetector: ${rule.detector}\nAlcance: ${('files' in rule ? rule.files : 'include' in rule ? rule.include : 'report' in rule ? [rule.report] : (rule.sources ?? config.inventory.sources)).join(', ')}`,
    );
    if (rule.guidance) log(`Cómo cumplirla: ${rule.guidance}`);
    if (rule.detector === 'source-has-test')
      log(
        `Mínimo de fuentes con prueba asociada: ${rule.minimum}%. Fuentes y patrones de prueba se toman de inventory.`,
      );
    if (rule.detector === 'coverage-thresholds')
      log(
        `Mínimos globales (%): ${JSON.stringify(rule.minimum)}\nSe evalúa el total importado; no se ejecutan pruebas ni se verifica su actualidad.`,
      );
    return 0;
  }
  const report = await audit(config);
  if (format === 'html') {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(
      outputFile,
      renderHtml(report, {
        project: path.basename(config.root),
        generatedAt: new Date(),
      }),
      'utf8',
    );
    log(renderText(report, path.basename(config.root), false, false));
    log(`Reporte HTML: ${outputFile}`);
    if (values.open) {
      try {
        const openReport =
          services.openReport ??
          (async (file: string) => {
            const { default: open, apps } = await import('open');
            await open(file, { app: { name: apps.browser } });
          });
        await openReport(outputFile);
      } catch {
        warn(
          `No se pudo abrir el navegador. El reporte está guardado en ${outputFile}`,
        );
      }
    }
  } else if (format === 'json') log(JSON.stringify(report, null, 2));
  else
    log(
      renderText(report, path.basename(config.root), Boolean(values.details)),
    );
  return report.summary.requiredIncomplete ? 2 : report.summary.errors ? 1 : 0;
}
