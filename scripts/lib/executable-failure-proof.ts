/**
 * Exact executable binding for one authored public failure contract.
 *
 * This consumes the same statically-resolved Vitest title topology as the
 * traceability ledger. A path, title, or prose fragment alone never proves a
 * failure: the exact callback must invoke the declared imported operation and
 * assert both the registered diagnostic identity and the refused output.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { scanResolvedTestTitles } from '../../packages/cli/src/internal/traceability.js';

export interface DiagnosticOmissionObservation {
  readonly kind: 'diagnostic-and-output-omission';
  readonly code: string;
  readonly outputField: string;
}

export interface ExecutableFailureProofContract {
  readonly test: `tests/${string}.test.ts::${string}`;
  readonly importSource: string;
  readonly operation: string;
  readonly observation: DiagnosticOmissionObservation;
}

export interface ExecutableFailureProofFinding {
  readonly kind: 'missing-proof' | 'ambiguous-proof' | 'wrong-operation' | 'wrong-observation';
  readonly detail: string;
}

interface ParsedProofRef {
  readonly file: string;
  readonly title: string;
}

function parseProofRef(ref: string): ParsedProofRef | undefined {
  const separator = ref.indexOf('::');
  if (separator <= 0 || separator + 2 >= ref.length) return undefined;
  return { file: ref.slice(0, separator), title: ref.slice(separator + 2) };
}

function expressionPath(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const parent = expressionPath(expression.expression);
    return parent === undefined ? undefined : `${parent}.${expression.name.text}`;
  }
  if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
    const parent = expressionPath(expression.expression);
    return parent === undefined ? undefined : `${parent}.${expression.argumentExpression.text}`;
  }
  return undefined;
}

function importedBindings(source: ts.SourceFile, importSource: string): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== importSource
    ) {
      continue;
    }
    const clause = statement.importClause;
    if (clause.name !== undefined) bindings.set(clause.name.text, 'default');
    if (clause.namedBindings !== undefined && ts.isNamespaceImport(clause.namedBindings)) {
      bindings.set(clause.namedBindings.name.text, '*');
    }
    if (clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        bindings.set(element.name.text, element.propertyName?.text ?? element.name.text);
      }
    }
  }
  return bindings;
}

function executesOperation(
  callback: ts.ArrowFunction | ts.FunctionExpression,
  operation: string,
  bindings: ReadonlyMap<string, string>,
): boolean {
  const [declaredRoot, ...tail] = operation.split('.');
  let executed = false;
  const visit = (node: ts.Node): void => {
    if (executed) return;
    if (ts.isCallExpression(node)) {
      const path = expressionPath(node.expression);
      if (path !== undefined) {
        const [localRoot, ...localTail] = path.split('.');
        const importedRoot = bindings.get(localRoot ?? '');
        if (
          importedRoot !== undefined &&
          (importedRoot === '*'
            ? [declaredRoot, ...tail].join('.') === localTail.join('.')
            : importedRoot === declaredRoot && tail.join('.') === localTail.join('.'))
        ) {
          executed = true;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return executed;
}

function assertedDiagnosticCode(callback: ts.ArrowFunction | ts.FunctionExpression, code: string): boolean {
  let observed = false;
  const visit = (node: ts.Node): void => {
    if (observed) return;
    if (
      ts.isPropertyAssignment(node) &&
      ((ts.isIdentifier(node.name) && node.name.text === 'code') ||
        (ts.isStringLiteralLike(node.name) && node.name.text === 'code')) &&
      ts.isStringLiteralLike(node.initializer) &&
      node.initializer.text === code
    ) {
      let parent: ts.Node | undefined = node.parent;
      while (parent !== undefined && parent !== callback) {
        if (ts.isCallExpression(parent) && expressionPath(parent.expression)?.startsWith('expect') === true) {
          observed = true;
          return;
        }
        parent = parent.parent;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return observed;
}

function assertedOutputOmission(callback: ts.ArrowFunction | ts.FunctionExpression, outputField: string): boolean {
  let observed = false;
  const visit = (node: ts.Node): void => {
    if (observed) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'toContain'
    ) {
      const matcher = node.expression;
      if (ts.isPropertyAccessExpression(matcher)) {
        const notAccess = matcher.expression;
        if (ts.isPropertyAccessExpression(notAccess) && notAccess.name.text === 'not') {
          const expectCall = notAccess.expression;
          if (ts.isCallExpression(expectCall) && expressionPath(expectCall.expression) === 'expect') {
            const observedExpression = expectCall.arguments[0];
            if (
              observedExpression !== undefined &&
              ts.isPropertyAccessExpression(observedExpression) &&
              observedExpression.name.text === outputField
            ) {
              observed = true;
              return;
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return observed;
}

/** Verify one exact proof against supplied bytes; used by tests to plant counterfeits. */
export function verifyExecutableFailureProofSource(
  sourceText: string,
  proof: ExecutableFailureProofContract,
): readonly ExecutableFailureProofFinding[] {
  const parsed = parseProofRef(proof.test);
  if (parsed === undefined) return [{ kind: 'missing-proof', detail: `invalid proof identity: ${proof.test}` }];
  const source = ts.createSourceFile(parsed.file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const matching = scanResolvedTestTitles(parsed.file, sourceText).filter((title) => title.fullTitle === parsed.title);
  if (matching.length === 0) {
    return [{ kind: 'missing-proof', detail: `exact test title does not exist: ${proof.test}` }];
  }
  if (matching.length !== 1 || matching[0]?.callback === undefined) {
    return [{ kind: 'ambiguous-proof', detail: `exact test title is not one executable callback: ${proof.test}` }];
  }
  const callback = matching[0].callback;
  const bindings = importedBindings(source, proof.importSource);
  const findings: ExecutableFailureProofFinding[] = [];
  if (!executesOperation(callback, proof.operation, bindings)) {
    findings.push({
      kind: 'wrong-operation',
      detail: `${proof.test} does not execute ${proof.operation} imported from ${proof.importSource}`,
    });
  }
  if (
    !assertedDiagnosticCode(callback, proof.observation.code) ||
    !assertedOutputOmission(callback, proof.observation.outputField)
  ) {
    findings.push({
      kind: 'wrong-observation',
      detail: `${proof.test} does not assert ${proof.observation.code} and omission from ${proof.observation.outputField}`,
    });
  }
  return findings;
}

/** Verify one exact proof against the repository. */
export function verifyExecutableFailureProof(
  repoRoot: string,
  proof: ExecutableFailureProofContract,
): readonly ExecutableFailureProofFinding[] {
  const parsed = parseProofRef(proof.test);
  if (parsed === undefined) return [{ kind: 'missing-proof', detail: `invalid proof identity: ${proof.test}` }];
  const path = resolve(repoRoot, parsed.file);
  if (!existsSync(path)) return [{ kind: 'missing-proof', detail: `proof file does not exist: ${parsed.file}` }];
  return verifyExecutableFailureProofSource(readFileSync(path, 'utf8'), proof);
}
