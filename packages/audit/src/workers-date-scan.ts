/**
 * THE ONE module-scope ambient-Date scanner (F-PROTO-3 / #115 / #117).
 *
 * Law 5 (the 1970 trap): a `Date.now()` / `new Date()` evaluated at MODULE LOAD in a
 * Workers bundle reads the frozen/epoch clock — the value is baked once at isolate
 * start, never per request. This scanner finds exactly those module-load reads.
 *
 * THE CURE (F-PROTO-3). The predecessor was a REGEX heuristic that (a) blanked whole
 * template literals (so `\`${Date.now()}\`` was invisible), (b) neutralised expression-
 * bodied arrows (so an IIFE `(() => Date.now())()` that RUNS at load was invisible), and
 * (c) split on the first function/class and scanned only the prefix (so a non-exported
 * `const t = Date.now()` AFTER `function foo(){}` and a class STATIC initializer were
 * never scanned). All four miss-classes are false negatives on a warn-only probe — silent
 * drift (Law 1). The fix is a REAL AST: parse with `ts.createSourceFile` (the PARSER — no
 * `ts.Program`/checker needed; module-load reachability is decidable from the syntax tree)
 * and walk the module-EXECUTION spine.
 *
 * Law 6 (ONE source): the doctor probe (`probeWorkersModuleScopeDate`) and the consumer
 * audit (`scanConsumerAppSource`) both call {@link scanModuleScopeDateReads}. There is no
 * second heuristic to drift from this one.
 *
 * THE EXECUTION MODEL. A statement at the top level runs at module load; every expression
 * inside it runs at load too — EXCEPT the body of a function/method/getter/setter/constructor,
 * which is DEFERRED until that function is later called. So the walk descends through everything
 * EXCEPT deferred function bodies, with these load-time re-entries that the naive "stop at any
 * function" rule would wrongly skip:
 *   - an IMMEDIATELY-INVOKED function/arrow (`(() => Date.now())()`) — the callee body runs now;
 *   - a call to a MODULE-SCOPE helper (`function boot(){…}; const t = boot()`) — reaching the call
 *     at load runs the helper's body now, so the walk follows it (cycle-guarded);
 *   - a class STATIC field initializer and `static {}` block — they run at class definition;
 *   - a class heritage expression, computed member name, and decorator — evaluated at definition.
 * Call-time reads (a plain method/getter body, an instance field initializer) are CORRECT and
 * are never flagged — that is the whole point of injecting a per-request clock.
 *
 * A DETERMINISTIC construction is NOT an ambient read: `new Date(explicitArg)` (any argument)
 * and `Date.UTC(...)` / `Date.parse(...)` do not read the wall clock, so only the argument-less
 * `new Date()` is flagged. The function-call form `Date(...)` always returns the current-time
 * STRING regardless of its arguments, so it is flagged whenever it appears.
 *
 * PURE — no I/O, no `ts.Program`. Parse errors do not throw (the recovery parser yields a
 * best-effort tree), so a malformed file surfaces fewer hits, never a crash.
 *
 * @module
 */
import ts from 'typescript';

/** One module-load ambient-Date read, with its 1-based source position. */
export interface ModuleScopeDateHit {
  /** 1-based line of the read. */
  readonly line: number;
  /** 1-based column of the read. */
  readonly column: number;
  /** Which ambient-time API was read. */
  readonly kind: 'Date.now' | 'new Date' | 'Date';
  /** A short display of the read (`Date.now()`). */
  readonly text: string;
}

/** Pick the parse mode from the file extension so `.tsx`/`.jsx` JSX parses without a config. */
function scriptKindFor(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return ts.ScriptKind.TSX;
  return ts.ScriptKind.TS;
}

/** Peel the value-preserving wrappers (`(expr)`, `expr as T`, `expr!`, `expr satisfies T`) off a callee. */
function unwrapCallee(expr: ts.Expression): ts.Expression {
  let e: ts.Expression = expr;
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isSatisfiesExpression(e)
    ) {
      e = e.expression;
      continue;
    }
    break;
  }
  return e;
}

/** A function LITERAL whose body runs when it is invoked — the two shapes an IIFE callee can take. */
function isInvocableFunction(node: ts.Node): node is ts.FunctionExpression | ts.ArrowFunction {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node);
}

/** A function-like whose body is DEFERRED (runs only when later called) — never scanned as load-time. */
function isDeferredFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

/** The decorators on a node, or `[]` when the node cannot carry them. */
function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

