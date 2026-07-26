/** Structural import-contract scanner for source-owned entrypoints. @module */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import ts from 'typescript';

export interface ForbiddenImportFinding {
  readonly specifier: string;
  readonly reason: string;
}

export interface ForbiddenImportClosureFinding extends ForbiddenImportFinding {
  readonly importer: string;
}

function runtimeSpecifiers(path: string): readonly string[] {
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.importClause?.isTypeOnly) specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]!)
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return specifiers;
}

/** Parse the static runtime import/export specifiers for one source entrypoint. */
export function sourceRuntimeImports(root: string, entry: string): readonly string[] {
  return runtimeSpecifiers(resolve(root, entry)).sort((left, right) => left.localeCompare(right));
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const unresolved = resolve(dirname(importer), specifier);
  const extension = extname(unresolved);
  const candidates = [
    unresolved,
    ...(extension === '.js' ? [unresolved.slice(0, -3) + '.ts'] : []),
    ...(extension === '.mjs' ? [unresolved.slice(0, -4) + '.mts'] : []),
    ...(extension === '.cjs' ? [unresolved.slice(0, -4) + '.cts'] : []),
    ...(extension === '' ? [`${unresolved}.ts`, resolve(unresolved, 'index.ts')] : []),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
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

/**
 * Walk the runtime import closure of a source entrypoint and report forbidden
 * imports at the file that introduces them. Type-only edges are deliberately
 * excluded because they do not participate in clean-checkout execution.
 */
export function forbiddenSourceImportClosure(
  root: string,
  entry: string,
  rules: readonly { readonly pattern: RegExp; readonly reason: string }[],
): readonly ForbiddenImportClosureFinding[] {
  const rootPath = resolve(root);
  const queue = [resolve(rootPath, entry)];
  const visited = new Set<string>();
  const findings: ForbiddenImportClosureFinding[] = [];

  while (queue.length > 0) {
    const importer = queue.shift()!;
    if (visited.has(importer)) continue;
    visited.add(importer);

    for (const specifier of runtimeSpecifiers(importer)) {
      for (const rule of rules) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(specifier)) {
          findings.push({
            importer: importer.slice(rootPath.length + 1).replaceAll('\\', '/'),
            specifier,
            reason: rule.reason,
          });
        }
      }
      const dependency = resolveSourceImport(importer, specifier);
      if (dependency !== null) queue.push(dependency);
    }
  }

  return findings.sort(
    (left, right) =>
      left.importer.localeCompare(right.importer) ||
      left.specifier.localeCompare(right.specifier) ||
      left.reason.localeCompare(right.reason),
  );
}
