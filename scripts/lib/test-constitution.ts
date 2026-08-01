/** AST-backed inventory of brittle test-harness dependencies. @module */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';

export type TestDebtKind = 'ambient-clock' | 'real-timer' | 'source-byte-oracle' | 'unanchored-text-slice';

export interface TestDebtFinding {
  readonly file: string;
  readonly kind: TestDebtKind;
  readonly line: number;
}

export interface TestConstitutionBaseline {
  readonly schemaVersion: 2;
  readonly files: Readonly<Record<string, Partial<Record<TestDebtKind, number>>>>;
}

export interface TestConstitutionRegression {
  readonly file: string;
  readonly kind: TestDebtKind;
  readonly prior: number;
  readonly current: number;
}

const DETERMINISTIC_ROOTS = ['tests/unit', 'tests/property', 'tests/component', 'tests/regression', 'tests/support'];

function normalize(path: string): string {
  return path.split(sep).join('/');
}

function filesUnder(root: string): readonly string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.[cm]?tsx?$/u.test(entry.name)) files.push(path);
    }
  };
  visit(root);
  return files;
}

function propertyCall(node: ts.CallExpression, object: string, property: string): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === object &&
    node.expression.name.text === property
  );
}

function identifierCall(node: ts.CallExpression, name: string): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === name;
}

const RAW_TEXT_OPERATIONS = new Set([
  'endsWith',
  'includes',
  'indexOf',
  'match',
  'matchAll',
  'replace',
  'replaceAll',
  'search',
  'split',
  'startsWith',
]);
const RAW_TEXT_MATCHERS = new Set(['toContain', 'toMatch', 'toMatchInlineSnapshot', 'toMatchSnapshot']);

function utf8Read(node: ts.CallExpression): boolean {
  if (!identifierCall(node, 'readFileSync')) return false;
  const encoding = node.arguments[1];
  return (
    encoding !== undefined &&
    ts.isStringLiteralLike(encoding) &&
    (encoding.text.toLowerCase() === 'utf8' || encoding.text.toLowerCase() === 'utf-8')
  );
}

function returnedExpression(node: ts.FunctionLikeDeclaration): ts.Expression | undefined {
  if (node.body === undefined) return undefined;
  if (!ts.isBlock(node.body)) return node.body;
  const returns = node.body.statements.filter(ts.isReturnStatement);
  return returns.length === 1 ? returns[0]?.expression : undefined;
}

/**
 * Find raw file-text values without confusing semantic IO with source coupling.
 * JSON parsing, archive-byte comparison, and calls into real validators are not
 * debt. Assertions and string surgery over the unparsed text are.
 */
function sourceTextOracles(ast: ts.SourceFile): readonly ts.CallExpression[] {
  const readerFunctions = new Set<string>();
  const taintedBindings = new Set<string>();
  const directRead = (node: ts.Expression): boolean => ts.isCallExpression(node) && utf8Read(node);

  const collectReaders = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      const returned = returnedExpression(node);
      if (returned !== undefined && directRead(returned)) readerFunctions.add(node.name.text);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const returned = returnedExpression(node.initializer);
      if (returned !== undefined && directRead(returned)) readerFunctions.add(node.name.text);
    }
    ts.forEachChild(node, collectReaders);
  };
  collectReaders(ast);

  const tainted = (node: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(node)) return tainted(node.expression);
    if (ts.isIdentifier(node)) return taintedBindings.has(node.text);
    return (
      ts.isCallExpression(node) &&
      (utf8Read(node) || (ts.isIdentifier(node.expression) && readerFunctions.has(node.expression.text)))
    );
  };

  // Resolve simple aliases to a fixed point so helper-local naming does not
  // decide whether the same raw-text assertion is caught.
  let changed = true;
  while (changed) {
    changed = false;
    const collectBindings = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        tainted(node.initializer) &&
        !taintedBindings.has(node.name.text)
      ) {
        taintedBindings.add(node.name.text);
        changed = true;
      }
      ts.forEachChild(node, collectBindings);
    };
    collectBindings(ast);
  }

  const findings: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const operation = node.expression.name.text;
      if (RAW_TEXT_OPERATIONS.has(operation) && tainted(receiver)) findings.push(node);
      if (
        RAW_TEXT_MATCHERS.has(operation) &&
        ts.isCallExpression(receiver) &&
        identifierCall(receiver, 'expect') &&
        receiver.arguments[0] !== undefined &&
        tainted(receiver.arguments[0])
      ) {
        findings.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings;
}

function isIndexSearch(node: ts.Expression): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    (node.expression.name.text === 'indexOf' || node.expression.name.text === 'search')
  );
}

function isMinusOne(node: ts.Expression): boolean {
  return (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand) &&
    node.operand.text === '1'
  );
}

