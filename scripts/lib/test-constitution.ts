/** AST-backed inventory of brittle test-harness dependencies. @module */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { nearestBinding } from '../../packages/audit/src/ts-scope.js';

export type TestDebtKind =
  | 'ambient-clock'
  | 'ambient-entropy-spy'
  | 'generated-payload-delimiter'
  | 'real-timer'
  | 'source-byte-oracle'
  | 'unseeded-property'
  | 'unanchored-text-slice';

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
/**
 * The population for `unseeded-property`: the whole authored test tree.
 *
 * Replayability is not lane-specific, so this kind's denominator is the anchor
 * rather than a curated subset. A hand-listed root set is what let 20 files
 * carrying `fc.assert` sit outside every root and report nothing.
 */
const SEEDED_PROPERTY_ROOTS = ['tests'];

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

const SENTINEL_COMPARISON_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
]);

function identifierHasIndexGuard(scope: ts.Node, name: string, beforePosition: number): boolean {
  let guarded = false;
  const isNamedIdentifier = (node: ts.Node): boolean => ts.isIdentifier(node) && node.text === name;
  const visit = (node: ts.Node): void => {
    if (guarded) return;
    if (
      ts.isBinaryExpression(node) &&
      node.getStart() < beforePosition &&
      SENTINEL_COMPARISON_OPERATORS.has(node.operatorToken.kind) &&
      ((isNamedIdentifier(node.left) && isMinusOne(node.right)) ||
        (isMinusOne(node.left) && isNamedIdentifier(node.right)))
    ) {
      guarded = true;
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.getStart() < beforePosition &&
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
          !identifierHasIndexGuard(scope, argument.text, node.getStart())
        );
      });
      if (unguarded) findings.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings;
}

function literalText(node: ts.Expression | undefined, expected: string): boolean {
  return node !== undefined && ts.isStringLiteralLike(node) && node.text === expected;
}

/**
 * THE CLASS RULE — ANCHOR: a test replaces or assigns the global Math.random
 * entropy source. ALLOWLIST: none. Tests must inject `seededRng` from
 * @liteship/core instead; the ratchet stops the next ambient spy without
 * blessing the inherited sites.
 */
function ambientEntropySpies(ast: ts.SourceFile): readonly ts.Node[] {
  const findings: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const method = node.expression.name.text;
      if (
        ts.isIdentifier(receiver) &&
        receiver.text === 'vi' &&
        ((method === 'spyOn' &&
          node.arguments[0] !== undefined &&
          ts.isIdentifier(node.arguments[0]) &&
          node.arguments[0].text === 'Math' &&
          literalText(node.arguments[1], 'random')) ||
          (method === 'stubGlobal' && literalText(node.arguments[0], 'Math')))
      ) {
        findings.push(node);
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === 'Math' &&
      node.left.name.text === 'random'
    ) {
      findings.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings;
}

type FixtureDelimiterState =
  'block-comment' | 'code' | 'double-quote' | 'html-comment' | 'line-comment' | 'nested-template' | 'single-quote';

function fcRootedExpression(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) return fcRootedExpression(node.expression);
  if (ts.isIdentifier(node)) return node.text === 'fc';
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    return fcRootedExpression(node.expression);
  }
  return ts.isCallExpression(node) && fcRootedExpression(node.expression);
}

function bindingIdentifiers(name: ts.BindingName): readonly ts.Identifier[] {
  if (ts.isIdentifier(name)) return [name];
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name)));
}

interface GeneratorBinding {
  readonly name: string;
  readonly origin: ts.Expression;
  readonly scope: ts.Node;
  readonly start: number;
}

function bindingScope(node: ts.Node, ast: ts.SourceFile): ts.Node {
  let current = node.parent;
  while (current !== undefined) {
    if (ts.isFunctionLike(current)) return current;
    current = current.parent;
  }
  return ast;
}

function bindingForUse(identifier: ts.Identifier, bindings: readonly GeneratorBinding[]): GeneratorBinding | undefined {
  return bindings
    .filter(
      (binding) =>
        binding.name === identifier.text &&
        binding.start <= identifier.getStart() &&
        binding.scope.getStart() <= identifier.getStart() &&
        binding.scope.getEnd() >= identifier.getEnd(),
    )
    .sort(
      (left, right) =>
        left.scope.getEnd() - left.scope.getStart() - (right.scope.getEnd() - right.scope.getStart()) ||
        right.start - left.start,
    )[0];
}

