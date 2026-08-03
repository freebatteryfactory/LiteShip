/**
 * Findings for CSS-identity interpolation that is not provably escaped.
 *
 * THE CLASS RULE. ANCHOR: every template literal under a package `src` tree
 * whose static text contains `data-liteship-boundary="`. ALLOWLIST: each
 * expression contributing to that quoted identity is either a direct
 * `escapeCssString(...)` call or a unique same-scope `const` bound directly
 * to such a call. A bare value, member access, wrapper call, ambiguous binding,
 * or missing closing quote is a finding. The anchor is closed and greppable;
 * the allowlist is deliberately narrow because an open catalogue of unsafe
 * expression spellings loses by construction.
 *
 * @module
 */
import ts from 'typescript';

const BOUNDARY_SELECTOR_ANCHOR = 'data-liteship-boundary="';
const PACKAGE_SOURCE_PATH = /^packages\/[^/]+\/src\/.*\.[cm]?[jt]sx?$/u;

/** One source file presented to the CSS-identity scanner. */
export interface CssIdentitySource {
  readonly path: string;
  readonly text: string;
}

/** One interpolation the scanner could not prove safe. */
export interface CssIdentityFinding {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly reason: 'unescaped-interpolation' | 'unclosed-quoted-identity';
  readonly expression: string;
}

/** The findings and non-vacuity census produced by one scan. */
export interface CssIdentityScanResult {
  readonly findings: readonly CssIdentityFinding[];
  /** Number of anchored template literals inspected, not merely the number of files. */
  readonly anchoredCount: number;
}

type Scope = ts.SourceFile | ts.Block;

interface TemplateParts {
  readonly chunks: readonly string[];
  readonly expressions: readonly ts.Expression[];
}

function scriptKindFor(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * The files that DECLARE an approved escape, and the barrels/specifiers that
 * re-export one. A call is admitted only when its callee RESOLVES here —
 * checking the callee's spelling alone admits any binding that happens to
 * carry the name, including a package-local `const escapeCssString = (v) => v`
 * (Codex review round 2 on PR #197, confirmed P2).
 */
const APPROVED_ESCAPE_MODULES: ReadonlySet<string> = new Set([
  'packages/core/src/motion/css-identity.ts',
  'packages/core/src/motion/index.ts',
  'packages/compiler/src/css-string.ts',
]);

const ESCAPE_EXPORT_NAME = 'escapeCssString';

/** Host-injected policy: the engine stays lean and never names a project package. */
export interface CssIdentityScanOptions {
  /**
   * Package specifiers whose named `escapeCssString` re-exports an approved
   * declaration. Repo-relative definer paths are the engine's own anchor
   * domain; PACKAGE specifiers are project policy, so the host supplies them.
   */
  readonly approvedEscapeSpecifiers?: readonly string[];
}

/** Resolve a relative specifier against the importing file, as a repo-relative `.ts` path. */
function resolveRelative(fromPath: string, specifier: string): string {
  const segments = fromPath.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return segments.join('/').replace(/\.[cm]?js$/u, '.ts');
}

/** Every name a binding pattern introduces (`{ a, b: [c] }` → a, c). */
function patternNames(name: ts.BindingName, into: Map<string, ts.Node>, declaration: ts.Node): void {
  if (ts.isIdentifier(name)) {
    into.set(name.text, declaration);
    return;
  }
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) patternNames(element.name, into, declaration);
  }
}

/** The names a single statement declares, mapped to the node that declares them. */
function statementBindings(statement: ts.Node, into: Map<string, ts.Node>): void {
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) patternNames(declaration.name, into, declaration);
    return;
  }
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    if (clause?.name !== undefined) into.set(clause.name.text, clause.name);
    const bindings = clause?.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) into.set(element.name.text, element);
    } else if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      into.set(bindings.name.text, bindings);
    }
    return;
  }
  if (
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
    statement.name !== undefined &&
    ts.isIdentifier(statement.name)
  ) {
    into.set(statement.name.text, statement);
  }
}

/**
 * Every name the given node introduces into the scope IT creates, mapped to the
 * declaring node. Enumerating scopes is a closed problem — the language has a
 * fixed list — whereas enumerating "declaration forms that revoke a name" is an
 * open one, and the open version is what this guard used to attempt.
 */
