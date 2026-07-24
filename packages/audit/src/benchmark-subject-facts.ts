/**
 * Parser-backed benchmark subject reachability.
 *
 * This is the heavy host producer. `@liteship/gauntlet` owns only the flat fact
 * contract and folds these facts; it never imports the TypeScript compiler.
 *
 * @module
 */

import { posix } from 'node:path';
import ts from 'typescript';
import type { GateContext } from '@liteship/gauntlet';

type BenchmarkSubjectFacts = NonNullable<GateContext['benchmarkSubjects']>;
type BenchmarkSubjectFact = BenchmarkSubjectFacts['distributions'][number];
type BenchSubjectQualification = BenchmarkSubjectFact['qualification'];
export type BenchSubject = BenchSubjectQualification['reachableSubjects'][number];
export type BenchSubjectIssue = BenchSubjectQualification['issues'][number];

export type BenchExecution =
  | { readonly kind: 'callback' }
  | {
      readonly kind: 'collector';
      readonly file: string;
      readonly export: string;
      readonly resultKey: string;
    };

export interface QualifiedBenchDistribution {
  readonly name: string;
  readonly file: string;
  readonly inputSize: number;
  readonly shape: string;
  readonly replicates: number;
  readonly subjects: readonly BenchSubject[];
  readonly execution?: BenchExecution;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOrigin(value: unknown): BenchSubject['origin'] | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'module' && typeof value.specifier === 'string') {
    return { kind: 'module', specifier: value.specifier };
  }
  if (value.kind === 'file' && typeof value.path === 'string') return { kind: 'file', path: value.path };
  if (value.kind === 'intrinsic' && typeof value.name === 'string') return { kind: 'intrinsic', name: value.name };
  if (value.kind === 'wasm' && typeof value.crate === 'string') return { kind: 'wasm', crate: value.crate };
  return null;
}

function parseSubject(value: unknown): BenchSubject | null {
  if (!isRecord(value)) return null;
  const origin = parseOrigin(value.origin);
  if (
    origin === null ||
    (value.role !== 'sut' && value.role !== 'baseline') ||
    typeof value.symbol !== 'string' ||
    typeof value.binding !== 'string' ||
    value.symbol.length === 0 ||
    value.binding.length === 0
  ) {
    return null;
  }
  return { role: value.role, origin, symbol: value.symbol, binding: value.binding };
}

function parseExecution(value: unknown): BenchExecution | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'callback') return { kind: 'callback' };
  if (
    value.kind === 'collector' &&
    typeof value.file === 'string' &&
    typeof value.export === 'string' &&
    typeof value.resultKey === 'string'
  ) {
    return { kind: 'collector', file: value.file, export: value.export, resultKey: value.resultKey };
  }
  return null;
}

/** Strictly normalize one registry distribution before AST qualification. */
export function parseBenchmarkSubjectDistribution(value: unknown): QualifiedBenchDistribution | null {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.file !== 'string' ||
    typeof value.inputSize !== 'number' ||
    !Number.isFinite(value.inputSize) ||
    typeof value.shape !== 'string' ||
    typeof value.replicates !== 'number' ||
    !Number.isFinite(value.replicates) ||
    !Array.isArray(value.subjects)
  ) {
    return null;
  }
  const subjects = value.subjects.map(parseSubject);
  if (subjects.some((subject) => subject === null)) return null;
  const execution = value.execution === undefined ? undefined : parseExecution(value.execution);
  if (value.execution !== undefined && execution === null) return null;
  return {
    name: value.name,
    file: value.file,
    inputSize: value.inputSize,
    shape: value.shape,
    replicates: value.replicates,
    subjects: subjects as readonly BenchSubject[],
    ...(execution === undefined || execution === null ? {} : { execution }),
  };
}

interface Registration {
  readonly name: string;
  readonly callback: ts.ArrowFunction | ts.FunctionExpression | null;
}

type Callable = ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;

