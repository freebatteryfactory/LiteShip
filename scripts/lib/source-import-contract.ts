/** Structural import-contract scanner for source-owned entrypoints. @module */

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
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

function sourceSpecifiers(path: string): readonly string[] {
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
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

/** Normalize one source path for deterministic receipts on Windows and POSIX. */
export function normalizeSourcePath(path: string): string {
  return path.replaceAll('\\', '/');
}

/** Parse the static runtime import/export specifiers for one source entrypoint. */
export function sourceRuntimeImports(root: string, entry: string): readonly string[] {
  return [...runtimeSpecifiers(resolve(root, entry))].sort((left, right) => left.localeCompare(right));
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const unresolved = resolve(dirname(importer), specifier);
  const extension = extname(unresolved);
  const candidates = [
    ...(extension === '.js' ? [unresolved.slice(0, -3) + '.ts', unresolved.slice(0, -3) + '.tsx'] : []),
    ...(extension === '.mjs' ? [unresolved.slice(0, -4) + '.mts'] : []),
    ...(extension === '.cjs' ? [unresolved.slice(0, -4) + '.cts'] : []),
    ...(extension === ''
      ? [
          `${unresolved}.ts`,
          `${unresolved}.tsx`,
          `${unresolved}.mts`,
          `${unresolved}.cts`,
          resolve(unresolved, 'index.ts'),
          resolve(unresolved, 'index.tsx'),
          resolve(unresolved, 'index.mts'),
          resolve(unresolved, 'index.cts'),
        ]
      : []),
    unresolved,
  ];
  const source = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return source === undefined ? null : realpathSync.native(source);
}

/** Recursively enumerate every TypeScript source file below a repo-owned directory. */
export function sourceFilesUnder(root: string, directory: string): readonly string[] {
  const rootPath = realpathSync.native(resolve(root));
  const rootPrefix = `${rootPath}${sep}`;
  const start = realpathSync.native(resolve(rootPath, directory));
  if (start !== rootPath && !start.startsWith(rootPrefix)) {
    throw new Error(`source directory escapes repository root: ${directory}`);
  }
  const queue = [start];
  const files: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) queue.push(path);
      else if (entry.isFile() && /\.[cm]?tsx?$/u.test(entry.name)) files.push(path);
    }
  }
  return files
    .map((path) => normalizeSourcePath(relative(rootPath, path)))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Enumerate the exact static source closure of one or more executable/public roots.
 *
 * Unlike {@link sourceRuntimeImports}, this includes type-only edges: a private
 * declaration helper is inhabited when it contributes to emitted declarations even
 * when it has no runtime edge. Literal dynamic imports are included; computed imports
 * remain deliberately opaque rather than guessed.
 */
export function sourceImportClosure(root: string, entries: readonly string[]): readonly string[] {
  const rootPath = realpathSync.native(resolve(root));
  const rootPrefix = `${rootPath}${sep}`;
  const queue = entries.map((entry) => {
    const path = resolve(rootPath, entry);
    return existsSync(path) && statSync(path).isFile() ? realpathSync.native(path) : path;
  });
  const visited = new Set<string>();

  while (queue.length > 0) {
    const importer = queue.shift()!;
    if (visited.has(importer)) continue;
    if (importer !== rootPath && !importer.startsWith(rootPrefix)) continue;
    visited.add(importer);
    for (const specifier of sourceSpecifiers(importer)) {
      const dependency = resolveSourceImport(importer, specifier);
      if (dependency !== null && dependency.startsWith(rootPrefix)) queue.push(dependency);
    }
  }

  return [...visited]
    .map((path) => normalizeSourcePath(relative(rootPath, path)))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Report every source below `directories` that no admitted root reaches.
 *
 * Privacy markers do not excuse an orphan: callers select the private scopes,
 * while this function compares their complete recursive census with the actual
 * static import graph.
 */
export function unreachableSourceFiles(
  root: string,
  entries: readonly string[],
  directories: readonly string[],
): readonly string[] {
  const reachable = new Set(sourceImportClosure(root, entries));
  return [...new Set(directories.flatMap((directory) => sourceFilesUnder(root, directory)))]
    .filter((file) => !reachable.has(file))
    .sort((left, right) => left.localeCompare(right));
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
