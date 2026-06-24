/**
 * The DETERMINISTIC CONDITION-MUTATION engine — DO-178B Level A MC/DC realized via
 * condition-level mutation (Slice C, the avionics tier; the MC/DC capstone of
 * mutation-as-divergence).
 *
 * THE INSIGHT (MC/DC via condition-mutation — a recognized, sound technique). Modified
 * Condition/Decision Coverage (the DO-178B Level A coverage requirement) demands that
 * EACH ATOMIC boolean CONDITION in a decision be shown to INDEPENDENTLY affect that
 * decision's outcome — i.e. for each condition there is a pair of test cases in which
 * ONLY that condition's value flips and the decision's outcome flips with it. The
 * mutation-driven realization: for each atomic condition in a decision, mint a
 * CONDITION-MUTANT that PINS that condition to a constant (force it `true`, and
 * separately `false`) while leaving every other condition LIVE. If a covering test
 * KILLS the force-true mutant AND (separately) the force-false mutant, then the suite
 * contains, for that condition, a case that distinguishes the condition being true from
 * being false at the decision — exactly the independent-effect pair MC/DC requires. A
 * condition-mutant that SURVIVES means no covering test distinguishes that condition's
 * value flipping the decision: the condition's independent effect is NOT observed — an
 * MC/DC GAP. This REUSES the deterministic mutation engine's content-addressing +
 * applyMutant splice + the injected per-mutant runner verbatim (a condition-mutant is
 * just a {@link Mutant} with the `force-condition-true` / `force-condition-false`
 * operator), so the whole verdict/cache/runner pipeline carries it unchanged.
 *
 * SOUNDNESS — exact vs approximate MC/DC (documented honestly, the avionics
 * anti-laundering discipline):
 *  - EXACT where it is exact. Forcing one condition to a constant and requiring BOTH
 *    the true-pin and the false-pin to be killed is a SOUND lower bound on MC/DC: a
 *    killed force-true mutant proves a covering test's outcome depends on this
 *    condition being true at this decision (the original passes, the all-true-pinned
 *    variant fails ⇒ the test exercised a state where this condition's value mattered),
 *    and symmetrically for false. Two kills ⇒ the condition's independent effect is
 *    observed. No false GREEN: a surviving pin is always a real gap (the test genuinely
 *    fails to distinguish that condition's value here).
 *  - APPROXIMATE where it over-approximates. Strict MC/DC (the unique-cause form) also
 *    requires that the distinguishing pair hold the OTHER conditions FIXED ("masking"):
 *    in `a && b`, the independent effect of `a` is demonstrated by a pair where `b` is
 *    held true. Condition-mutation does not pin the other conditions, so a kill here
 *    proves the WEAKER "general/masking MC/DC"-style independence (the condition affects
 *    the outcome on SOME covered state), not necessarily the strict unique-cause pair.
 *    This is the standard, recognized "masking MC/DC" relaxation accepted by DO-178B/
 *    DO-248 for short-circuit (`&&`/`||`) decisions; for short-circuiting operators it
 *    coincides with strict MC/DC on the reachable states (the un-evaluated operand
 *    cannot affect the outcome, so masking is automatic). The engine therefore reports
 *    `force-condition-*` survivors as MC/DC gaps under the masking-MC/DC reading, which
 *    is sound (never a false green) and is the established mutation-based MC/DC
 *    approximation — NOT a claim of strict unique-cause MC/DC on every decision.
 *
 * DETERMINISM IS PARAMOUNT (tool-qualification build). The generator is a pure function
 * of the source text: one `ts.SourceFile` parse, one top-down traversal that decomposes
 * each DECISION into its atomic conditions, mints the two pins per condition, then a
 * TOTAL canonical sort (line, column, force-value, content). Same source bytes →
 * byte-identical condition-mutant list with stable content-addressed ids. No clock, no
 * rng, no I/O. The id routes through the SAME `addressedDigestOf` content-addressing the
 * mutation engine uses (the verdict-cache key half), never a fork; a `force` field is
 * folded into the id tuple so the true-pin and false-pin of one condition are distinct
 * stable ids.
 *
 * Composition over inheritance: a `ConditionMutant` is a {@link Mutant} plus the small
 * `decision`/`condition`/`force` descriptor, assembled by data — no class hierarchy.
 * Type-only positions are skipped at the source ({@link isInTypeOnlyConditionPosition}),
 * exactly as the mutation engine skips erased syntax — a condition inside an erased type
 * carries no runtime behaviour, so pinning it could only ever mint a false survivor.
 *
 * @module
 */
