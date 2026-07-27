/**
 * Parser-backed census of calls to the shared `Diagnostics` facade.
 *
 * The reusable audit host owns the TypeScript parser; the lean gauntlet consumes
 * only the flat call records. Unrelated strings, comments, and fixture prose are
 * therefore not promoted into fake emitters, while literal, template-literal,
 * and local-constant codes remain statically accountable.
 *
 * @module
 */
import ts from 'typescript';

/** Diagnostics facade methods the generic parser recognizes. */
export type DiagnosticEmitterMethod =
  'warn' | 'error' | 'warnOnce' | 'warnRegistered' | 'errorRegistered' | 'warnOnceRegistered';

/** Flat parser receipt consumed structurally by the lean gauntlet host seam. */
export interface DiagnosticEmissionMatch {
  readonly method: DiagnosticEmitterMethod;
  readonly code?: string;
  readonly line: number;
}

const METHODS = new Set<DiagnosticEmitterMethod>([
  'warn',
  'error',
  'warnOnce',
  'warnRegistered',
  'errorRegistered',
  'warnOnceRegistered',
]);

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameText(name: ts.PropertyName | undefined): string | undefined {
  if (name === undefined) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

/** Return every parser-proven Diagnostics call in `source`. */
export function detectDiagnosticEmissionsAST(source: string): readonly DiagnosticEmissionMatch[] {
  const file = ts.createSourceFile(
    '__diagnostic-emissions__.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const bindings = new Map<string, ts.Expression | null>();

  const collectBindings = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      bindings.set(node.name.text, bindings.has(node.name.text) ? null : node.initializer);
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(file);

  const resolveExpression = (expression: ts.Expression, seen = new Set<string>()): ts.Expression | undefined => {
    const current = unwrap(expression);
    if (!ts.isIdentifier(current)) return current;
    if (seen.has(current.text)) return undefined;
    const target = bindings.get(current.text);
    if (target === undefined || target === null) return undefined;
    seen.add(current.text);
    return resolveExpression(target, seen);
  };

  const resolveString = (expression: ts.Expression): string | undefined => {
    const current = resolveExpression(expression);
    if (current === undefined) return undefined;
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
    if (ts.isPropertyAccessExpression(current)) {
      const owner = resolveExpression(current.expression);
      if (owner === undefined || !ts.isObjectLiteralExpression(owner)) return undefined;
      const member = owner.properties.find(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) && propertyNameText(property.name) === current.name.text,
      );
      return member === undefined ? undefined : resolveString(member.initializer);
    }
    return undefined;
  };

  const objectCode = (expression: ts.Expression): string | undefined => {
    const current = resolveExpression(expression);
    if (current === undefined || !ts.isObjectLiteralExpression(current)) return undefined;
    const property = current.properties.find((candidate) => propertyNameText(candidate.name) === 'code');
    if (property === undefined) return undefined;
    if (ts.isPropertyAssignment(property)) return resolveString(property.initializer);
    if (ts.isShorthandPropertyAssignment(property)) return resolveString(property.name);
    return undefined;
  };

  const matches: DiagnosticEmissionMatch[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const method = node.expression.name.text as DiagnosticEmitterMethod;
      if (ts.isIdentifier(receiver) && receiver.text === 'Diagnostics' && METHODS.has(method)) {
        const argument = node.arguments[0];
        const code = argument === undefined ? undefined : objectCode(argument);
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        matches.push({ method, ...(code === undefined ? {} : { code }), line });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return matches;
}
