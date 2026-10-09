import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import ts from 'typescript';
import type { ProjectConfig, Rule } from './config.js';
import { inspectInventory } from './inventory.js';
import type { Inventory } from './inventory.js';
import { loadGuides } from './guides.js';
import type { Guide } from './guides.js';
import { readCoverage } from './coverage-data.js';
import type { CoverageData } from './coverage-data.js';
import { evaluateCoverage } from './coverage-rules.js';
import type { CoverageEvaluation } from './coverage-rules.js';
import { associateSources, suggestTestPath } from './test-association.js';

export interface Finding {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  path: string;
  line?: number;
  column?: number;
  suggestion?: string;
}
export interface RuleResult {
  ruleId: string;
  severity: 'error' | 'warning';
  detector: Rule['detector'];
  description: string;
  guidance?: string;
  status: 'pass' | 'fail' | 'not-evaluated';
  findings: number;
}
export interface Report {
  schemaVersion: 1;
  findings: Finding[];
  ruleResults: RuleResult[];
  summary: {
    errors: number;
    warnings: number;
    evaluatedRules: number;
    analyzedFiles: number;
    notEvaluated?: number;
    requiredIncomplete?: number;
  };
  notices: string[];
  inventory?: Inventory;
  guides?: Guide[];
  coverageEvaluations?: CoverageEvaluation[];
}

function scanTypeScript(source: string, file: string, rule: Rule): Finding[] {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const findings: Finding[] = [];
  function add(position: number, detail?: string): void {
    const location = ast.getLineAndCharacterOfPosition(position);
    findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      message: detail ? `${rule.description} (${detail})` : rule.description,
      path: file,
      line: location.line + 1,
      column: location.character + 1,
    });
  }
  if (rule.detector === 'typescript-no-any') {
    function visit(node: ts.Node): void {
      if (node.kind === ts.SyntaxKind.AnyKeyword) add(node.getStart(ast));
      ts.forEachChild(node, visit);
    }
    visit(ast);
  } else if (rule.detector === 'typescript-forbidden-api') {
    const identifiers = new Set(rule.identifiers);
    const members = new Set(rule.members);
    const modules = rule.modules ?? [];
    function visit(node: ts.Node): void {
      if (
        ts.isIdentifier(node) &&
        identifiers.has(node.text) &&
        !(
          ts.isPropertyAccessExpression(node.parent) &&
          node.parent.name === node
        )
      )
        add(node.getStart(ast), node.text);
      else if (
        ts.isPropertyAccessExpression(node) &&
        members.has(node.getText(ast))
      )
        add(node.getStart(ast), node.getText(ast));
      else if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const name = node.moduleSpecifier.text;
        if (
          modules.some((item) => name === item || name.startsWith(`${item}/`))
        )
          add(node.getStart(ast), name);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  } else if (rule.detector === 'typescript-no-suppression') {
    // Collect actual comment trivia around AST tokens; strings and template
    // literals containing directive-like text must not become findings.
    const ranges = new Map<number, ts.CommentRange>();
    function visit(node: ts.Node): void {
      for (const range of [
        ...(ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []),
        ...(ts.getTrailingCommentRanges(source, node.getEnd()) ?? []),
      ])
        ranges.set(range.pos, range);
      for (const child of node.getChildren(ast)) visit(child);
    }
    visit(ast);
    for (const range of ranges.values()) {
      const comment = source.slice(range.pos, range.end);
      if (/^\s*(?:\/\/\/?|\/\*+|\*)\s*@ts-(?:ignore|nocheck)\b/m.test(comment))
        add(range.pos);
    }
  }
  return findings;
}