function generatorBindings(ast: ts.SourceFile): readonly GeneratorBinding[] {
  const bindings: GeneratorBinding[] = [];
  const variableInitializers: {
    readonly identifiers: readonly ts.Identifier[];
    readonly initializer: ts.Expression;
  }[] = [];
  const add = (identifier: ts.Identifier, origin: ts.Expression): void => {
    if (bindings.some((binding) => binding.start === identifier.getStart() && binding.name === identifier.text)) return;
    bindings.push({
      name: identifier.text,
      origin,
      scope: bindingScope(identifier, ast),
      start: identifier.getStart(),
    });
  };

  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const identifiers = bindingIdentifiers(node.name);
      variableInitializers.push({ identifiers, initializer: node.initializer });
      if (fcRootedExpression(node.initializer)) for (const identifier of identifiers) add(identifier, node.initializer);
    }
    if (ts.isCallExpression(node)) {
      const callback = node.arguments.at(-1);
      if (
        callback !== undefined &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
        ((ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'fc' &&
          (node.expression.name.text === 'property' || node.expression.name.text === 'asyncProperty')) ||
          (ts.isPropertyAccessExpression(node.expression) &&
            (node.expression.name.text === 'map' || node.expression.name.text === 'chain') &&
            fcRootedExpression(node.expression.expression)))
      ) {
        for (let index = 0; index < callback.parameters.length; index++) {
          const parameter = callback.parameters[index]!;
          const origin =
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'fc'
              ? node.arguments[index]
              : ts.isPropertyAccessExpression(node.expression)
                ? node.expression.expression
                : undefined;
          if (origin === undefined) continue;
          for (const identifier of bindingIdentifiers(parameter.name)) add(identifier, origin);
        }
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(ast);

  const expressionUsesBinding = (node: ts.Node): boolean => {
    if (ts.isIdentifier(node) && bindingForUse(node, bindings) !== undefined) return true;
    let found = false;
    ts.forEachChild(node, (child) => {
      if (!found && expressionUsesBinding(child)) found = true;
    });
    return found;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const { identifiers, initializer } of variableInitializers) {
      if (!fcRootedExpression(initializer) && !expressionUsesBinding(initializer)) continue;
      for (const identifier of identifiers) {
        if (identifier !== undefined && bindingForUse(identifier, bindings) === undefined) {
          add(identifier, initializer);
          changed = true;
        }
      }
    }
  }
  return bindings;
}

function literalBindings(ast: ts.SourceFile): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      (ts.isStringLiteralLike(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      bindings.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return bindings;
}

function literalValue(node: ts.Expression, _literals: ReadonlyMap<string, string>): string | undefined {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function scanFixtureText(text: string, initial: FixtureDelimiterState): FixtureDelimiterState {
  let state = initial;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    const pair = text.slice(index, index + 2);
    const quartet = text.slice(index, index + 4);
    if (state === 'block-comment') {
      if (pair === '*/') {
        state = 'code';
        index++;
      }
      continue;
    }
    if (state === 'html-comment') {
      if (text.slice(index, index + 3) === '-->') {
        state = 'code';
        index += 2;
      }
      continue;
    }
    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') state = 'code';
      continue;
    }
    if (state === 'single-quote' || state === 'double-quote' || state === 'nested-template') {
      const close = state === 'single-quote' ? "'" : state === 'double-quote' ? '"' : '`';
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === close) state = 'code';
      continue;
    }
    if (quartet === '<!--') {
      state = 'html-comment';
      index += 3;
    } else if (pair === '/*') {
      state = 'block-comment';
      index++;
    } else if (pair === '//' && text[index - 1] !== ':') {
      state = 'line-comment';
      index++;
    } else if (char === "'") {
      state = 'single-quote';
    } else if (char === '"') {
      state = 'double-quote';
    } else if (char === '`') {
      state = 'nested-template';
    }
  }
  return state;
}

interface ReplacementOperation {
  readonly replacement: string;
  readonly target: string;
}

function replacementOperations(
  node: ts.Expression,
  literals: ReadonlyMap<string, string>,
  initializers: ReadonlyMap<string, ts.Expression>,
): readonly ReplacementOperation[] | undefined {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== 'replaceAll'
  ) {
    return undefined;
  }
  const target = literalValue(node.arguments[0]!, literals);
  const replacement = literalValue(node.arguments[1]!, literals);
  if (target === undefined || replacement === undefined) return undefined;
  const prior = replacementOperations(node.expression.expression, literals, initializers) ?? [];
  return [...prior, { target, replacement }];
}

