/** Structural import-contract scanner for source-owned entrypoints. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export interface ForbiddenImportFinding {
  readonly specifier: string;
  readonly reason: string;
}

/**
 * Inspect static imports without executing or building the entrypoint.
 * This is the reusable owner for clean-checkout and host-free import laws.
 */
export function forbiddenSourceImports(
  root: string,
  entry: string,
  rules: readonly { readonly pattern: RegExp; readonly reason: string }[],
): readonly ForbiddenImportFinding[] {
  const path = resolve(root, entry);
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const findings: ForbiddenImportFinding[] = [];
  const inspect = (specifier: string): void => {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(specifier)) findings.push({ specifier, reason: rule.reason });
    }
  };
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      inspect(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]!)
    ) {
      inspect(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings.sort(
    (left, right) => left.specifier.localeCompare(right.specifier) || left.reason.localeCompare(right.reason),
  );
}
