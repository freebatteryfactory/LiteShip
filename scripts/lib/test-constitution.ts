/** AST-backed inventory of brittle test-harness dependencies. @module */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';

export type TestDebtKind = 'ambient-clock' | 'real-timer' | 'source-byte-oracle';

export interface TestDebtFinding {
  readonly file: string;
  readonly kind: TestDebtKind;
  readonly line: number;
}

export interface TestConstitutionBaseline {
  readonly schemaVersion: 1;
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
          if (identifierCall(node, 'readFileSync')) add('source-byte-oracle', node);
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
  return { schemaVersion: 1, files };
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
