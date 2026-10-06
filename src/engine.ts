import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import ts from 'typescript';
import type { ProjectConfig, Rule } from './config.js';

export interface Finding {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  path: string;
  line?: number;
  column?: number;
}
export interface Report {
  schemaVersion: 1;
  findings: Finding[];
  summary: {
    errors: number;
    warnings: number;
    evaluatedRules: number;
    analyzedFiles: number;
  };
  notices: string[];
}

function scanTypeScript(source: string, file: string, rule: Rule): Finding[] {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const findings: Finding[] = [];
  function add(position: number): void {
    const location = ast.getLineAndCharacterOfPosition(position);
    findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.description,
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
  const notices: string[] = [];
  const analyzed = new Set<string>();
  for (const rule of config.rules) {
    if (rule.detector === 'required-files') {
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
  return {
    schemaVersion: 1,
    findings,
    summary: {
      errors: findings.filter((item) => item.severity === 'error').length,
      warnings: findings.filter((item) => item.severity === 'warning').length,
      evaluatedRules: config.rules.length,
      analyzedFiles: analyzed.size,
    },
    notices,
  };
}