interface Reachability {
  readonly calls: ReadonlySet<string>;
  readonly strings: ReadonlySet<string>;
  readonly hasExecutableBody: boolean;
}

function sourceFile(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function calleeText(node: ts.Expression, source: ts.SourceFile): string {
  return node.getText(source).replace(/\s+/gu, '');
}

function registrations(ast: ts.SourceFile): readonly Registration[] {
  const out: Registration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = calleeText(node.expression, ast);
      if (callee === 'bench' || callee === 'bench.add') {
        const [nameNode, callbackNode] = node.arguments;
        if (nameNode !== undefined && (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode))) {
          out.push({
            name: nameNode.text,
            callback:
              callbackNode !== undefined && (ts.isArrowFunction(callbackNode) || ts.isFunctionExpression(callbackNode))
                ? callbackNode
                : null,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return out;
}

function localCallables(ast: ts.SourceFile): ReadonlyMap<string, Callable> {
  const out = new Map<string, Callable>();
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined && statement.body !== undefined) {
      out.set(statement.name.text, statement);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer !== undefined &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
        ) {
          out.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }

  // A benchmark may bind a closure returned by a local factory before registering
  // it. Resolve only the structurally explicit, same-file form; no execution or
  // arbitrary value inference. Iterate to a fixed point so `a = make(); b = a()`
  // remains bounded by the finite declaration count.
  const returnedCallable = (callable: Callable): Callable | null => {
    const body = callableBody(callable);
    if (body === null) return null;
    if (ts.isArrowFunction(body) || ts.isFunctionExpression(body)) return body;
    if (!ts.isBlock(body)) return null;
    for (const statement of body.statements) {
      if (
        ts.isReturnStatement(statement) &&
        statement.expression !== undefined &&
        (ts.isArrowFunction(statement.expression) || ts.isFunctionExpression(statement.expression))
      ) {
        return statement.expression;
      }
    }
    return null;
  };
  for (let pass = 0; pass < ast.statements.length; pass++) {
    let changed = false;
    for (const statement of ast.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          declaration.initializer === undefined ||
          !ts.isCallExpression(declaration.initializer) ||
          !ts.isIdentifier(declaration.initializer.expression) ||
          out.has(declaration.name.text)
        ) {
          continue;
        }
        const factory = out.get(declaration.initializer.expression.text);
        const returned = factory === undefined ? null : returnedCallable(factory);
        if (returned !== null) {
          out.set(declaration.name.text, returned);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return out;
}

function importedBindings(
  ast: ts.SourceFile,
): ReadonlyMap<string, { readonly specifier: string; readonly imported: string }> {
  const out = new Map<string, { specifier: string; imported: string }>();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (clause?.name !== undefined) out.set(clause.name.text, { specifier, imported: 'default' });
    const bindings = clause?.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      out.set(bindings.name.text, { specifier, imported: '*' });
    }
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        out.set(element.name.text, { specifier, imported: element.propertyName?.text ?? element.name.text });
      }
    }
  }
  return out;
}

function callableBody(callable: Callable): ts.Node | null {
  return callable.body ?? null;
}

/** Bounded same-file call graph, including collector-owned callback references. */
function reachableFrom(ast: ts.SourceFile, root: Callable, collectorMode: boolean): Reachability {
  const functions = localCallables(ast);
  const visitedFunctions = new Set<Callable>();
  const calls = new Set<string>();
  const strings = new Set<string>();
  let hasExecutableBody = false;

  const visitCallable = (callable: Callable): void => {
    if (visitedFunctions.has(callable)) return;
    visitedFunctions.add(callable);
    const body = callableBody(callable);
    if (body !== null) {
      hasExecutableBody ||= ts.isBlock(body) ? body.statements.length > 0 : true;
      visitNode(body, callable);
    }
  };

  const visitNode = (node: ts.Node, owner: Callable): void => {
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
      node !== owner
    ) {
      if (collectorMode && node.parent !== undefined && ts.isReturnStatement(node.parent)) visitCallable(node);
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) strings.add(node.text);
    if (ts.isCallExpression(node)) {
      const call = calleeText(node.expression, ast);
      calls.add(call);
      if (ts.isIdentifier(node.expression)) {
        const local = functions.get(node.expression.text);
        if (local !== undefined) visitCallable(local);
      }
      if (collectorMode) {
        for (const argument of node.arguments) {
          if (!ts.isIdentifier(argument)) continue;
          const local = functions.get(argument.text);
          if (local !== undefined) visitCallable(local);
        }
      }
    }
    ts.forEachChild(node, (child) => visitNode(child, owner));
  };

  visitCallable(root);
  return { calls, strings, hasExecutableBody };
}