/** Does a class member carry the `static` modifier (so its initializer runs at class definition)? */
function isStatic(node: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

/** Classify a node as an AMBIENT wall-clock read, or `undefined` when it is deterministic / unrelated. */
function ambientDateRead(node: ts.Node): { kind: ModuleScopeDateHit['kind']; text: string } | undefined {
  // `new Date()` — ambient ONLY with zero arguments; `new Date(<arg>)` is a deterministic construction.
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date') {
    return node.arguments === undefined || node.arguments.length === 0
      ? { kind: 'new Date', text: 'new Date()' }
      : undefined;
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    // `Date.now(...)` — the canonical ambient read.
    if (
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === 'Date' &&
      callee.name.text === 'now'
    ) {
      return { kind: 'Date.now', text: 'Date.now()' };
    }
    // `Date["now"](...)` — the bracket spelling of the same read.
    if (
      ts.isElementAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === 'Date' &&
      ts.isStringLiteralLike(callee.argumentExpression) &&
      callee.argumentExpression.text === 'now'
    ) {
      return { kind: 'Date.now', text: 'Date["now"]()' };
    }
    // Bare `Date(...)` called as a function (not `new`) returns the current-time string regardless of args.
    if (ts.isIdentifier(callee) && callee.text === 'Date') {
      return { kind: 'Date', text: 'Date()' };
    }
  }
  return undefined;
}

/** A function whose body the scanner WALKS when it is invoked during module load. */
type LoadTimeFunction = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

/**
 * Scan state threaded through the walk: the source (for positions), the hit sink, the
 * module-scope function table (name → body) used to follow load-time helper CALLS, and the
 * in-progress set that breaks call cycles / recursion so the walk always terminates.
 */
interface ScanContext {
  readonly sourceFile: ts.SourceFile;
  readonly hits: ModuleScopeDateHit[];
  readonly localFns: ReadonlyMap<string, LoadTimeFunction>;
  readonly walking: Set<LoadTimeFunction>;
}

/**
 * Index the MODULE-SCOPE `function name(){}` declarations and `const name = <function literal>`
 * bindings by name. A module-load call to one of these runs its body at load, so `walkExecuting`
 * follows it. Only top-level names (a call reaching one has run during module load), and only
 * `const` bindings (not `let`/`var`, whose reassignment could point the name at a different body
 * than the call actually invokes — a false positive on a warn-only probe).
 */
function collectTopLevelFunctions(sourceFile: ts.SourceFile): Map<string, LoadTimeFunction> {
  const table = new Map<string, LoadTimeFunction>();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined && statement.body !== undefined) {
      table.set(statement.name.text, statement);
      continue;
    }
    if (ts.isVariableStatement(statement) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer !== undefined && isInvocableFunction(decl.initializer)) {
          table.set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  return table;
}

/**
 * Walk `node` as a MODULE-LOAD-executing expression/statement, pushing every ambient Date read into
 * `ctx.hits`. Descends through all children EXCEPT deferred function bodies, with the load-time re-entries
 * (IIFE, a call to a module-scope helper, class static parts) handled explicitly.
 */
function walkExecuting(node: ts.Node, ctx: ScanContext): void {
  const read = ambientDateRead(node);
  if (read !== undefined) {
    const { line, character } = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart(ctx.sourceFile));
    ctx.hits.push({ line: line + 1, column: character + 1, kind: read.kind, text: read.text });
  }

  // A call / new: the callee body runs now when it is an immediately-invoked function literal OR a
  // call to a module-scope helper (`const t = boot()` runs `boot`'s body at load); the arguments
  // always run now. (`ambientDateRead` above already recorded a `Date`/`Date.now` head.)
  if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
    const callee = unwrapCallee(node.expression);
    if (isInvocableFunction(callee)) {
      walkImmediateFunction(callee, ctx);
    } else {
      // A bare call to a module-scope function runs its body NOW — follow it, guarding call
      // cycles. Constructors (`new LocalClass()`) are intentionally not followed here; the
      // scanner's model is function helpers reached during load execution.
      if (ts.isCallExpression(node) && ts.isIdentifier(callee)) {
        const target = ctx.localFns.get(callee.text);
        if (target !== undefined && !ctx.walking.has(target)) {
          ctx.walking.add(target);
          walkImmediateFunction(target, ctx);
          ctx.walking.delete(target);
        }
      }
      walkExecuting(node.expression, ctx);
    }
    for (const arg of node.arguments ?? []) walkExecuting(arg, ctx);
    return;
  }

  // A deferred function-like reached as a VALUE (assigned, passed, returned) — its body runs later, not now.
  if (isDeferredFunctionLike(node)) return;

  // A class definition: only its static initializers / static blocks / heritage / computed names / decorators
  // run at definition (module load); method + instance-field bodies are deferred.
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    walkClassDefinition(node, ctx);
    return;
  }

  ts.forEachChild(node, (child) => walkExecuting(child, ctx));
}