function sanitizedForDelimiter(
  node: ts.Expression,
  state: FixtureDelimiterState,
  literals: ReadonlyMap<string, string>,
  initializers: ReadonlyMap<string, ts.Expression>,
): boolean {
  if (literalValue(node, literals) !== undefined) return true;
  const operations = replacementOperations(node, literals, initializers);
  if (operations === undefined) return false;
  const safelyReplaces = (delimiter: string): boolean => {
    const removalIndex = operations.findIndex(
      ({ target, replacement }) => target === delimiter && !replacement.includes(delimiter),
    );
    if (removalIndex === -1) return false;
    // A later replacement can reconstruct a multi-character closer one piece
    // at a time even when no individual replacement contains the whole closer.
    // Prove those safe only when the exact-closer removal is the final operation.
    // For a one-character closer, checking every later replacement string is
    // complete: no later operation can introduce that character from nowhere.
    if (delimiter.length > 1) return removalIndex === operations.length - 1;
    return operations.slice(removalIndex + 1).every(({ replacement }) => !replacement.includes(delimiter));
  };
  if (state === 'block-comment') return safelyReplaces('*/');
  if (state === 'html-comment') return safelyReplaces('-->');
  if (state === 'line-comment') return safelyReplaces('\n') && safelyReplaces('\r');
  if (state === 'nested-template') return safelyReplaces('`') && safelyReplaces('${');
  return false;
}

function delimiterClosers(state: FixtureDelimiterState): readonly string[] {
  if (state === 'block-comment') return ['*/'];
  if (state === 'html-comment') return ['-->'];
  if (state === 'line-comment') return ['\n', '\r'];
  if (state === 'nested-template') return ['`', '${'];
  return [];
}

function textCannotCloseDelimiter(text: string, state: FixtureDelimiterState): boolean {
  return delimiterClosers(state).every((closer) => !text.includes(closer));
}

function finiteStringValues(
  node: ts.Expression,
  literals: ReadonlyMap<string, string>,
  initializers: ReadonlyMap<string, ts.Expression>,
): readonly string[] | undefined {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return finiteStringValues(node.expression, literals, initializers);
  }
  const literal = literalValue(node, literals);
  if (literal !== undefined) return [literal];
  if (ts.isSpreadElement(node)) return finiteStringValues(node.expression, literals, initializers);
  if (ts.isIdentifier(node)) {
    const initializer = initializers.get(node.text);
    return initializer === undefined ? undefined : finiteStringValues(initializer, literals, initializers);
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values: string[] = [];
    for (const element of node.elements) {
      const nested = finiteStringValues(element, literals, initializers);
      if (nested === undefined) return undefined;
      values.push(...nested);
    }
    return values;
  }
  return undefined;
}