import ts from 'typescript';
import { CanonicalCbor, addressedDigestOf, type IntegrityDigest } from '@czap/canonical';
import type { MutantCore } from './mutation-engine.js';
import { applyMutant } from './mutation-engine.js';

/**
 * The force direction a condition-mutant pins its atomic condition to — a `_tag`-style
 * value (composition). `true` splices `(true)` over the condition span; `false` splices
 * `(false)`. The pin is wrapped in parentheses so the splice is always a valid
 * expression in its syntactic position (a forced operand of `&&`/`||`, the test of an
 * `if`/`while`/`for`, a ternary test, or a returned boolean) regardless of surrounding
 * precedence.
 */
export type ConditionForce = 'force-condition-true' | 'force-condition-false';

/** The two force operators, canonically ordered (the sort tiebreak — true before false). */
export const CONDITION_FORCES: readonly ConditionForce[] = ['force-condition-true', 'force-condition-false'] as const;

/** The literal the force operator splices (wrapped so it is valid in any operand slot). */
const FORCE_LITERAL: Readonly<Record<ConditionForce, string>> = {
  'force-condition-true': '(true)',
  'force-condition-false': '(false)',
} as const;

/**
 * A content-addressed CONDITION-mutant — a {@link MutantCore} (so it flows through the
 * SAME `evaluateMutant` runner/cache path verbatim, which reads only the operator-agnostic
 * core fields) carrying the MC/DC descriptor: the
 * DECISION text it belongs to, the atomic CONDITION text it pins, and the `force`
 * direction. The mutant's `operator` is the {@link ConditionForce}; `mutatedText` is the
 * `(true)`/`(false)` pin; `originalText` is the condition's source. The `id` folds
 * `force` into its identity tuple, so the true-pin and false-pin of one condition are
 * distinct stable ids.
 */
export interface ConditionMutant extends MutantCore {
  /** The force operator (the typed {@link ConditionForce} discriminant — the MC/DC analogue of a mutation operator). */
  readonly operator: ConditionForce;
  /** The full source text of the enclosing DECISION (for the self-explaining finding). */
  readonly decision: string;
  /** The full source text of the atomic CONDITION this mutant pins (== `originalText`). */
  readonly condition: string;
  /** The force direction this mutant pins the condition to. */
  readonly force: ConditionForce;
}

/** Options for {@link generateConditionMutants}. */
export interface GenerateConditionMutantsOptions {
  /**
   * The repo-relative file id stamped onto every condition-mutant (so the MC/DC gate
   * locates it at a real IR node). Omitted → the `ts.SourceFile`'s own `fileName`.
   */
  readonly file?: string;
}

/** UTF-8 encoder reused across the module (stateless, deterministic). */
const UTF8 = new TextEncoder();

/**
 * Generate the canonical, sorted, content-addressed list of CONDITION-mutants for a
 * parsed source file — the deterministic heart of the MC/DC engine.
 *
 * Algorithm (every step a pure function of `sourceFile.text`):
 *  1. ONE top-down `ts.forEachChild` traversal; at each node, if it opens a DECISION
 *     (an `if`/`while`/`do`/`for` test, a ternary test, a logical `&&`/`||`, or a
 *     boolean-`return` expression), decompose its test into the set of ATOMIC
 *     conditions (recursively split on `&&`/`||`; a leaf is any non-logical boolean
 *     sub-expression). The decision's full text is recorded for the finding.
 *  2. For each atomic condition, mint BOTH pins (force-true, force-false) as a precise
 *     span splice over the condition's `[start, end)`.
 *  3. De-duplicate by `(start, end, force)` (a condition that is BOTH a logical operand
 *     AND, say, the same node reached via two decision roots is minted once).
 *  4. Content-address + locate each, then TOTAL-sort (line, column, force rank, then a
 *     content tiebreak) so the order is independent of traversal.
 *
 * Same source bytes → byte-identical list with stable ids. No clock, no rng, no I/O.
 */
