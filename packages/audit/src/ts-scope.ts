/**
 * Lexical binding resolution over a TypeScript AST.
 *
 * THE CLASS RULE: the ANCHOR is the chain of scopes enclosing a use site; the
 * ALLOWLIST is the set of declaration forms each scope kind introduces.
 * Resolving a name means finding the declaration that OWNS it where it is
 * used. Scanners that instead build one file-wide name set and subtract the
 * shadows must enumerate the forms that shadow — const, function, parameter,
 * catch binding, for-of head, import, class, named function expression, and
 * whatever the language adds next. That is an open grammar, and review found
 * its holes one spelling at a time. The scopes a use site sits inside are a
 * CLOSED chain, so this module walks them instead.
 *
 * Consumers: the CSS identity surface (proving an interpolation was escaped by
 * the approved helper and not by a local shadow) and the dynamic-code residue
 * sweep (proving an `eval`/`Function` token is the global capability and not a
 * local binding that merely carries the name).
 *
 * @module
 */

import ts from 'typescript';

/** The node kinds that own a lexical scope for the purposes of this walk. */
export type BindingScope = ts.SourceFile | ts.Block;

/** Record every name a binding pattern introduces, mapped to its declaration. */
export function patternNames(name: ts.BindingName, into: Map<string, ts.Node>, declaration: ts.Node): void {
  if (ts.isIdentifier(name)) {
    into.set(name.text, declaration);
    return;
  }
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) patternNames(element.name, into, declaration);
  }
}

/** Record the bindings one statement contributes to its enclosing scope. */
export function statementBindings(statement: ts.Node, into: Map<string, ts.Node>): void {
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
 * The bindings introduced by one node, if it introduces a scope at all.
 *
 * Every arm here is a scope KIND, not a declaration spelling: adding a new way
 * to declare a const does not require a new arm, which is the property that
 * makes this closed where a shadow-form enumeration is open.
 */
export function bindingsIntroducedBy(node: ts.Node): ReadonlyMap<string, ts.Node> {
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
 * The declaration that owns `identifier` at its use site, or `undefined` when
 * no enclosing scope binds the name — which is what makes it a free reference
 * to whatever the host environment provides.
 */
export function nearestBinding(identifier: ts.Identifier): ts.Node | undefined {
  const name = identifier.text;
  let current: ts.Node | undefined = identifier.parent;
  while (current !== undefined) {
    const bound = bindingsIntroducedBy(current).get(name);
    if (bound !== undefined) return bound;
    current = current.parent;
  }
  return undefined;
}

/** The nearest block or source file enclosing `node`. */
export function scopeOf(node: ts.Node): BindingScope {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) return current;
    current = current.parent;
  }
  return node.getSourceFile();
}