function bindingsIntroducedBy(node: ts.Node): ReadonlyMap<string, ts.Node> {
  const bindings = new Map<string, ts.Node>();
  if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node) || ts.isCaseClause(node)) {
    for (const statement of node.statements) statementBindings(statement, bindings);
    return bindings;
  }
  if (ts.isFunctionLike(node)) {
    for (const parameter of node.parameters) patternNames(parameter.name, bindings, parameter);
    // A function expression's own name is in scope inside its body.
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name !== undefined) {
      bindings.set(node.name.text, node);
    }
    return bindings;
  }
  if (ts.isCatchClause(node) && node.variableDeclaration !== undefined) {
    patternNames(node.variableDeclaration.name, bindings, node.variableDeclaration);
    return bindings;
  }
  if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
    const initializer = node.initializer;
    if (initializer !== undefined && ts.isVariableDeclarationList(initializer)) {
      for (const declaration of initializer.declarations) patternNames(declaration.name, bindings, declaration);
    }
    return bindings;
  }
  if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name !== undefined) {
    bindings.set(node.name.text, node);
  }
  return bindings;
}

/**
 * The declaration that binds `identifier` AT ITS USE SITE, found by walking
 * outward through the scopes that enclose it. `undefined` means unbound here
 * (a global, or an ambient).
 */
function nearestBinding(identifier: ts.Identifier): ts.Node | undefined {
  const name = identifier.text;
  let current: ts.Node | undefined = identifier.parent;
  while (current !== undefined) {
    const bound = bindingsIntroducedBy(current).get(name);
    if (bound !== undefined) return bound;
    current = current.parent;
  }
  return undefined;
}

/** Whether an import specifier brings in the approved escape from an approved module. */
function isApprovedEscapeImport(
  specifier: ts.ImportSpecifier,
  path: string,
  approvedSpecifiers: ReadonlySet<string>,
): boolean {
  if ((specifier.propertyName?.text ?? specifier.name.text) !== ESCAPE_EXPORT_NAME) return false;
  const declaration = specifier.parent.parent.parent;
  if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteralLike(declaration.moduleSpecifier)) return false;
  const text = declaration.moduleSpecifier.text;
  const target = text.startsWith('.') ? resolveRelative(path, text) : text;
  return APPROVED_ESCAPE_MODULES.has(target) || approvedSpecifiers.has(target);
}

/**
 * Whether the call's callee RESOLVES to an approved escape.
 *
 * Resolution happens at the CALL SITE, not across the file. The previous shape
 * built one file-wide set of approved names and then tried to subtract the
 * shadows, which required enumerating every declaration form that can shadow —
 * an open grammar. Review reported the same defect eight times over successive
 * commits as each newly-enumerated form left a neighbour standing: a local
 * const, then a function parameter, then a catch binding. Walking outward from
 * the use site inverts that: the FIRST enclosing scope that binds the name
 * wins, so every binding form is covered at once, including forms nobody has
 * thought of, and only an approved import (or an approved module's own
 * top-level declaration) can satisfy it.
 */
function isEscapeCall(expression: ts.Expression, path: string, approvedSpecifiers: ReadonlySet<string>): boolean {
  const current = unwrap(expression);
  if (!ts.isCallExpression(current)) return false;
  const callee = unwrap(current.expression);
  if (!ts.isIdentifier(callee)) return false;

  const binding = nearestBinding(callee);
  if (binding === undefined) return false; // Unbound: a global is never the approved helper.
  if (ts.isImportSpecifier(binding)) return isApprovedEscapeImport(binding, path, approvedSpecifiers);

  // An approved module may call the escape it declares itself — but only when
  // the binding really is that module's own top-level declaration.
  if (!APPROVED_ESCAPE_MODULES.has(path) || callee.text !== ESCAPE_EXPORT_NAME) return false;
  const declaredAtTopLevel =
    (ts.isFunctionDeclaration(binding) || ts.isVariableDeclaration(binding)) &&
    binding.getSourceFile() !== undefined &&
    scopeOf(binding) === binding.getSourceFile();
  return declaredAtTopLevel;
}

function scopeOf(node: ts.Node): Scope {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) return current;
    current = current.parent;
  }
  return node.getSourceFile();
}

type ScopeBindings = ReadonlyMap<Scope, ReadonlyMap<string, ts.VariableDeclaration | null>>;

