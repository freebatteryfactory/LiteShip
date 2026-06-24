/**
 * The TAINT IR ORACLE (the TAINT-ANALYSIS family — generic dataflow).
 *
 * This is a NEW repo-IR oracle, sibling to {@link symbolReferenceOracle}: it uses
 * the SAME type-directed `ts.Program` + checker the repo-IR builder and the
 * capsule detector use, and traces DATAFLOW from an untrusted SOURCE call to a
 * dangerous SINK call argument, observing any SANITIZER on the path. It emits
 * GENERIC taint FACTS — `{ source, sink, sanitizedBy?, path }` — and stays
 * LiteShip-AGNOSTIC: the SOURCE / SINK / SANITIZER classification is INJECTED as a
 * parameter ({@link TaintRegistry}), so `@czap/audit` references NO LiteShip
 * source/sink name. The LiteShip-LOCAL registry (the shader-source fetch, the
 * AI-cast graph-apply, the runtime-URL SSRF seam, …) lives with the `@czap/cli`
 * HOST and is injected here, exactly the ADR-0012 / D7b boundary the
 * `invariant-regex` FactOracle hook uses.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DATAFLOW DEPTH — BOTH DIRECTIONS, DEEP ENOUGH FOR THE REAL SURFACES.
 *
 * Full interprocedural dataflow analysis (a whole-program points-to + a context-
 * sensitive value-flow graph) is a known hard problem; this oracle is a SOUND-
 * DIRECTION under-approximation that traces BOTH the backward (return) and the
 * forward (parameter-passing) directions, with a depth bound high enough to reach
 * LiteShip's real injection surfaces — the bound is a TERMINATION guarantee, not a
 * coverage excuse. The bound is REPORTED as a fact
 * ({@link TaintFacts.interproceduralDepth}) for self-description. Exactly what it
 * covers:
 *
 *   1. INTRA-PROCEDURAL DEF-USE (depth 0, always). For each SINK call argument, it
 *      resolves the argument expression to its source value by following, within
 *      the enclosing function/module scope:
 *        • a direct SOURCE call (or an `await` of one, or a member-call chained off
 *          one — e.g. `(await fetch(u)).text()`);
 *        • a `const`/`let` binding whose initializer is (transitively) tainted;
 *        • a property/await/paren/as-cast wrapper around a tainted value;
 *        • a tainted value nested inside an OBJECT / ARRAY literal or a TEMPLATE
 *          expression — `createShaderModule({ code: tainted })` reaches the sink
 *          through the wrapping `{ code: … }` literal, so the trace descends into
 *          literal property values + template substitutions.
 *   2. BOUNDED INTERPROCEDURAL RETURN HOPS (the BACKWARD direction). When a tainted
 *      value flows through a call to a LOCAL function (resolved by the checker to a
 *      declaration in the corpus) whose RETURN is tainted, the trace hops INTO that
 *      function and folds its returns — e.g. `const s = await fetchShaderSource(u)`
 *      where `fetchShaderSource` returns `await fetch(u).text()`.
 *   3. BOUNDED INTERPROCEDURAL PARAMETER HOPS (the FORWARD direction — the shader
 *      surface). When a sink argument resolves to a function PARAMETER (the value
 *      was passed IN by a caller), the trace finds every call site of that function
 *      (a deterministic caller index over the program) and traces the ARGUMENT
 *      passed at the parameter's positional index. This is the
 *      `fetch → let fragSource → prependGlslDeclarations(fragSource) →
 *      createProgram(…, frag, …) → compileShader(…, fragSrc, …) →
 *      gl.shaderSource(shader, source)` shape: `source` is `compileShader`'s
 *      parameter, `fragSrc` is `createProgram`'s parameter — a value passed as an
 *      ARGUMENT into a callee that sinks it, which the backward-return trace cannot
 *      see. Each hop (return or parameter) consumes one unit of the shared `maxHops`
 *      budget; the budget's default exceeds the deepest real LiteShip surface.
 *   4. SANITIZER BREAK. If, anywhere on the traced path, the value passes through a
 *      SANITIZER call (the value is an argument to, or the result of, a sanitizer),
 *      the taint is BROKEN: the flow is emitted with `sanitizedBy` set (clean), and
 *      the gate reports it only informationally. A sanitizer sanitizes a SPECIFIC
 *      taint — the registry distinguishes a URL guard (`resolveRuntimeUrl`, on the
 *      fetch SOURCE/where) from a CONTENT guard; a value whose URL was guarded but
 *      whose fetched CONTENT was never validated still flows UNSANITIZED into a
 *      content sink (the trace follows the content, not the URL).
 *
 * TERMINATION. The forward + backward hops form a graph that can CYCLE (mutual
 * recursion, a function calling itself). Termination is guaranteed by two devices:
 * a per-trace `seen` set over visited DECLARATIONS (a declaration is folded at most
 * once), and a per-trace `hopped` set over (parameter, call-site) pairs (a
 * parameter is bound from a given call site at most once) — together with the
 * finite `maxHops` budget. The trace provably halts on any corpus.
 *
 * NOT covered (the honest gaps — flows at these shapes are NOT emitted, NOT
 * claimed clean): aliasing through object FIELDS read back later / Maps / mutable
 * arrays element-by-element; flow through closures captured by reference; flow
 * through dynamic dispatch the checker cannot resolve to one declaration;
 * reassignment-order sensitivity (the trace is flow-INSENSITIVE on reassignment —
 * it considers a binding's initializer + any later assignment as possible sources,
 * which is sound-for-finding but may over-approximate a binding mutated after the
 * sink). These are documented limits, not silent ones.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Determinism: the corpus is read sorted (the shared reader sorts); sinks are
 * visited in source order; the emitted flows are sorted before return; no
 * `Date.now` / `Math.random`. Tracing twice over unchanged source yields identical
 * flows — the property the verdict cache depends on.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';
import { InvariantViolationError } from '@czap/error';
import type { TaintFacts, TaintFlow, TaintEndpoint, SanitizerSite, TaintPathStep } from '@czap/gauntlet';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import { readProfileSourceFileRecords } from './shared.js';
import { createTypeDirectedProgram } from './ts-program.js';

/** The oracle id every taint fact this module emits is tagged with (traceability). */
export const TAINT_ORACLE_ID = 'ts-taint';