function regexpAlphabet(node: ts.Expression): ReadonlySet<string> | undefined {
  if (!ts.isRegularExpressionLiteral(node)) return undefined;
  const lastSlash = node.text.lastIndexOf('/');
  const pattern = node.text.slice(1, lastSlash);
  if (!pattern.startsWith('^') || !pattern.endsWith('$') || pattern.includes('|') || /\[\^/u.test(pattern))
    return undefined;
  const alphabet = new Set<string>();
  for (let index = 1; index < pattern.length - 1; index++) {
    const char = pattern[index]!;
    if (char === '[') {
      const close = pattern.indexOf(']', index + 1);
      if (close === -1) return undefined;
      const body = pattern.slice(index + 1, close);
      for (let bodyIndex = 0; bodyIndex < body.length; bodyIndex++) {
        const current = body[bodyIndex]!;
        if (current === '\\') {
          const escaped = body[++bodyIndex];
          if (escaped === undefined || (/[A-Za-z0-9]/u.test(escaped) && escaped !== 'd' && escaped !== 'w')) {
            return undefined;
          }
          if (escaped === 'd') for (const digit of '0123456789') alphabet.add(digit);
          else if (escaped === 'w') {
            for (const word of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_') alphabet.add(word);
          } else alphabet.add(escaped === 'n' ? '\n' : escaped === 'r' ? '\r' : escaped);
          continue;
        }
        if (body[bodyIndex + 1] === '-' && body[bodyIndex + 2] !== undefined) {
          const end = body.charCodeAt(bodyIndex + 2);
          for (let code = body.charCodeAt(bodyIndex); code <= end; code++) alphabet.add(String.fromCharCode(code));
          bodyIndex += 2;
        } else {
          alphabet.add(current);
        }
      }
      index = close;
      continue;
    }
    if ('*+?{}()'.includes(char)) continue;
    if (char === '.' || char === '\\') return undefined;
    alphabet.add(char);
  }
  return alphabet;
}

function alphabetCannotCloseDelimiter(alphabet: ReadonlySet<string>, state: FixtureDelimiterState): boolean {
  return delimiterClosers(state).every((closer) => [...closer].some((char) => !alphabet.has(char)));
}

function generatedValueCannotCloseDelimiter(
  node: ts.Expression,
  state: FixtureDelimiterState,
  literals: ReadonlyMap<string, string>,
  initializers: ReadonlyMap<string, ts.Expression>,
  bindings: readonly GeneratorBinding[],
  seen: ReadonlySet<ts.Node> = new Set(),
): boolean {
  if (seen.has(node)) return false;
  const nextSeen = new Set([...seen, node]);
  const literal = literalValue(node, literals);
  if (literal !== undefined) return textCannotCloseDelimiter(literal, state);
  if (sanitizedForDelimiter(node, state, literals, initializers)) return true;
  if (ts.isIdentifier(node)) {
    const binding = bindingForUse(node, bindings);
    const origin = binding?.origin ?? initializers.get(node.text);
    return (
      origin !== undefined &&
      generatedValueCannotCloseDelimiter(origin, state, literals, initializers, bindings, nextSeen)
    );
  }
  if (ts.isTemplateExpression(node)) {
    if (!textCannotCloseDelimiter(node.head.text, state)) return false;
    return node.templateSpans.every(
      (span) =>
        generatedValueCannotCloseDelimiter(span.expression, state, literals, initializers, bindings, nextSeen) &&
        textCannotCloseDelimiter(span.literal.text, state),
    );
  }
  if (ts.isCallExpression(node)) {
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'fc' &&
      node.expression.name.text === 'constantFrom'
    ) {
      const values: string[] = [];
      for (const argument of node.arguments) {
        const nested = finiteStringValues(argument, literals, initializers);
        if (nested === undefined) return false;
        values.push(...nested);
      }
      return values.length > 0 && values.every((value) => textCannotCloseDelimiter(value, state));
    }
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'fc' &&
      node.expression.name.text === 'stringMatching'
    ) {
      const alphabet = node.arguments[0] === undefined ? undefined : regexpAlphabet(node.arguments[0]);
      return alphabet !== undefined && alphabetCannotCloseDelimiter(alphabet, state);
    }
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'map' || node.expression.name.text === 'chain')
    ) {
      const callback = node.arguments[0];
      const output =
        callback !== undefined && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
          ? returnedExpression(callback)
          : undefined;
      return (
        output !== undefined &&
        generatedValueCannotCloseDelimiter(output, state, literals, initializers, bindings, nextSeen)
      );
    }
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'join') {
      return generatedValueCannotCloseDelimiter(
        node.expression.expression,
        state,
        literals,
        initializers,
        bindings,
        nextSeen,
      );
    }
  }
  return false;
}

/**
 * THE CLASS RULE — ANCHOR: generator-derived data interpolated while a raw
 * fixture is inside a JS/CSS comment, HTML comment, line comment, or nested
 * template delimiter. ALLOWLIST: a literal value, a const bound to a literal,
 * or a positively-recognized replaceAll chain that removes every closing
 * delimiter for the active context. Unknown aliases and sanitizers fail closed:
 * arbitrary payloads may contain the closing delimiter and change the fixture
 * from the syntax the property claims to test.
 */