function collectConstBindings(sourceFile: ts.SourceFile): ScopeBindings {
  const mutable = new Map<Scope, Map<string, ts.VariableDeclaration | null>>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const scope = scopeOf(node);
      const bindings = mutable.get(scope) ?? new Map<string, ts.VariableDeclaration | null>();
      bindings.set(node.name.text, bindings.has(node.name.text) ? null : node);
      mutable.set(scope, bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return mutable;
}

function isProvablyEscaped(
  expression: ts.Expression,
  scope: Scope,
  bindingsByScope: ScopeBindings,
  path: string,
  approvedSpecifiers: ReadonlySet<string>,
): boolean {
  const current = unwrap(expression);
  if (isEscapeCall(current, path, approvedSpecifiers)) return true;
  if (!ts.isIdentifier(current)) return false;
  const declaration = bindingsByScope.get(scope)?.get(current.text);
  return declaration !== undefined && declaration !== null && declaration.initializer !== undefined
    ? isEscapeCall(declaration.initializer, path, approvedSpecifiers)
    : false;
}

function templateParts(node: ts.TemplateLiteral): TemplateParts {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return { chunks: [node.text], expressions: [] };
  return {
    chunks: [node.head.text, ...node.templateSpans.map((span) => span.literal.text)],
    expressions: node.templateSpans.map((span) => span.expression),
  };
}

function unescapedQuoteIndex(text: string, start = 0): number {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== '"') continue;
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashCount += 1;
    if (slashCount % 2 === 0) return index;
  }
  return -1;
}

function locationOf(sourceFile: ts.SourceFile, node: ts.Node): { line: number; column: number } {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: location.line + 1, column: location.character + 1 };
}

function finding(
  source: CssIdentitySource,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  reason: CssIdentityFinding['reason'],
  expression: string,
): CssIdentityFinding {
  return { path: source.path, ...locationOf(sourceFile, node), reason, expression };
}

function scanAnchor(
  source: CssIdentitySource,
  sourceFile: ts.SourceFile,
  node: ts.TemplateLiteral,
  parts: TemplateParts,
  chunkIndex: number,
  anchorOffset: number,
  bindingsByScope: ScopeBindings,
  path: string,
  approvedSpecifiers: ReadonlySet<string>,
): readonly CssIdentityFinding[] {
  const findings: CssIdentityFinding[] = [];
  const identityStart = anchorOffset + BOUNDARY_SELECTOR_ANCHOR.length;
  if (unescapedQuoteIndex(parts.chunks[chunkIndex] ?? '', identityStart) !== -1) return findings;

  const scope = scopeOf(node);
  let closed = false;
  for (let expressionIndex = chunkIndex; expressionIndex < parts.expressions.length; expressionIndex += 1) {
    const expression = parts.expressions[expressionIndex]!;
    if (!isProvablyEscaped(expression, scope, bindingsByScope, path, approvedSpecifiers)) {
      findings.push(finding(source, sourceFile, expression, 'unescaped-interpolation', expression.getText(sourceFile)));
    }
    if (unescapedQuoteIndex(parts.chunks[expressionIndex + 1] ?? '') !== -1) {
      closed = true;
      break;
    }
  }

  if (!closed) {
    findings.push(finding(source, sourceFile, node, 'unclosed-quoted-identity', node.getText(sourceFile)));
  }
  return findings;
}

/** Scan template literals whose static text opens a boundary-identity selector. */
export function scanCssIdentitySurface(
  files: readonly CssIdentitySource[],
  options: CssIdentityScanOptions = {},
): CssIdentityScanResult {
  const findings: CssIdentityFinding[] = [];
  const approvedSpecifiers = new Set(options.approvedEscapeSpecifiers ?? []);
  let anchoredCount = 0;

  for (const source of files) {
    const path = source.path.replaceAll('\\', '/');
    if (!PACKAGE_SOURCE_PATH.test(path)) continue;
    const sourceFile = ts.createSourceFile(path, source.text, ts.ScriptTarget.Latest, true, scriptKindFor(path));
    const bindingsByScope = collectConstBindings(sourceFile);

    const visit = (node: ts.Node): void => {
      if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const parts = templateParts(node);
        let isAnchored = false;
        for (let chunkIndex = 0; chunkIndex < parts.chunks.length; chunkIndex += 1) {
          const chunk = parts.chunks[chunkIndex] ?? '';
          let from = 0;
          for (;;) {
            const anchorOffset = chunk.indexOf(BOUNDARY_SELECTOR_ANCHOR, from);
            if (anchorOffset === -1) break;
            isAnchored = true;
            findings.push(
              ...scanAnchor(
                source,
                sourceFile,
                node,
                parts,
                chunkIndex,
                anchorOffset,
                bindingsByScope,
                path,
                approvedSpecifiers,
              ),
            );
            from = anchorOffset + BOUNDARY_SELECTOR_ANCHOR.length;
          }
        }
        if (isAnchored) anchoredCount += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return { findings, anchoredCount };
}