/**
 * The DEFAULT bounded interprocedural hop depth — the shared budget the FORWARD
 * (parameter-passing) and BACKWARD (return) hops draw from. `8` is a TERMINATION
 * bound, NOT a coverage ceiling: it is set above the deepest real LiteShip
 * injection surface so a KNOWN surface is never missed for "depth". The deepest
 * measured surface is the GLSL shader inject —
 * `fetch → fragSource → prependGlslDeclarations(fragSource) →
 * createProgram(…, fragWithDeclarations, …) → compileShader(…, fragSrc, …) →
 * gl.shaderSource(shader, source)` — which needs 2 parameter hops (`source` ←
 * `compileShader`'s caller, `fragSrc` ← `createProgram`'s caller); the WGSL
 * surface needs 1 return hop into `fetchShaderSource`. `8` clears both with ample
 * margin while the `seen` / `hopped` cycle guards keep the trace finite regardless.
 * Carried into {@link TaintFacts.interproceduralDepth} so the report is self-
 * describing — a downstream that wants a shallower (faster) trace lowers it.
 */
export const DEFAULT_TAINT_INTERPROCEDURAL_DEPTH = 8;

/**
 * The INJECTED source/sink/sanitizer classification — the host-supplied registry
 * (the ADR-0012 / D7b boundary). The oracle references NONE of these names itself;
 * the `@czap/cli` host supplies the LiteShip-LOCAL set. Each is matched against a
 * call expression's CALLEE NAME — the bare identifier (`fetch`, `eval`) OR the
 * member name (`shaderSource`, `createShaderModule`, `innerHTML` as an assignment
 * target, `validateGraphPatchProposal`). A `Set` for O(1) classification.
 */
export interface TaintRegistry {
  /**
   * Callee names whose RETURN value is untrusted (a SOURCE). A call to one of
   * these introduces taint (e.g. `fetch`, `readFileSync`). Also matched as the
   * source of a member chain (`(await fetch(u)).text()` is sourced by `fetch`).
   */
  readonly sources: ReadonlySet<string>;
  /**
   * Callee names that are dangerous SINKS — a tainted value reaching one of their
   * ARGUMENTS is a flow (e.g. `shaderSource`, `createShaderModule`, `eval`,
   * `applyValidatedPatch`). An `innerHTML`-style assignment SINK is matched as the
   * assignment-target property name (see {@link assignmentSinkNames}).
   */
  readonly sinks: ReadonlySet<string>;
  /**
   * Assignment-TARGET property names that are sinks when assigned a tainted value
   * (e.g. `innerHTML`, `outerHTML`). Distinct from {@link sinks} because the
   * dangerous operation is a PROPERTY ASSIGNMENT (`el.innerHTML = tainted`), not a
   * call. Optional — omit for a call-only registry.
   */
  readonly assignmentSinkNames?: ReadonlySet<string>;
  /**
   * Callee names that SANITIZE — a value that passes through one of these (as an
   * argument or as the call's result) has its taint BROKEN (e.g.
   * `validateGraphPatchProposal`, `resolveRuntimeUrl`, `sanitizeElementTree`). A
   * flow whose path crosses a sanitizer is emitted clean (`sanitizedBy` set).
   */
  readonly sanitizers: ReadonlySet<string>;
  /**
   * Human notes per callee name (the WHY carried into the fact's endpoint `note`).
   * A name absent from the map gets a generic note. Optional.
   */
  readonly notes?: Readonly<Record<string, string>>;
}