function generatedPayloadDelimiters(ast: ts.SourceFile): readonly ts.Expression[] {
  const bindings = generatorBindings(ast);
  const literals = literalBindings(ast);
  const initializers = new Map<string, ts.Expression>();
  const ambiguousInitializers = new Set<string>();
  const findings: ts.Expression[] = [];

  const derived = (node: ts.Expression): boolean => {
    if (fcRootedExpression(node)) return true;
    if (ts.isIdentifier(node)) return bindingForUse(node, bindings) !== undefined;
    let found = false;
    ts.forEachChild(node, (child) => {
      if (!found && ts.isExpression(child) && derived(child)) found = true;
    });
    return found;
  };

  const collectInitializers = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      if (initializers.has(node.name.text)) {
        initializers.delete(node.name.text);
        ambiguousInitializers.add(node.name.text);
      } else if (!ambiguousInitializers.has(node.name.text)) {
        initializers.set(node.name.text, node.initializer);
      }
    }
    ts.forEachChild(node, collectInitializers);
  };
  collectInitializers(ast);

  const visit = (node: ts.Node): void => {
    if (ts.isTemplateExpression(node)) {
      let state: FixtureDelimiterState = scanFixtureText(node.head.text, 'code');
      for (const span of node.templateSpans) {
        const hazardous =
          state === 'block-comment' ||
          state === 'html-comment' ||
          state === 'line-comment' ||
          state === 'nested-template';
        if (
          derived(span.expression) &&
          hazardous &&
          !generatedValueCannotCloseDelimiter(span.expression, state, literals, initializers, bindings)
        ) {
          findings.push(span.expression);
        }
        const literal = literalValue(span.expression, literals);
        if (literal !== undefined) state = scanFixtureText(literal, state);
        state = scanFixtureText(span.literal.text, state);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return findings;
}

function staticPropertyName(node: ts.ObjectLiteralElementLike): string | undefined {
  if (ts.isShorthandPropertyAssignment(node)) return node.name.text;
  if (!ts.isPropertyAssignment(node) || node.name === undefined) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return undefined;
}

/** Strip the parenthesis / `as const` / `satisfies` wrappers a value may carry. */
function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression;
  }
  return current;
}

/**
 * The `const` initializer an identifier denotes, or `undefined` when it denotes
 * nothing fixed at authoring time.
 *
 * `let` and `var` are refused deliberately: a rebindable name is not a constant,
 * however constant its first assignment happens to look.
 */
function constInitializer(identifier: ts.Identifier): ts.Expression | undefined {
  const binding = nearestBinding(identifier);
  if (binding === undefined || !ts.isVariableDeclaration(binding)) return undefined;
  const declarationList = binding.parent;
  if (!ts.isVariableDeclarationList(declarationList)) return undefined;
  if ((declarationList.flags & ts.NodeFlags.Const) === 0) return undefined;
  return binding.initializer;
}

/**
 * The compile-time integer an expression denotes, or `undefined` when it denotes
 * nothing statically knowable.
 *
 * TOKEN vs REFERENT. `numRuns: RUNS` is perfectly replayable when `RUNS` is a
 * `const` bound to a literal, and not replayable at all when it is a `let`, a
 * parameter, or a call. The two are spelled identically, so the binding is
 * RESOLVED through the shared scope walker rather than guessed from the text —
 * the same discipline the referent law applies elsewhere.
 */
/**
 * Fold one binary operator over two resolved integers.
 *
 * The set is deliberately closed: these are the operators that combine two
 * compile-time integers into a third with no ambient input. `SEED ^ 0x4e414e`
 * is exactly as replayable as the literal it evaluates to, so refusing it would
 * judge the spelling. Every other operator — comparison, logical, `??`,
 * exponent-with-fractions — falls through to `undefined` and is refused.
 */
function applyIntegerOperator(kind: ts.SyntaxKind, left: number, right: number): number | undefined {
  switch (kind) {
    case ts.SyntaxKind.CaretToken:
      return left ^ right;
    case ts.SyntaxKind.BarToken:
      return left | right;
    case ts.SyntaxKind.AmpersandToken:
      return left & right;
    case ts.SyntaxKind.LessThanLessThanToken:
      return left << right;
    case ts.SyntaxKind.GreaterThanGreaterThanToken:
      return left >> right;
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      return left >>> right;
    case ts.SyntaxKind.PlusToken:
      return left + right;
    case ts.SyntaxKind.MinusToken:
      return left - right;
    case ts.SyntaxKind.AsteriskToken:
      return left * right;
    default:
      return undefined;
  }
}

function staticIntegerValue(node: ts.Expression, depth = 0): number | undefined {
  // A const may be defined in terms of another const; bound the chase rather
  // than trusting the graph to be acyclic.
  if (depth > 8) return undefined;
  const expression = unwrapExpression(node);
  if (ts.isPrefixUnaryExpression(expression)) {
    if (expression.operator !== ts.SyntaxKind.MinusToken) return undefined;
    const operand = staticIntegerValue(expression.operand, depth + 1);
    return operand === undefined ? undefined : -operand;
  }
  if (ts.isNumericLiteral(expression)) {
    const value = Number(expression.text.replaceAll('_', ''));
    return Number.isSafeInteger(value) ? value : undefined;
  }
  if (ts.isBinaryExpression(expression)) {
    const left = staticIntegerValue(expression.left, depth + 1);
    const right = staticIntegerValue(expression.right, depth + 1);
    if (left === undefined || right === undefined) return undefined;
    const combined = applyIntegerOperator(expression.operatorToken.kind, left, right);
    return combined !== undefined && Number.isSafeInteger(combined) ? combined : undefined;
  }
  if (ts.isIdentifier(expression)) {
    const initializer = constInitializer(expression);
    return initializer === undefined ? undefined : staticIntegerValue(initializer, depth + 1);
  }
  return undefined;
}