function containingFunctionOrFile(node: ts.Node, ast: ts.SourceFile): ts.Node {
  let current = node.parent;
  while (current !== undefined) {
    if (ts.isFunctionLike(current)) return current;
    current = current.parent;
  }
  return ast;
}

function indexBinding(scope: ts.Node, name: string): ts.CallExpression | undefined {
  let found: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined &&
      isIndexSearch(node.initializer)
    ) {
      found = node.initializer;
      return;
    }
    if (node !== scope && ts.isFunctionLike(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return found;
}

function identifierHasIndexGuard(scope: ts.Node, name: string): boolean {
  let guarded = false;
  const isNamedIdentifier = (node: ts.Node): boolean => ts.isIdentifier(node) && node.text === name;
  const visit = (node: ts.Node): void => {
    if (guarded) return;
    if (
      ts.isBinaryExpression(node) &&
      ((isNamedIdentifier(node.left) && isMinusOne(node.right)) ||
        (isMinusOne(node.left) && isNamedIdentifier(node.right)))
    ) {
      guarded = true;
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'toBeGreaterThan' || node.expression.name.text === 'toBeGreaterThanOrEqual') &&
      ts.isCallExpression(node.expression.expression) &&
      identifierCall(node.expression.expression, 'expect') &&
      node.expression.expression.arguments[0] !== undefined &&
      isNamedIdentifier(node.expression.expression.arguments[0])
    ) {
      guarded = true;
      return;
    }
    if (node !== scope && ts.isFunctionLike(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return guarded;
}

/**
 * THE CLASS RULE — ANCHOR: slice/substring bounds drawn directly from indexOf
 * or search, including simple variable aliases. ALLOWLIST: only a variable
 * whose containing function proves the sentinel impossible with a -1 check or
 * a non-negative expectation. Direct search expressions and every
 * unclassified alias fail closed as debt: an absent anchor must never widen a
 * test oracle to unrelated text.
 */
function unanchoredTextSlices(ast: ts.SourceFile): readonly ts.CallExpression[] {
  const findings: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'slice' || node.expression.name.text === 'substring')
    ) {
      const scope = containingFunctionOrFile(node, ast);
      const unguarded = node.arguments.some((argument) => {
        if (isIndexSearch(argument)) return true;
        return (
          ts.isIdentifier(argument) &&
          indexBinding(scope, argument.text) !== undefined &&
          !identifierHasIndexGuard(scope, argument.text)
        );
      });
      if (unguarded) findings.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings;
}

/** Scan deterministic test lanes while ignoring comments and string literals. */
export function scanTestConstitution(cwd: string): readonly TestDebtFinding[] {
  const findings: TestDebtFinding[] = [];
  for (const relativeRoot of DETERMINISTIC_ROOTS) {
    for (const absolute of filesUnder(join(cwd, relativeRoot))) {
      const file = normalize(relative(cwd, absolute));
      const source = readFileSync(absolute, 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const add = (kind: TestDebtKind, node: ts.Node): void => {
        findings.push({ file, kind, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 });
      };
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          if (identifierCall(node, 'setTimeout')) add('real-timer', node);
          if (propertyCall(node, 'Date', 'now') || propertyCall(node, 'performance', 'now')) add('ambient-clock', node);
        }
        if (
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'Date' &&
          (node.arguments?.length ?? 0) === 0
        ) {
          add('ambient-clock', node);
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
      for (const oracle of sourceTextOracles(ast)) add('source-byte-oracle', oracle);
      for (const slice of unanchoredTextSlices(ast)) add('unanchored-text-slice', slice);
    }
  }
  return findings.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.kind.localeCompare(right.kind) || left.line - right.line,
  );
}

/** Collapse locations into a line-number-independent per-file ratchet. */
export function baselineFromTestFindings(findings: readonly TestDebtFinding[]): TestConstitutionBaseline {
  const files: Record<string, Partial<Record<TestDebtKind, number>>> = {};
  for (const finding of findings) {
    const counts = (files[finding.file] ??= {});
    counts[finding.kind] = (counts[finding.kind] ?? 0) + 1;
  }
  return { schemaVersion: 2, files };
}

/** Any new file/kind occurrence or increased count is a regression. */
export function testConstitutionRegressions(
  findings: readonly TestDebtFinding[],
  baseline: TestConstitutionBaseline,
): readonly TestConstitutionRegression[] {
  const current = baselineFromTestFindings(findings);
  const regressions: TestConstitutionRegression[] = [];
  for (const [file, counts] of Object.entries(current.files)) {
    for (const [kind, count] of Object.entries(counts) as [TestDebtKind, number][]) {
      const prior = baseline.files[file]?.[kind] ?? 0;
      if (count > prior) regressions.push({ file, kind, prior, current: count });
    }
  }
  return regressions.sort((left, right) => left.file.localeCompare(right.file) || left.kind.localeCompare(right.kind));
}