/** Options for {@link buildRepoIRTaint}. */
export interface BuildRepoIRTaintOptions {
  /** The audit profile (`profile.repoRoot` is the target). Defaults to LiteShip's. */
  readonly profile?: DevopsProfile;
  /**
   * The bounded interprocedural hop depth (default
   * {@link DEFAULT_TAINT_INTERPROCEDURAL_DEPTH}). Reported in the facts so the
   * report states the honest bound. Must be `>= 0`.
   */
  readonly interproceduralDepth?: number;
}

/** The callee NAME of a call expression — the bare id or the member name, or null. */
function calleeName(call: ts.CallExpression): string | null {
  const expr = call.expression;
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

/** The human note for a classified callee — from the registry map, or a generic one. */
function noteFor(registry: TaintRegistry, callee: string, fallback: string): string {
  return registry.notes?.[callee] ?? fallback;
}

/** 1-based line of a node's start in its source file (the fact's location). */
function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/** The human label for a binding name / expression — its identifier text or source. */
function labelOf(name: ts.BindingName | ts.Expression): string {
  return ts.isIdentifier(name) ? name.text : name.getText(name.getSourceFile());
}

/** Unwrap the wrappers that pass a value through unchanged — await / paren / as-cast. */
function unwrap(node: ts.Expression): ts.Expression {
  let current: ts.Expression = node;
  for (;;) {
    if (ts.isParenthesizedExpression(current)) current = current.expression;
    else if (ts.isAwaitExpression(current)) current = current.expression;
    else if (ts.isAsExpression(current)) current = current.expression;
    else if (ts.isNonNullExpression(current)) current = current.expression;
    else return current;
  }
}

/** The repo-relative file + checker handle bundle threaded through the trace. */
interface TraceCtx {
  readonly checker: ts.TypeChecker;
  readonly registry: TaintRegistry;
  readonly maxHops: number;
  /** repo-relative path by absolute path (so a resolved decl maps back to a FileId). */
  readonly relByAbsolute: ReadonlyMap<string, string>;
  /**
   * The CALLER INDEX — every call site (a {@link ts.CallExpression}) in the corpus
   * that resolves to a given function/method/arrow declaration node, keyed by that
   * declaration. Built ONCE per run (deterministic, corpus-order) so the FORWARD
   * parameter hop can answer "who calls this function?" without re-walking. A
   * function with no in-corpus caller maps to an empty list (or is absent).
   */
  readonly callersByDecl: ReadonlyMap<ts.Node, readonly ts.CallExpression[]>;
}

/** A traced taint result — tainted-ness + the sanitizer (if any) + the path steps. */
interface TaintResult {
  readonly tainted: boolean;
  /** The SOURCE endpoint the taint originates at (set iff `tainted`). */
  readonly source: TaintEndpoint | null;
  /** The sanitizer that broke the taint on this path, if any. */
  readonly sanitizedBy: SanitizerSite | null;
  /** The ordered path steps from source toward the queried expression. */
  readonly path: readonly TaintPathStep[];
}

/** The not-tainted result (the common case) — a single shared value. */
const CLEAN: TaintResult = { tainted: false, source: null, sanitizedBy: null, path: [] };

/**
 * The MUTABLE per-candidate trace state — the two cycle guards. A fresh state is
 * minted per sink candidate (taint of one sink argument is independent of
 * another's; sharing would spuriously prune a shared declaration). Together with
 * the finite hop budget these guarantee termination on any corpus:
 *   • `seen` — declaration nodes already folded (a decl is traced at most once);
 *   • `hopped` — `(parameter-node, call-site)` pairs already bound forward (a
 *     parameter is bound from a given caller at most once), so mutual recursion
 *     and self-calls cannot loop.
 */
interface TraceState {
  readonly seen: Set<ts.Node>;
  readonly hopped: Set<string>;
}

/** A fresh per-candidate trace state — empty cycle guards. */
function freshState(): TraceState {
  return { seen: new Set<ts.Node>(), hopped: new Set<string>() };
}

/**
 * A stable key for a (parameter, call-site) forward-hop pair — the parameter's
 * source position plus the call site's source position, so the `hopped` guard is
 * deterministic and node-identity-independent (two visits of the same pair share a
 * key). File name + integer offsets only — never a `Date`/`Math.random`.
 */
function hopKey(parameter: ts.ParameterDeclaration, call: ts.CallExpression): string {
  const pFile = parameter.getSourceFile().fileName;
  const cFile = call.getSourceFile().fileName;
  return `${pFile}@${parameter.pos}->${cFile}@${call.pos}`;
}

/** The repo-relative FileId of a node's source file, or null if outside the corpus. */
function fileIdOf(ctx: TraceCtx, node: ts.Node): string | null {
  return ctx.relByAbsolute.get(resolve(node.getSourceFile().fileName)) ?? null;
}

/**
 * Is `call` a SANITIZER call? Returns the {@link SanitizerSite} when yes, else null.
 * A value that is an argument to (or the result of) such a call is sanitized.
 */
function asSanitizer(ctx: TraceCtx, call: ts.CallExpression): SanitizerSite | null {
  const name = calleeName(call);
  if (name === null || !ctx.registry.sanitizers.has(name)) return null;
  const file = fileIdOf(ctx, call);
  if (file === null) return null;
  return { callee: name, file, line: lineOf(call.getSourceFile(), call) };
}

/**
 * Trace whether `expr` carries a tainted value, bounded by `hopsLeft` interprocedural
 * hops and guarded against declaration revisits by `seen`. Sound-for-finding:
 * follows SOURCE calls, def-use through local bindings, and bounded return hops;
 * records a SANITIZER break. Returns {@link CLEAN} for anything it cannot tie to a
 * source (never a false "tainted").
 */
function traceExpression(ctx: TraceCtx, expr: ts.Expression, hopsLeft: number, state: TraceState): TaintResult {
  const node = unwrap(expr);

  // ── A direct SOURCE call: `fetch(u)`, `readFileSync(p)` ──────────────────
  if (ts.isCallExpression(node)) {
    // A SANITIZER call BREAKS the taint at this boundary. Trace its arguments for an
    // underlying source: if one is tainted, the flow is REAL but SANITIZED — emit it
    // with BOTH the source (so the report names what was guarded) and the sanitizer
    // site (so the gate treats it as clean). If no argument is tainted, the sanitizer
    // result is simply not a source — CLEAN.
    const sanitizer = asSanitizer(ctx, node);
    if (sanitizer !== null) {
      for (const arg of node.arguments) {
        const inner = traceExpression(ctx, arg, hopsLeft, state);
        if (inner.tainted && inner.source !== null) {
          // Carry the underlying source + path, but mark the taint BROKEN here.
          return { tainted: true, source: inner.source, sanitizedBy: sanitizer, path: inner.path };
        }
      }
      return { tainted: false, source: null, sanitizedBy: sanitizer, path: [] };
    }
    const name = calleeName(node);
    if (name !== null && ctx.registry.sources.has(name)) {
      const file = fileIdOf(ctx, node);
      if (file !== null) {
        const line = lineOf(node.getSourceFile(), node);
        return {
          tainted: true,
          source: { callee: name, file, line, note: noteFor(ctx.registry, name, 'an untrusted source') },
          sanitizedBy: null,
          path: [],
        };
      }
    }
    // A member-call off a tainted receiver — `(await fetch(u)).text()`: the taint
    // flows through the chain. Trace the receiver.
    if (ts.isPropertyAccessExpression(node.expression)) {
      const recv = traceExpression(ctx, node.expression.expression, hopsLeft, state);
      if (recv.tainted) return recv;
    }
    // A call to a LOCAL function whose return is tainted — a bounded BACKWARD hop.
    if (hopsLeft > 0) {
      const hopped = hopIntoCallee(ctx, node, hopsLeft - 1, state);
      if (hopped.tainted || hopped.sanitizedBy !== null) return hopped;
    }
    return CLEAN;
  }

  // ── A property access off a tainted receiver: `resp.body`, `x.data` ──────
  if (ts.isPropertyAccessExpression(node)) {
    return traceExpression(ctx, node.expression, hopsLeft, state);
  }

  // ── An OBJECT literal — `createShaderModule({ code: tainted })`: the sink
  // consumes a structure WRAPPING the tainted value, so descend into each
  // property's initializer/shorthand value. The first tainted property carries
  // the flow (the wrapping literal is a passthrough container, not a sanitizer).
  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const r = traceExpression(ctx, prop.initializer, hopsLeft, state);
        if (r.tainted || r.sanitizedBy !== null) return r;
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        // `{ code }` — the value is the binding the shorthand name refers to.
        const r = traceIdentifier(ctx, prop.name, hopsLeft, state);
        if (r.tainted || r.sanitizedBy !== null) return r;
      } else if (ts.isSpreadAssignment(prop)) {
        const r = traceExpression(ctx, prop.expression, hopsLeft, state);
        if (r.tainted || r.sanitizedBy !== null) return r;
      }
    }
    return CLEAN;
  }

  // ── An ARRAY literal — `[tainted]`: descend into each element. ───────────
  if (ts.isArrayLiteralExpression(node)) {
    for (const el of node.elements) {
      const inner = ts.isSpreadElement(el) ? el.expression : el;
      const r = traceExpression(ctx, inner, hopsLeft, state);
      if (r.tainted || r.sanitizedBy !== null) return r;
    }
    return CLEAN;
  }

  // ── A TEMPLATE expression — `` `${tainted}` ``: descend into substitutions. ─
  if (ts.isTemplateExpression(node)) {
    for (const span of node.templateSpans) {
      const r = traceExpression(ctx, span.expression, hopsLeft, state);
      if (r.tainted || r.sanitizedBy !== null) return r;
    }
    return CLEAN;
  }

  // ── A string concatenation — `prefix + tainted`: either operand may taint. ─
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = traceExpression(ctx, node.left, hopsLeft, state);
    if (left.tainted || left.sanitizedBy !== null) return left;
    const right = traceExpression(ctx, node.right, hopsLeft, state);
    if (right.tainted || right.sanitizedBy !== null) return right;
    return CLEAN;
  }

  // ── An identifier — resolve its binding + trace the initializer/assignments ─
  if (ts.isIdentifier(node)) {
    return traceIdentifier(ctx, node, hopsLeft, state);
  }

  return CLEAN;
}