export function generateConditionMutants(
  sourceFile: ts.SourceFile,
  options: GenerateConditionMutantsOptions = {},
): readonly ConditionMutant[] {
  const file = options.file ?? sourceFile.fileName;

  // 1+2. Collect the atomic conditions of every decision, keyed by span so a condition
  // reached via two decision roots (a nested logical) is recorded once. The map value
  // carries the condition node + its enclosing decision text (the first decision that
  // reaches it — deterministic by the top-down traversal, and the same text regardless).
  const conditions = new Map<string, { readonly node: ts.Expression; readonly decision: string }>();
  const record = (node: ts.Expression, decision: string): void => {
    const key = `${node.getStart(sourceFile)}:${node.getEnd()}`;
    if (!conditions.has(key)) conditions.set(key, { node, decision });
  };

  const visit = (node: ts.Node): void => {
    const decisionTest = decisionTestOf(node);
    if (decisionTest !== undefined && !isInTypeOnlyConditionPosition(decisionTest)) {
      const decisionText = nodeText(decisionTest, sourceFile);
      for (const atom of atomicConditions(decisionTest)) {
        if (isInTypeOnlyConditionPosition(atom)) continue;
        record(atom, decisionText);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  // 3+4. Mint both pins per condition, content-address + locate, then total-sort.
  const mutants: ConditionMutant[] = [];
  for (const { node, decision } of conditions.values()) {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const originalText = node.getText(sourceFile);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    for (const force of CONDITION_FORCES) {
      const mutatedText = FORCE_LITERAL[force];
      mutants.push({
        id: conditionMutantId(file, force, line + 1, character + 1, originalText, mutatedText),
        file,
        operator: force,
        force,
        decision,
        condition: originalText,
        line: line + 1,
        column: character + 1,
        start,
        end,
        originalText,
        mutatedText,
      });
    }
  }

  mutants.sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      forceRank(a.force) - forceRank(b.force) ||
      a.condition.localeCompare(b.condition) ||
      a.id.localeCompare(b.id),
  );
  return mutants;
}

/** Ordinal of a force in {@link CONDITION_FORCES} — the sort tiebreak (true < false). */
function forceRank(force: ConditionForce): number {
  const rank = CONDITION_FORCES.indexOf(force);
  return rank === -1 ? CONDITION_FORCES.length : rank;
}

/**
 * The TEST expression of a DECISION node, or `undefined` when the node is not a
 * decision. The recognized decisions (each has a boolean-valued TEST whose atomic
 * conditions MC/DC governs):
 *  - `if (T)` / `while (T)` / `do … while (T)` — the statement's condition.
 *  - `for (…; T; …)` — the for-loop's (optional) condition.
 *  - `T ? a : b` — the conditional (ternary) expression's test.
 *  - `A && B` / `A || B` — a logical expression IS a decision (its whole expression is
 *    the test; its atomic conditions are the flattened operands). Only the OUTERMOST
 *    logical is treated as the decision root — a nested `&&`/`||` is reached through
 *    {@link atomicConditions}' recursion, not as its own decision (so the decision text
 *    is the full expression, and each leaf is minted once via the span-keyed map).
 *  - `return T` where T is a logical/comparison/equality/not boolean expression — a
 *    boolean-returning decision. A bare identifier/call return is NOT treated as a
 *    decision (it is a value passthrough, not a branch the suite must MC/DC-cover); only
 *    a structurally-boolean return expression opens one.
 */
function decisionTestOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isIfStatement(node)) return node.expression;
  if (ts.isWhileStatement(node)) return node.expression;
  if (ts.isDoStatement(node)) return node.expression;
  if (ts.isForStatement(node)) return node.condition;
  if (ts.isConditionalExpression(node)) return node.condition;
  if (isLogicalExpression(node) && !isLogicalExpression(node.parent)) {
    // The OUTERMOST logical expression is the decision root; a nested logical operand is
    // reached by recursion, never re-rooted (so each leaf is minted exactly once).
    return node;
  }
  if (ts.isReturnStatement(node) && node.expression !== undefined && isBooleanShapedReturn(node.expression)) {
    return node.expression;
  }
  return undefined;
}

/**
 * Decompose a decision's TEST into its ATOMIC conditions — the leaf boolean
 * sub-expressions. A logical `&&`/`||` is split into its operands recursively; any
 * other expression is itself an atomic condition. A parenthesized expression is
 * unwrapped to its inner expression first (so `(a && b)` splits, and `(a)` yields `a`'s
 * span — never the redundant parens). The result preserves source order (left operand
 * before right), so the canonical sort is stable.
 */
function atomicConditions(test: ts.Expression): readonly ts.Expression[] {
  const inner = ts.isParenthesizedExpression(test) ? test.expression : test;
  if (isLogicalExpression(inner)) {
    return [...atomicConditions(inner.left), ...atomicConditions(inner.right)];
  }
  return [inner];
}