export async function audit(config: ProjectConfig): Promise<Report> {
  const findings: Finding[] = [];
  const guides = await loadGuides(config.root);
  const notices: string[] = guides.map(
    (guide) =>
      `Guía ${guide.id}: ${guide.path}; ámbito ${guide.include.join(', ')}; ${guide.modified ? 'modificada desde la importación' : 'contenido original'}. Instrucciones para revisión, sin evaluación automática.`,
  );
  const analyzed = new Set<string>();
  const coverageEvaluations: CoverageEvaluation[] = [];
  const coverageEvidence = new Map<string, CoverageData>();
  for (const rule of config.rules) {
    if (rule.detector === 'coverage-thresholds') {
      const key = path.resolve(config.root, rule.report);
      const data =
        coverageEvidence.get(key) ??
        (await readCoverage(config.root, rule.report));
      coverageEvidence.set(key, data);
      const evaluations = evaluateCoverage(rule, data);
      coverageEvaluations.push(...evaluations);
      for (const evaluation of evaluations) {
        if (evaluation.status === 'fail')
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: evaluation.message,
            path: rule.report,
          });
        if (evaluation.status === 'not-evaluated')
          notices.push(
            `${rule.id} (${evaluation.metric}): no se pudo evaluar. ${evaluation.message}`,
          );
      }
    } else if (rule.detector === 'tests-exist') {
      const tests = await glob(rule.include, {
        cwd: config.root,
        ignore: config.exclude,
        nodir: true,
        follow: false,
        dot: true,
        posix: true,
      });
      if (!tests.length)
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: `${rule.description} No se encontró ningún archivo de prueba (${rule.include.join(', ')}).`,
          path: '.',
        });
    } else if (rule.detector === 'forbidden-files') {
      const matches = (
        await glob(rule.include, {
          cwd: config.root,
          ignore: config.exclude,
          nodir: true,
          follow: false,
          dot: true,
          posix: true,
        })
      ).sort();
      for (const file of matches)
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.description,
          path: file,
        });
    } else if (rule.detector === 'source-has-test') {
      const sources = await associateSources(config, rule);
      if (!sources.size)
        notices.push(
          `${rule.id}: no hay fuentes en el alcance del inventario.`,
        );
      const missing = [...sources].filter(([, tests]) => !tests.length);
      const covered = sources.size - missing.length;
      const percent = sources.size ? (covered / sources.size) * 100 : 100;
      if (percent < rule.minimum)
        for (const [file] of missing) {
          const suggestion = suggestTestPath(
            file,
            config.inventory['test-patterns'],
          );
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: `${rule.description} Falta una prueba asociada; ${covered} de ${sources.size} fuentes (${Math.round(percent)}%) tienen una y el mínimo es ${rule.minimum}%.`,
            path: file,
            ...(suggestion ? { suggestion } : {}),
          });
        }
    } else if (rule.detector === 'required-files') {
      for (const file of rule.files) {
        let exists = false;
        try {
          exists = (await stat(path.resolve(config.root, file))).isFile();
        } catch (error) {
          if (!(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ))
            throw error;
        }
        if (!exists)
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: `${rule.description} Falta el archivo ${file}.`,
            path: file,
          });
      }
    } else {
      const files = (
        await glob(rule.include, {
          cwd: config.root,
          ignore: config.exclude,
          nodir: true,
          follow: false,
          dot: true,
          posix: true,
        })
      ).sort();
      if (!files.length)
        notices.push(`${rule.id}: ningún archivo coincide con su alcance.`);
      for (const file of files) {
        analyzed.add(file);
        findings.push(
          ...scanTypeScript(
            await readFile(path.resolve(config.root, file), 'utf8'),
            file,
            rule,
          ),
        );
      }
    }
  }
  findings.sort((a, b) =>
    a.path < b.path
      ? -1
      : a.path > b.path
        ? 1
        : (a.line ?? 0) - (b.line ?? 0) ||
          (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0),
  );
  if (coverageEvaluations.length)
    notices.push(
      'Cobertura: se evalúa el total del reporte importado, no el subconjunto del árbol. Su actualidad no está verificada; no se ejecutaron pruebas.',
    );
  const inventory = await inspectInventory(config, coverageEvidence);
  const ruleResults: RuleResult[] = config.rules.map((rule) => {
    const count = findings.filter((item) => item.ruleId === rule.id).length;
    const incomplete = coverageEvaluations.some(
      (item) => item.ruleId === rule.id && item.status === 'not-evaluated',
    );
    return {
      ruleId: rule.id,
      severity: rule.severity,
      detector: rule.detector,
      description: rule.description,
      ...(rule.guidance ? { guidance: rule.guidance } : {}),
      status: count ? 'fail' : incomplete ? 'not-evaluated' : 'pass',
      findings: count,
    };
  });
  return {
    schemaVersion: 1,
    ruleResults,
    ...(guides.length ? { guides } : {}),
    ...(coverageEvaluations.length ? { coverageEvaluations } : {}),
    ...(inventory ? { inventory } : {}),
    findings,
    summary: {
      errors: findings.filter((item) => item.severity === 'error').length,
      warnings: findings.filter((item) => item.severity === 'warning').length,
      evaluatedRules: config.rules.length,
      analyzedFiles: analyzed.size,
      ...(coverageEvaluations.length
        ? {
            notEvaluated: coverageEvaluations.filter(
              (item) => item.status === 'not-evaluated',
            ).length,
            requiredIncomplete: coverageEvaluations.filter(
              (item) =>
                item.status === 'not-evaluated' && item.severity === 'error',
            ).length,
          }
        : {}),
    },
    notices,
  };
}