/**
 * Trace an identifier to its declaration and fold the taint of its initializer (and
 * any later assignment) — the intra-procedural def-use step. Flow-insensitive on
 * reassignment (a binding's initializer AND any `x = …` assignment are possible
 * sources): sound for FINDING a flow, never a missed-because-of-order false clean.
 */
function traceIdentifier(ctx: TraceCtx, id: ts.Identifier, hopsLeft: number, state: TraceState): TaintResult {
  const symbol = ctx.checker.getSymbolAtLocation(id);
  if (symbol === undefined) return CLEAN;
  const decls = symbol.declarations ?? [];
  for (const decl of decls) {
    if (state.seen.has(decl)) continue;

    // A `const x = <init>` / `let x = <init>` binding — trace the initializer.
    if (ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
      state.seen.add(decl);
      const result = withStep(ctx, traceExpression(ctx, decl.initializer, hopsLeft, state), decl, labelOf(decl.name));
      if (result.tainted || result.sanitizedBy !== null) return result;
      continue;
    }

    // A function PARAMETER — the value was passed IN by a caller. This is the
    // FORWARD interprocedural hop (the shader surface): find every call site of the
    // enclosing function and trace the ARGUMENT passed at this parameter's index.
    // A tainted argument at ANY caller taints the parameter (sound-for-finding).
    // The `seen` add is DEFERRED to per-call-site keys (a parameter may be bound
    // from several callers, each a distinct hop) — the `hopped` guard breaks cycles.
    if (ts.isParameter(decl) && hopsLeft > 0) {
      const fromCaller = hopFromParameter(ctx, decl, hopsLeft - 1, state);
      if (fromCaller.tainted || fromCaller.sanitizedBy !== null) return fromCaller;
    }
  }

  // A later assignment `x = <tainted>` anywhere in the same source file is also a
  // possible source (flow-insensitive). Scan the declaring file's assignments.
  const fromAssignment = traceAssignmentsTo(ctx, symbol, id, hopsLeft, state);
  if (fromAssignment.tainted || fromAssignment.sanitizedBy !== null) return fromAssignment;

  return CLEAN;
}