function exportedCallable(ast: ts.SourceFile, name: string): Callable | null {
  const callable = localCallables(ast).get(name);
  if (callable === undefined) return null;
  const statement = ts.isFunctionDeclaration(callable) ? callable : callable.parent.parent.parent;
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true ? callable : null;
}

function normalizedTerminal(value: string): string {
  const withoutCalls = value.replace(/\(\)/gu, '');
  return withoutCalls
    .slice(withoutCalls.lastIndexOf('.') + 1)
    .replace(/[^A-Za-z0-9]/gu, '')
    .toLowerCase();
}

interface ModuleProvenance {
  readonly specifier: string;
  readonly symbol: string;
}

/** Resolve imported aliases and top-level property/destructuring aliases. */
function moduleProvenance(ast: ts.SourceFile): ReadonlyMap<string, ModuleProvenance> {
  const out = new Map<string, ModuleProvenance>();
  for (const [local, imported] of importedBindings(ast)) {
    out.set(local, {
      specifier: imported.specifier,
      symbol: imported.imported === '*' ? '' : imported.imported,
    });
  }

  const resolveExpression = (expression: ts.Expression): ModuleProvenance | null => {
    if (ts.isIdentifier(expression)) return out.get(expression.text) ?? null;
    if (ts.isParenthesizedExpression(expression)) return resolveExpression(expression.expression);
    if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
      return resolveExpression(expression.expression);
    }
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      if (!ts.isBlock(expression.body)) return resolveExpression(expression.body);
      for (const statement of expression.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
          return resolveExpression(statement.expression);
        }
      }
      return null;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const base = resolveExpression(expression.expression);
      if (base === null) return null;
      return {
        specifier: base.specifier,
        symbol: base.symbol.length === 0 ? expression.name.text : `${base.symbol}.${expression.name.text}`,
      };
    }
    if (ts.isCallExpression(expression)) {
      const callee = resolveExpression(expression.expression);
      if (callee === null) return null;
      return { specifier: callee.specifier, symbol: `${callee.symbol}()` };
    }
    if (
      ts.isElementAccessExpression(expression) &&
      expression.argumentExpression !== undefined &&
      ts.isStringLiteral(expression.argumentExpression)
    ) {
      const base = resolveExpression(expression.expression);
      if (base === null) return null;
      const property = expression.argumentExpression.text;
      return {
        specifier: base.specifier,
        symbol: base.symbol.length === 0 ? property : `${base.symbol}.${property}`,
      };
    }
    return null;
  };

  // Declarations inside measured callbacks matter (`const sched =
  // Scheduler.fixedStep(...)`). Fold the whole file to a fixed point because a
  // later alias may depend on an earlier factory result. Conflicting bindings
  // are removed rather than guessed, keeping the proof conservative.
  const declarations: ts.VariableDeclaration[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) declarations.push(node);
    ts.forEachChild(node, collect);
  };
  collect(ast);
  const conflicted = new Set<string>();
  const admit = (name: string, provenance: ModuleProvenance): void => {
    if (conflicted.has(name)) return;
    const prior = out.get(name);
    if (prior !== undefined && (prior.specifier !== provenance.specifier || prior.symbol !== provenance.symbol)) {
      out.delete(name);
      conflicted.add(name);
      return;
    }
    out.set(name, provenance);
  };
  for (let pass = 0; pass <= declarations.length; pass++) {
    let changed = false;
    for (const declaration of declarations) {
      if (declaration.initializer === undefined) continue;
      const source = resolveExpression(declaration.initializer);
      if (source === null) continue;
      if (ts.isIdentifier(declaration.name)) {
        const before = out.get(declaration.name.text);
        admit(declaration.name.text, source);
        changed ||= before !== out.get(declaration.name.text);
      } else if (ts.isObjectBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const property = element.propertyName?.getText(ast) ?? element.name.text;
          const provenance = {
            specifier: source.specifier,
            symbol: source.symbol.length === 0 ? property : `${source.symbol}.${property}`,
          };
          const before = out.get(element.name.text);
          admit(element.name.text, provenance);
          changed ||= before !== out.get(element.name.text);
        }
      }
    }
    if (!changed) break;
  }
  return out;
}

