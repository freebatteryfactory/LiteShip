/**
 * Meta gate — every runtime @liteship/* package carries a dedicated error-contract suite.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { repoRoot } from '../../../vitest.shared.ts';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';

const EXCLUDED_PACKAGES = new Set([
  '@liteship/error',
  '@liteship/gauntlet',
  '@liteship/audit',
  '@liteship/command',
  '@liteship/cli',
  '@liteship/mcp-server',
  '@liteship/_spine',
]);

function runtimePackageNames(): string[] {
  const packagesDir = resolve(repoRoot, 'packages');
  const names: string[] = [];
  for (const dir of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; private?: boolean };
    if (!pkg.name?.startsWith('@liteship/')) continue;
    if (EXCLUDED_PACKAGES.has(pkg.name)) continue;
    names.push(pkg.name);
  }
  return names.sort();
}

function pkgDirName(pkgName: string): string {
  return pkgName.replace('@liteship/', '');
}

function errorContractSuites(pkgName: string): readonly string[] {
  const dir = resolve(repoRoot, 'tests/unit', pkgDirName(pkgName));
  if (!existsSync(dir)) return [];
  // Recurse: the suite may live directly under the package dir or in a domain
  // subdirectory (e.g. tests/unit/core/authoring/error-contract.test.ts).
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): readonly string[] => {
    if (entry.isDirectory()) return errorContractSuites(join(pkgDirName(pkgName), entry.name));
    return /error-contract.*\.test\.ts$/.test(entry.name) ? [join(dir, entry.name)] : [];
  });
}

function rootIdentifier(expression: ts.Expression): string | undefined {
  let current = expression;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current.text : undefined;
}

function isTestCallback(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
  const parent = node.parent;
  if (!ts.isCallExpression(parent)) return false;
  const callee = parent.expression;
  return (
    (ts.isIdentifier(callee) && (callee.text === 'it' || callee.text === 'test')) ||
    (ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      (callee.expression.text === 'it' || callee.expression.text === 'test'))
  );
}

const FAILURE_MATCHERS = new Set([
  'rejects',
  'toBeNull',
  'toBeUndefined',
  'toThrow',
  'toThrowError',
  'unreachable',
]);
const FAILURE_FIELDS = new Set([
  'code',
  'diagnostic',
  'diagnostics',
  'error',
  'errors',
  'events',
  'issue',
  'issues',
  'severity',
  'warning',
  'warnings',
]);

/**
 * True when a real test callback executes an imported owner operation and observes
 * a refusal/degraded result. Comments, titles, empty suites, and happy-only value
 * assertions cannot satisfy the contract.
 */
export function hasExecutableFailureProof(sourceText: string): boolean {
  const source = ts.createSourceFile('error-contract.test.ts', sourceText, ts.ScriptTarget.Latest, true);
  const importedOperations = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text === 'vitest') continue;
    const clause = statement.importClause;
    if (clause.name !== undefined) importedOperations.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) importedOperations.add(bindings.name.text);
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) importedOperations.add(element.name.text);
    }
  }

  let proven = false;
  const inspectCallback = (callback: ts.ArrowFunction | ts.FunctionExpression): void => {
    let executesOwner = false;
    let observesFailure = false;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const root = rootIdentifier(node.expression);
        if (root !== undefined && importedOperations.has(root)) executesOwner = true;
      }
      if (ts.isPropertyAccessExpression(node)) {
        if (FAILURE_MATCHERS.has(node.name.text) || FAILURE_FIELDS.has(node.name.text)) observesFailure = true;
      }
      if (
        ts.isPropertyAssignment(node) &&
        ((ts.isIdentifier(node.name) && FAILURE_FIELDS.has(node.name.text)) ||
          (ts.isStringLiteral(node.name) && FAILURE_FIELDS.has(node.name.text)))
      ) {
        observesFailure = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(callback.body);
    if (executesOwner && observesFailure) proven = true;
  };

  const visit = (node: ts.Node): void => {
    if (!proven && isTestCallback(node)) inspectCallback(node);
    if (!proven) ts.forEachChild(node, visit);
  };
  visit(source);
  return proven;
}

describe('error-contract obligation — every runtime @liteship/* package', () => {
  it('names only real catalog packages in the exclusion policy', () => {
    const catalogNames = new Set(PACKAGE_CATALOG.map((record) => record.name));
    expect([...EXCLUDED_PACKAGES].filter((name) => !catalogNames.has(name))).toEqual([]);
  });

  it('has tests/unit/<pkg>/error-contract.test.ts (or *error-contract*.test.ts)', () => {
    const missing = runtimePackageNames().filter((name) => errorContractSuites(name).length === 0);
    expect(missing, `packages missing error-contract suite: ${missing.join(', ')}`).toEqual([]);
  });

  it('every package error contract executes an owner failure or degraded path', () => {
    const unproven = runtimePackageNames().filter((name) =>
      errorContractSuites(name).every((path) => !hasExecutableFailureProof(readFileSync(path, 'utf8'))),
    );
    expect(unproven, `packages with filename-only or happy-only error contracts: ${unproven.join(', ')}`).toEqual([]);
  });

  it('rejects empty, comment-only, and happy-only counterfeit suites', () => {
    expect(hasExecutableFailureProof("describe('empty', () => {});")).toBe(false);
    expect(
      hasExecutableFailureProof(
        "import { compile } from '@liteship/compiler';\n// compile() rejects with error.code\nit('happy', () => expect(compile('ok')).toBe('ok'));",
      ),
    ).toBe(false);
    expect(
      hasExecutableFailureProof(
        "import { compile } from '@liteship/compiler';\nit('negative', () => expect(() => compile('bad')).toThrow());",
      ),
    ).toBe(true);
  });
});