/**
 * The FORWARD interprocedural hop — bind a function PARAMETER from its callers.
 * Finds the parameter's positional index + its enclosing function, looks the
 * function up in the caller index, and traces the ARGUMENT passed at that index by
 * each caller. Returns the first tainted/sanitized argument; CLEAN otherwise. The
 * `hopped` guard (keyed on the (parameter, call-site) pair) breaks the cycle a
 * recursive/mutually-recursive function would otherwise form.
 *
 * This is what reaches the GLSL shader inject: `gl.shaderSource(shader, source)`'s
 * `source` is `compileShader`'s parameter; the hop finds `compileShader(…, fragSrc,
 * …)` in `createProgram`; `fragSrc` is `createProgram`'s parameter; the hop finds
 * `createProgram(…, fragWithDeclarations, …)`; and that argument is intra-procedural
 * dataflow the def-use trace resolves back to the `fetch`.
 */
function hopFromParameter(
  ctx: TraceCtx,
  parameter: ts.ParameterDeclaration,
  hopsLeft: number,
  state: TraceState,
): TaintResult {
  const fn = parameter.parent;
  // Only a concrete function-like node (declaration / method / arrow / function-
  // expression) has callers the index can resolve — a parameter of a bare call
  // signature / type is not a runtime binding the trace can hop from.
  if (
    !ts.isFunctionDeclaration(fn) &&
    !ts.isMethodDeclaration(fn) &&
    !ts.isArrowFunction(fn) &&
    !ts.isFunctionExpression(fn)
  ) {
    return CLEAN;
  }
  // Resolve the parameter's positional index within its function's parameter list.
  const index = fn.parameters.indexOf(parameter);
  if (index < 0) return CLEAN;
  // The declaration node the caller index keys on. For a `const f = (x) => …` the
  // callers resolve to the VARIABLE DECLARATION (the bound name's symbol), so map an
  // arrow/function-expression body up to its binding when present.
  const declKey = callerIndexKeyFor(fn);
  if (declKey === null) return CLEAN;
  const callers = ctx.callersByDecl.get(declKey);
  if (callers === undefined) return CLEAN;

  for (const call of callers) {
    const key = hopKey(parameter, call);
    if (state.hopped.has(key)) continue;
    state.hopped.add(key);
    const arg = call.arguments[index];
    if (arg === undefined) continue;
    const r = withStep(ctx, traceExpression(ctx, arg, hopsLeft, state), parameter, labelOf(parameter.name));
    if (r.tainted || r.sanitizedBy !== null) return r;
  }
  return CLEAN;
}

