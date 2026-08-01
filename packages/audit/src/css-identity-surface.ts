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

function isEscapeCall(expression: ts.Expression): boolean {
  const current = unwrap(expression);
  if (!ts.isCallExpression(current)) return false;
  const callee = unwrap(current.expression);
  return ts.isIdentifier(callee) && callee.text === 'escapeCssString';
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

function isProvablyEscaped(expression: ts.Expression, scope: Scope, bindingsByScope: ScopeBindings): boolean {
  const current = unwrap(expression);
  if (isEscapeCall(current)) return true;
  if (!ts.isIdentifier(current)) return false;
  const declaration = bindingsByScope.get(scope)?.get(current.text);
  return declaration !== undefined && declaration !== null && declaration.initializer !== undefined
    ? isEscapeCall(declaration.initializer)
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
): readonly CssIdentityFinding[] {
  const findings: CssIdentityFinding[] = [];
  const identityStart = anchorOffset + BOUNDARY_SELECTOR_ANCHOR.length;
  if (unescapedQuoteIndex(parts.chunks[chunkIndex] ?? '', identityStart) !== -1) return findings;

  const scope = scopeOf(node);
  let closed = false;
  for (let expressionIndex = chunkIndex; expressionIndex < parts.expressions.length; expressionIndex += 1) {
    const expression = parts.expressions[expressionIndex]!;
    if (!isProvablyEscaped(expression, scope, bindingsByScope)) {
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
export function scanCssIdentitySurface(files: readonly CssIdentitySource[]): CssIdentityScanResult {
  const findings: CssIdentityFinding[] = [];
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
            findings.push(...scanAnchor(source, sourceFile, node, parts, chunkIndex, anchorOffset, bindingsByScope));
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