/** Is `node` a short-circuit logical binary expression (`&&` / `||`)? */
function isLogicalExpression(node: ts.Node): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  );
}

/**
 * Is the returned expression STRUCTURALLY boolean — a decision worth MC/DC-covering? A
 * `return` of a logical (`&&`/`||`), a comparison (`<`/`<=`/`>`/`>=`), an equality
 * (`===`/`!==`/`==`/`!=`), a logical-NOT (`!x`), or a boolean literal opens a decision
 * (its atomic conditions matter). A bare identifier/call/property return does NOT — it
 * is a value passthrough, and pinning it to `(true)`/`(false)` would test the CALLER's
 * coverage, not a branch in THIS function (a false-gap risk the engine declines to
 * mint). This keeps the boolean-return decisions precise and avoids spurious MC/DC
 * targets on non-branching returns.
 */
function isBooleanShapedReturn(expr: ts.Expression): boolean {
  const inner = ts.isParenthesizedExpression(expr) ? expr.expression : expr;
  if (isLogicalExpression(inner)) return true;
  if (ts.isPrefixUnaryExpression(inner) && inner.operator === ts.SyntaxKind.ExclamationToken) return true;
  if (inner.kind === ts.SyntaxKind.TrueKeyword || inner.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isBinaryExpression(inner)) return COMPARISON_OR_EQUALITY.has(inner.operatorToken.kind);
  return false;
}

/** The comparison + equality operator kinds a boolean-shaped return recognizes. */
const COMPARISON_OR_EQUALITY: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/**
 * Is `node` in a TYPE-ONLY position — TS-erased syntax that carries no runtime
 * behaviour, so pinning a "condition" inside it could only mint a FALSE survivor? Mirrors
 * the mutation engine's `isInTypeOnlyPosition` (walk the parent chain for any TypeNode /
 * type-alias ancestor). A conditional TYPE (`T extends U ? X : Y`) is a `ts.TypeNode`, so
 * its `extends` test is correctly skipped — only RUNTIME decisions are mutated.
 */
function isInTypeOnlyConditionPosition(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isTypeNode(current) || ts.isTypeAliasDeclaration(current)) return true;
    current = current.parent;
  }
  return false;
}

/** The full text of a node — the decision/condition source span. */
function nodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}

/**
 * Reconstruct the mutated source for ONE condition-mutant — a single precise text
 * splice of its `[start, end)` condition span with the `(true)`/`(false)` pin. Reuses
 * the mutation engine's {@link applyMutant} verbatim (a ConditionMutant IS a MutantCore), so
 * the splice is byte-exact everywhere outside the span — the only change is the pin.
 */
export function applyConditionMutant(originalSource: string, mutant: ConditionMutant): string {
  return applyMutant(originalSource, mutant);
}

/**
 * The stable content address of a condition-mutant — blake3 over the canonical CBOR of
 * its IDENTITY tuple (`{kind:'mcdc', file, force, line, column, originalText,
 * mutatedText}`). The `force` is folded in so the true-pin and false-pin of one
 * condition are distinct stable ids; the `kind:'mcdc'` discriminant keeps a
 * condition-mutant id disjoint from a same-location classic mutant id (no cross-cache
 * collision). Absolute offsets are EXCLUDED (a whitespace-only edit elsewhere shifts
 * offsets but is the same logical condition-mutant — line/column + text pin it). Routes
 * through the SAME `addressedDigestOf` the mutation engine uses, never a fork.
 */
function conditionMutantId(
  file: string,
  force: ConditionForce,
  line: number,
  column: number,
  originalText: string,
  mutatedText: string,
): IntegrityDigest {
  const bytes = CanonicalCbor.encode({
    kind: 'mcdc',
    file,
    force,
    line,
    column,
    originalText,
    mutatedText,
  });
  return addressedDigestOf(bytes, 'blake3').integrity_digest;
}

/**
 * A deterministic display digest of a source file (its id + bytes) — exported so the
 * host can fingerprint a seam's bytes for the MC/DC facts without re-deriving the
 * content-addressing. Pure; routes through the same `addressedDigestOf` kernel.
 */
export function conditionSourceDigest(file: string, text: string): string {
  return addressedDigestOf(UTF8.encode(`${file}\x1f${text}`), 'blake3').display_id;
}