/**
 * The caller-index KEY for a function-like node — the declaration the index is
 * keyed by (so a forward hop can look its callers up). A `function f()` / method /
 * function-expression keys on itself; an arrow / function-expression bound to a
 * `const f = …` keys on the VARIABLE DECLARATION (the bound name's symbol is what a
 * caller's `f(…)` resolves to). Returns null for an anonymous inline function the
 * index never recorded.
 */
function callerIndexKeyFor(
  fn: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): ts.Node | null {
  if (ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) return fn;
  // An arrow / function-expression bound to `const f = <fn>` keys on that binding.
  const parent = fn.parent;
  if (ts.isVariableDeclaration(parent) && parent.initializer !== undefined && unwrap(parent.initializer) === fn) {
    return parent;
  }
  return null;
}

/**
 * Scan `id`'s source file for `<id> = <rhs>` assignments to the same symbol and fold
 * the taint of any RHS — the reassignment half of the flow-insensitive def-use.
 */
function traceAssignmentsTo(
  ctx: TraceCtx,
  symbol: ts.Symbol,
  id: ts.Identifier,
  hopsLeft: number,
  state: TraceState,
): TaintResult {
  const sourceFile = id.getSourceFile();
  let result: TaintResult = CLEAN;
  const visit = (node: ts.Node): void => {
    if (result.tainted || result.sanitizedBy !== null) return;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      const lhsSymbol = ctx.checker.getSymbolAtLocation(node.left);
      if (lhsSymbol === symbol) {
        const r = traceExpression(ctx, node.right, hopsLeft, state);
        if (r.tainted || r.sanitizedBy !== null) {
          result = withStep(ctx, r, node, labelOf(node.left));
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

/**
 * Hop into a LOCAL function call whose return value may be tainted — the bounded
 * interprocedural step. Resolves the callee to its declaration via the checker; if
 * the declaration is a function/arrow/method in the corpus, traces each `return`
 * expression. Returns the first tainted/sanitized return; CLEAN otherwise.
 */
function hopIntoCallee(ctx: TraceCtx, call: ts.CallExpression, hopsLeft: number, state: TraceState): TaintResult {
  const symbol = ctx.checker.getSymbolAtLocation(call.expression);
  if (symbol === undefined) return CLEAN;
  const decls = symbol.declarations ?? [];
  for (const decl of decls) {
    const body = functionBodyOf(decl);
    if (body === undefined || state.seen.has(decl)) continue;
    state.seen.add(decl);
    // An arrow with an expression body (`=> <expr>`) returns that expression.
    if (!ts.isBlock(body)) {
      const r = traceExpression(ctx, body, hopsLeft, state);
      if (r.tainted || r.sanitizedBy !== null) return r;
      continue;
    }
    // A block body — fold every `return <expr>`.
    let found: TaintResult = CLEAN;
    const visit = (node: ts.Node): void => {
      if (found.tainted || found.sanitizedBy !== null) return;
      // Do not descend into a NESTED function — its returns are not this callee's.
      if (node !== body && functionBodyOf(node) !== undefined) return;
      if (ts.isReturnStatement(node) && node.expression !== undefined) {
        const r = traceExpression(ctx, node.expression, hopsLeft, state);
        if (r.tainted || r.sanitizedBy !== null) found = r;
        return;
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(body, visit);
    if (found.tainted || found.sanitizedBy !== null) return found;
  }
  return CLEAN;
}

/** The function/arrow/method body of a declaration node, or undefined if not one. */
function functionBodyOf(decl: ts.Node): ts.ConciseBody | undefined {
  if (
    ts.isFunctionDeclaration(decl) ||
    ts.isMethodDeclaration(decl) ||
    ts.isArrowFunction(decl) ||
    ts.isFunctionExpression(decl)
  ) {
    return decl.body;
  }
  // A `const f = () => …` / `const f = function …` binding.
  if (ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
    const init = unwrap(decl.initializer);
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init.body;
  }
  return undefined;
}

/** Prepend a path step (the symbol the value threaded through) to a tainted result. */
function withStep(ctx: TraceCtx, result: TaintResult, node: ts.Node, via: string): TaintResult {
  if (!result.tainted && result.sanitizedBy === null) return result;
  const file = fileIdOf(ctx, node);
  if (file === null) return result;
  const step: TaintPathStep = { via, file, line: lineOf(node.getSourceFile(), node) };
  return { ...result, path: [step, ...result.path] };
}

/** A flat (sink, sourced argument) candidate the visitor collects before tracing. */
interface SinkArgCandidate {
  readonly sinkCallee: string;
  readonly sinkFile: string;
  readonly sinkLine: number;
  readonly argument: ts.Expression;
}

/**
 * Collect every SINK call argument + every assignment-sink RHS in one source file —
 * the candidates the trace runs backward from. A call SINK contributes each of its
 * arguments; an assignment SINK (`el.innerHTML = rhs`) contributes the RHS.
 */
function collectSinkCandidates(
  ctx: TraceCtx,
  sourceFile: ts.SourceFile,
  relativePath: string,
): readonly SinkArgCandidate[] {
  const candidates: SinkArgCandidate[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name !== null && ctx.registry.sinks.has(name)) {
        const line = lineOf(sourceFile, node);
        for (const arg of node.arguments) {
          candidates.push({ sinkCallee: name, sinkFile: relativePath, sinkLine: line, argument: arg });
        }
      }
    }
    // Assignment sink: `<x>.<innerHTML> = <rhs>`.
    if (
      ctx.registry.assignmentSinkNames !== undefined &&
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ctx.registry.assignmentSinkNames.has(node.left.name.text)
    ) {
      candidates.push({
        sinkCallee: node.left.name.text,
        sinkFile: relativePath,
        sinkLine: lineOf(sourceFile, node),
        argument: node.right,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return candidates;
}

/**
 * Build the CALLER INDEX — map every in-corpus function/method/arrow declaration to
 * the call sites that target it, so the FORWARD parameter hop can answer "who calls
 * this?" in O(1). Deterministic: the corpus files are visited in `sourceFiles`
 * order (the caller passes them in record order) and each file's calls in source
 * order, so the per-declaration caller LISTS are stable. A call whose callee the
 * checker cannot resolve to a single declaration is skipped (never guessed).
 *
 * The index keys on the SAME node {@link callerIndexKeyFor} maps a function-like to
 * (a `function`/method on itself; an arrow/function-expression on its `const f = …`
 * binding), so a forward hop's lookup and this build agree on the key.
 */
function buildCallerIndex(
  checker: ts.TypeChecker,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlyMap<ts.Node, readonly ts.CallExpression[]> {
  const index = new Map<ts.Node, ts.CallExpression[]>();
  const record = (call: ts.CallExpression): void => {
    const symbol = checker.getSymbolAtLocation(call.expression);
    if (symbol === undefined) return;
    for (const decl of symbol.declarations ?? []) {
      // Resolve the declaration to the key a forward hop will look it up by.
      let key: ts.Node | null = null;
      if (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl)) {
        key = decl;
      } else if (ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
        const init = unwrap(decl.initializer);
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) key = decl;
      } else if (ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) {
        key = callerIndexKeyFor(decl);
      }
      if (key === null) continue;
      const list = index.get(key);
      if (list === undefined) index.set(key, [call]);
      else list.push(call);
    }
  };
  for (const sf of sourceFiles) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) record(node);
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return index;
}

/**
 * Build the GENERIC taint facts for a repo — the host-side materialization. Pure +
 * deterministic: same source bytes + same registry → identical {@link TaintFacts}.
 *
 * The SOURCE / SINK / SANITIZER classification is INJECTED via `registry` — the
 * oracle references NO LiteShip-specific name (ADR-0012 / D7b). The depth bound is
 * carried into the facts so the report is HONEST about what was (and was not)
 * traced. Throws a tagged {@link InvariantViolationError} (never a bare throw) when
 * a non-empty corpus yields no program.
 *
 * @param registry The host-injected source/sink/sanitizer classification.
 * @param options  The profile seam + the interprocedural depth bound.
 */
export function buildRepoIRTaint(registry: TaintRegistry, options: BuildRepoIRTaintOptions = {}): TaintFacts {
  const profile = options.profile ?? liteshipDevopsProfile;
  const maxHops = options.interproceduralDepth ?? DEFAULT_TAINT_INTERPROCEDURAL_DEPTH;
  if (!Number.isInteger(maxHops) || maxHops < 0) {
    throw InvariantViolationError(
      'buildRepoIRTaint',
      `interproceduralDepth must be a non-negative integer (got ${String(maxHops)}) — the honest depth bound cannot be fractional or negative`,
    );
  }

  const records = readProfileSourceFileRecords(profile);
  if (records.length === 0) return { flows: [], interproceduralDepth: maxHops };

  const program = createTypeDirectedProgram(
    records.map((r) => r.absolutePath),
    profile.repoRoot,
  );
  const checker = program.getTypeChecker();
  // A non-empty corpus MUST yield source files; if the program is empty the trace
  // is unresolvable and zero flows would be a LIE.
  if (program.getSourceFiles().length === 0) {
    throw InvariantViolationError(
      'buildRepoIRTaint',
      `the type-directed program produced no source files over ${records.length} records rooted at "${profile.repoRoot}" — the corpus is unresolvable`,
    );
  }

  const relByAbsolute = new Map<string, string>(records.map((r) => [resolve(r.absolutePath), r.relativePath] as const));

  // CRITICAL: the trace must walk the PROGRAM's `ts.SourceFile`s, NOT the records'
  // standalone `ts.createSourceFile` parse — the checker only knows nodes from the
  // program it built, so `getSymbolAtLocation` on a standalone-parse node returns
  // undefined (no resolution) and every flow would silently vanish. We iterate the
  // program's source files filtered to the corpus (the same FileIds), in the
  // record order, so the output stays deterministic.
  const flows: TaintFlow[] = [];
  const programByAbs = new Map<string, ts.SourceFile>(
    program.getSourceFiles().map((sf) => [resolve(sf.fileName), sf] as const),
  );

  // The corpus source files in record order — the FORWARD parameter hop's caller
  // index is built over exactly these (same FileIds, same order) so it is byte-
  // stable. Built ONCE here, then injected into the trace context.
  const corpusSourceFiles: ts.SourceFile[] = [];
  for (const record of records) {
    const sf = programByAbs.get(resolve(record.absolutePath));
    if (sf !== undefined) corpusSourceFiles.push(sf);
  }
  const callersByDecl = buildCallerIndex(checker, corpusSourceFiles);
  const ctx: TraceCtx = { checker, registry, maxHops, relByAbsolute, callersByDecl };

  for (const record of records) {
    const sourceFile = programByAbs.get(resolve(record.absolutePath));
    if (sourceFile === undefined) continue;
    for (const candidate of collectSinkCandidates(ctx, sourceFile, record.relativePath)) {
      // A fresh per-candidate trace state (both cycle guards) — taint of one sink
      // argument is independent of another's; sharing would spuriously prune a
      // shared declaration or a shared (parameter, call-site) hop.
      const result = traceExpression(ctx, candidate.argument, maxHops, freshState());
      if (!result.tainted || result.source === null) continue;
      const sink: TaintEndpoint = {
        callee: candidate.sinkCallee,
        file: candidate.sinkFile,
        line: candidate.sinkLine,
        note: noteFor(registry, candidate.sinkCallee, 'a dangerous sink'),
      };
      flows.push({
        _tag: 'taint-flow',
        source: result.source,
        sink,
        sanitizedBy: result.sanitizedBy,
        path: result.path,
      });
    }
  }

  // Deterministic ordering — by sink (file, line), then source (file, line), then
  // callees — so the facts are byte-stable regardless of corpus iteration.
  flows.sort(
    (a, b) =>
      a.sink.file.localeCompare(b.sink.file) ||
      a.sink.line - b.sink.line ||
      a.source.file.localeCompare(b.source.file) ||
      a.source.line - b.source.line ||
      a.source.callee.localeCompare(b.source.callee) ||
      a.sink.callee.localeCompare(b.sink.callee),
  );

  return { flows, interproceduralDepth: maxHops };
}