function moduleOriginMatches(subject: BenchSubject, ast: ts.SourceFile): boolean {
  if (subject.origin.kind !== 'module') return true;
  const binding = subject.binding.replace(/\s+/gu, '').replace(/\(\)$/u, '');
  const [root = '', ...properties] = binding.split('.');
  const provenance = moduleProvenance(ast).get(root);
  if (provenance === undefined || provenance.specifier !== subject.origin.specifier) return false;
  const resolved = [provenance.symbol, ...properties].filter((part) => part.length > 0).join('.');
  const expected = subject.symbol;
  if (resolved.replace(/\(\)/gu, '') === expected.replace(/\(\)/gu, '')) return true;
  const rootOf = (value: string): string => value.split(/[.(]/u)[0] ?? '';
  return rootOf(resolved) === rootOf(expected) && normalizedTerminal(resolved) === normalizedTerminal(expected);
}

function originMatches(subject: BenchSubject, executionFile: string, ast: ts.SourceFile): boolean {
  if (subject.origin.kind === 'module') {
    return moduleOriginMatches(subject, ast);
  }
  if (subject.origin.kind === 'file') {
    if (subject.origin.path === executionFile) return true;
    for (const imported of importedBindings(ast).values()) {
      if (!imported.specifier.startsWith('.')) continue;
      const resolved = posix
        .normalize(posix.join(posix.dirname(executionFile), imported.specifier))
        .replace(/\.js$/u, '.ts');
      if (resolved === subject.origin.path) return true;
    }
    return false;
  }
  if (subject.origin.kind === 'intrinsic') {
    return subject.binding === subject.origin.name || subject.binding.startsWith(`${subject.origin.name}.`);
  }
  return normalizedTerminal(subject.symbol) === normalizedTerminal(subject.binding);
}

function subjectIsInvoked(subject: BenchSubject, reachability: Reachability): boolean {
  if (subject.binding === '<callback>') return reachability.hasExecutableBody;
  return reachability.calls.has(subject.binding.replace(/\s+/gu, ''));
}

/** Qualify one distribution against source bytes supplied by the repository host. */
export function qualifyBenchDistribution(
  distribution: QualifiedBenchDistribution,
  readFile: (path: string) => string | undefined,
): BenchSubjectQualification {
  const issues: BenchSubjectIssue[] = [];
  const reachableSubjects: BenchSubject[] = [];
  if (distribution.subjects.length === 0) {
    issues.push({
      kind: 'missing-subject',
      name: distribution.name,
      file: distribution.file,
      detail: `benchmark "${distribution.name}" declares no measured subjects`,
    });
    return { issues, reachableSubjects, qualifyingSutSubjects: [] };
  }

  const benchText = readFile(distribution.file);
  if (benchText === undefined) {
    issues.push({
      kind: 'missing-execution-source',
      name: distribution.name,
      file: distribution.file,
      detail: `benchmark source ${distribution.file} could not be read`,
    });
    return { issues, reachableSubjects, qualifyingSutSubjects: [] };
  }
  const benchAst = sourceFile(distribution.file, benchText);
  const matches = registrations(benchAst).filter((registration) => registration.name === distribution.name);
  if (matches.length === 0) {
    issues.push({
      kind: 'missing-registration',
      name: distribution.name,
      file: distribution.file,
      detail: `benchmark "${distribution.name}" has no literal registration in ${distribution.file}`,
    });
    return { issues, reachableSubjects, qualifyingSutSubjects: [] };
  }
  if (matches.length > 1) {
    issues.push({
      kind: 'ambiguous-registration',
      name: distribution.name,
      file: distribution.file,
      detail: `benchmark "${distribution.name}" is registered ${matches.length} times in ${distribution.file}`,
    });
    return { issues, reachableSubjects, qualifyingSutSubjects: [] };
  }

  const execution = distribution.execution ?? { kind: 'callback' as const };
  let executionFile = distribution.file;
  let executionAst = benchAst;
  let root: Callable | null = matches[0]!.callback;
  let collectorMode = false;
  if (execution.kind === 'collector') {
    executionFile = execution.file;
    const collectorText = readFile(execution.file);
    if (collectorText === undefined) {
      issues.push({
        kind: 'missing-execution-source',
        name: distribution.name,
        file: execution.file,
        detail: `collector source ${execution.file} could not be read`,
      });
      return { issues, reachableSubjects, qualifyingSutSubjects: [] };
    }
    executionAst = sourceFile(execution.file, collectorText);
    root = exportedCallable(executionAst, execution.export);
    collectorMode = true;
    if (root === null) {
      issues.push({
        kind: 'missing-collector',
        name: distribution.name,
        file: execution.file,
        detail: `collector ${execution.file} does not export callable ${execution.export}`,
      });
      return { issues, reachableSubjects, qualifyingSutSubjects: [] };
    }
  } else if (root === null) {
    issues.push({
      kind: 'missing-callback',
      name: distribution.name,
      file: distribution.file,
      detail: `benchmark "${distribution.name}" has no measured callback`,
    });
    return { issues, reachableSubjects, qualifyingSutSubjects: [] };
  }

  const reachability = reachableFrom(executionAst, root, collectorMode);
  if (execution.kind === 'collector' && !reachability.strings.has(execution.resultKey)) {
    issues.push({
      kind: 'missing-result-key',
      name: distribution.name,
      file: execution.file,
      detail: `collector ${execution.export} does not emit declared result key "${execution.resultKey}"`,
    });
  }

  for (const subject of distribution.subjects) {
    if (!originMatches(subject, executionFile, executionAst)) {
      issues.push({
        kind: 'wrong-origin',
        name: distribution.name,
        file: executionFile,
        subject,
        detail: `subject ${subject.symbol} claims ${subject.origin.kind} origin that is not supported by ${executionFile}`,
      });
      continue;
    }
    if (!subjectIsInvoked(subject, reachability)) {
      issues.push({
        kind: 'uninvoked-subject',
        name: distribution.name,
        file: executionFile,
        subject,
        detail: `measured execution for "${distribution.name}" never invokes ${subject.binding}`,
      });
      continue;
    }
    reachableSubjects.push(subject);
  }

  return {
    issues,
    reachableSubjects,
    qualifyingSutSubjects: reachableSubjects.filter(
      (subject) => subject.role === 'sut' && subject.origin.kind !== 'intrinsic',
    ),
  };
}

/** Build the complete flat fact pack once; gates only fold this result. */
export function buildBenchmarkSubjectFacts(
  distributions: readonly QualifiedBenchDistribution[],
  readFile: (path: string) => string | undefined,
): BenchmarkSubjectFacts {
  return {
    schemaVersion: 1,
    distributions: distributions.map((distribution) => ({
      name: distribution.name,
      file: distribution.file,
      qualification: qualifyBenchDistribution(distribution, readFile),
    })),
  };
}