/**
 * Layer the function body's OWN local helper declarations over the enclosing table so a call
 * to a nested helper is followed inside the executing scope. A helper declared AND invoked
 * during load — `(() => { function boot() { return Date.now() } return boot() })()` — runs at
 * module load, but `boot` is not a module-scope name, so without this the call to `boot()` is
 * never followed and the frozen-clock read is missed (Codex P2). Hoisted `function`
 * declarations are visible anywhere in the body; `const` fn bindings mirror the module-scope
 * collector's rule (Law 6: one indexing definition). Locals shadow the enclosing name.
 */
function scopeWithLocalFunctions(
  body: ts.Node,
  base: ReadonlyMap<string, LoadTimeFunction>,
): ReadonlyMap<string, LoadTimeFunction> {
  if (!ts.isBlock(body)) return base;
  let table: Map<string, LoadTimeFunction> | undefined;
  for (const statement of body.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined && statement.body !== undefined) {
      (table ??= new Map(base)).set(statement.name.text, statement);
      continue;
    }
    if (ts.isVariableStatement(statement) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer !== undefined && isInvocableFunction(decl.initializer)) {
          (table ??= new Map(base)).set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  return table ?? base;
}

/**
 * A function body that RUNS at module load — an immediately-invoked literal, or a module-scope
 * helper the walk followed at its call site. Its parameter defaults + body execute now, with the
 * body's own nested helper declarations indexed so calls to them are followed too.
 */
function walkImmediateFunction(fn: LoadTimeFunction, ctx: ScanContext): void {
  const localFns = fn.body !== undefined ? scopeWithLocalFunctions(fn.body, ctx.localFns) : ctx.localFns;
  const scoped: ScanContext = localFns === ctx.localFns ? ctx : { ...ctx, localFns };
  for (const param of fn.parameters) {
    if (param.initializer !== undefined) walkExecuting(param.initializer, scoped);
  }
  if (fn.body !== undefined) walkExecuting(fn.body, scoped);
}

/** The parts of a class that execute at class DEFINITION (module load) — everything else is deferred. */
function walkClassDefinition(node: ts.ClassDeclaration | ts.ClassExpression, ctx: ScanContext): void {
  for (const dec of decoratorsOf(node)) walkExecuting(dec.expression, ctx);
  for (const heritage of node.heritageClauses ?? []) {
    for (const type of heritage.types) walkExecuting(type.expression, ctx);
  }
  for (const member of node.members) {
    for (const dec of decoratorsOf(member)) walkExecuting(dec.expression, ctx);
    // A computed member name is evaluated at class definition.
    if (member.name !== undefined && ts.isComputedPropertyName(member.name)) {
      walkExecuting(member.name.expression, ctx);
    }
    // A STATIC field initializer runs at class definition; an instance field runs at construction (deferred).
    if (ts.isPropertyDeclaration(member) && isStatic(member) && member.initializer !== undefined) {
      walkExecuting(member.initializer, ctx);
      continue;
    }
    // A `static {}` block runs at class definition.
    if (ts.isClassStaticBlockDeclaration(member)) {
      for (const statement of member.body.statements) walkExecuting(statement, ctx);
    }
    // Methods / accessors / constructor bodies are deferred — never scanned here.
  }
}

/** De-duplicate hits sharing a (line, column, text) — a defensive collapse for overlapping visits. */
function dedupe(hits: readonly ModuleScopeDateHit[]): ModuleScopeDateHit[] {
  const seen = new Set<string>();
  const out: ModuleScopeDateHit[] = [];
  for (const hit of hits) {
    const key = `${hit.line}:${hit.column}:${hit.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

/**
 * THE PUBLIC ENTRY — every MODULE-LOAD ambient-Date read in `source`, each with its 1-based line/column.
 * Shared by the doctor probe and the consumer-app audit so both agree on ONE definition (Law 6). Returns
 * `[]` when the file reads the clock only inside deferred (call-time) bodies — the safe pattern.
 *
 * `fileName` only selects the parse mode (`.tsx`/`.jsx` → JSX); the scan is independent of the path.
 */
export function scanModuleScopeDateReads(source: string, fileName = 'module.ts'): readonly ModuleScopeDateHit[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileName),
  );
  const ctx: ScanContext = {
    sourceFile,
    hits: [],
    localFns: collectTopLevelFunctions(sourceFile),
    walking: new Set(),
  };
  for (const statement of sourceFile.statements) walkExecuting(statement, ctx);
  return dedupe(ctx.hits);
}

/** Convenience boolean: does `source` read the wall clock at module load? (doctor's warn/ok discriminant.) */
export function hasModuleScopeDateRead(source: string, fileName = 'module.ts'): boolean {
  return scanModuleScopeDateReads(source, fileName).length > 0;
}