/**
 * The options object an `fc.assert` call passes, resolved through a `const`
 * binding when the call names one.
 *
 * `fc.assert(property, RUNS)` with `const RUNS = { seed, numRuns } as const` is
 * fully seeded evidence; refusing it because the ARGUMENT is not literally an
 * object expression judged a spelling instead of a value.
 */
function assertOptions(node: ts.CallExpression): ts.ObjectLiteralExpression | undefined {
  const argument = node.arguments[1];
  if (argument === undefined) return undefined;
  const expression = unwrapExpression(argument);
  if (ts.isObjectLiteralExpression(expression)) return expression;
  if (!ts.isIdentifier(expression)) return undefined;
  const initializer = constInitializer(expression);
  if (initializer === undefined) return undefined;
  const resolved = unwrapExpression(initializer);
  return ts.isObjectLiteralExpression(resolved) ? resolved : undefined;
}

/**
 * THE CLASS RULE — ANCHOR: every fast-check assertion in a handwritten
 * deterministic or fuzz suite. ALLOWLIST: an options object — written inline or
 * reached through a `const` — carrying exactly one `seed` and exactly one
 * `numRuns`, each RESOLVING to a compile-time integer, with `numRuns >= 1` and
 * no spread or computed option that could override either.
 *
 * Naming the keys was never the claim. The claim is that a failure can be
 * REPLAYED, and `{ seed: Date.now(), numRuns: 0 }` names both keys while
 * proving nothing: the seed is different every run and the property executes
 * zero cases. A key-presence test over an open value grammar is a denylist in
 * disguise — it admits every value it forgot to think about. Values are
 * therefore resolved, and anything unresolvable is debt.
 */
function unseededProperties(ast: ts.SourceFile): readonly ts.CallExpression[] {
  const findings: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && propertyCall(node, 'fc', 'assert')) {
      const options = assertOptions(node);
      if (options === undefined) {
        findings.push(node);
      } else {
        const entries = options.properties.map((property) => ({
          name: staticPropertyName(property),
          // A shorthand `{ seed }` denotes the identifier itself, which resolves
          // exactly like an explicit initializer would.
          value: ts.isPropertyAssignment(property)
            ? property.initializer
            : ts.isShorthandPropertyAssignment(property)
              ? property.name
              : undefined,
        }));
        const hasDynamicOption = entries.some((entry) => entry.name === undefined);
        const seeds = entries.filter((entry) => entry.name === 'seed');
        const runs = entries.filter((entry) => entry.name === 'numRuns');
        const seedValue =
          seeds.length === 1 && seeds[0]?.value !== undefined ? staticIntegerValue(seeds[0].value) : undefined;
        const runValue =
          runs.length === 1 && runs[0]?.value !== undefined ? staticIntegerValue(runs[0].value) : undefined;
        if (hasDynamicOption || seedValue === undefined || runValue === undefined || runValue < 1) {
          findings.push(node);
        }
      }
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
      for (const spy of ambientEntropySpies(ast)) add('ambient-entropy-spy', spy);
      for (const payload of generatedPayloadDelimiters(ast)) add('generated-payload-delimiter', payload);
    }
  }
  // `unseeded-property` owns a WIDER population than the kinds above, and
  // deliberately so. The other kinds are scoped to the lanes whose determinism
  // they describe; replayability is not lane-specific — an `fc.assert` anywhere
  // under `tests/` that cannot replay its own failure is not evidence, wherever
  // it lives. Six hand-listed roots is how 20 such files stayed invisible: 19
  // generated suites inheriting an unseeded emitter, and one integration
  // differential. The population is the authored test tree, so enrolling a new
  // lane cannot silently exclude its properties.
  for (const relativeRoot of SEEDED_PROPERTY_ROOTS) {
    for (const absolute of filesUnder(join(cwd, relativeRoot))) {
      const file = normalize(relative(cwd, absolute));
      const source = readFileSync(absolute, 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      for (const property of unseededProperties(ast)) {
        findings.push({
          file,
          kind: 'unseeded-property',
          line: ast.getLineAndCharacterOfPosition(property.getStart(ast)).line + 1,
        });
      }
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
