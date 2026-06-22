/**
 * The DETERMINISTIC mutation engine (Slice C, the avionics tier — the capstone of
 * mutation-as-divergence).
 *
 * THE BIG IDEA. The gauntlet's whole engine is "two oracles disagree on a property
 * → a self-explaining Finding" (see `make-oracle-divergence-gate.ts`). A MUTANT is
 * a deliberate SECOND ORACLE: mutate one operator at one site, run the tests that
 * cover that site; if NO test fails, the mutated code and the original produced
 * IDENTICAL test results when they SHOULD have diverged → the mutant SURVIVED — a
 * coverage divergence, reportable at the file's assurance level ("mutating L42
 * `>=`→`>` changed behaviour and nothing noticed — this code is untested"). This
 * module is the FIRST half: the deterministic generator that mints the canonical,
 * sorted, content-addressed catalogue of mutants for a source file. The
 * kill/survive VERDICT (the second oracle's answer) lives in
 * {@link evaluateMutant}; the divergence GATE that folds survivors into Findings
 * lives in `@czap/gauntlet`'s `gates/mutation-divergence.ts`. Same ADR-0012
 * boundary as the IR / supply-chain: the heavy `ts`-AST work lives HERE (audit, the
 * host); the lean gauntlet gate FOLDS the facts the host injects.
 *
 * DETERMINISM IS PARAMOUNT (this is a tool-qualification build). The generator is a
 * pure function of the source text: a single `ts.SourceFile` parse, a single
 * top-down AST traversal that applies a fixed OPERATOR CATALOGUE at every
 * applicable node, then a TOTAL canonical sort (by line, then column, then operator
 * id, then a content tiebreak). The same source bytes therefore always yield a
 * BYTE-IDENTICAL mutant list with STABLE ids. There is no `Date.now`, no
 * `Math.random`, no filesystem, no mtime — the ONLY id input is content + operator
 * + location. When a BUDGET caps the catalogue, the selection is a SEEDED
 * deterministic prefix whose seed is the file's own content address (reproducible
 * across runs), never a random sample.
 *
 * Each {@link Mutant} carries its content-addressed `id` (stable across runs), its
 * location, the `operator` that produced it, and the `originalText`→`mutatedText`
 * pair (so a dev/agent sees EXACTLY what survived). The mutated SOURCE for a single
 * mutant is reconstructed by {@link applyMutant} — a precise single-span text
 * splice (never a re-serialization of the whole tree, which would perturb
 * formatting and defeat the byte-stability the engine guarantees).
 *
 * Composition over inheritance: an operator is a `_tag`-style descriptor + a pure
 * `mutate(node) → readonly Mutation[]` function over the open structural contract;
 * the catalogue is a frozen array; there is no class hierarchy. A downstream can
 * compose its own operator onto the catalogue without rebuilding the engine.
 *
 * @module
 */
import ts from 'typescript';
import { CanonicalCbor, addressedDigestOf, type IntegrityDigest } from '@czap/canonical';

/** UTF-8 encoder reused across the module (stateless, deterministic). */
const UTF8 = new TextEncoder();

/**
 * The closed set of mutation OPERATOR ids — a `_tag` union (composition, not
 * inheritance). Each id names a single, documented, behaviour-changing rewrite the
 * catalogue applies. The list is FOCUSED but real (the classic mutation-testing
 * operator families, restricted to the ones whose mutation is unambiguous on the TS
 * AST and never produces a syntactically-invalid program):
 *
 * - `conditional-boundary` — flips a relational operator across its boundary
 *   (`<`↔`<=`, `>`↔`>=`). Catches an off-by-one a `>` vs `>=` test would pin.
 * - `equality` — flips an equality operator to its negation (`===`↔`!==`,
 *   `==`↔`!=`). Catches a test that never exercises the false branch.
 * - `arithmetic` — flips an arithmetic operator within its inverse pair
 *   (`+`↔`-`, `*`↔`/`). Catches a value-blind test (`typeof x === 'number'`).
 * - `logical` — flips a short-circuit connective (`&&`↔`||`). Catches a test that
 *   never drives both operands.
 * - `boolean-literal` — flips a boolean literal (`true`↔`false`). Catches a
 *   constant a test never asserts on.
 * - `return-value` — replaces a non-void `return <expr>` with a canonical
 *   DIFFERENT value (a typed sentinel: `return 0` for a numeric return, `return
 *   null` otherwise — chosen structurally, never randomly). Catches a test that
 *   ignores the return value.
 * - `unary-not` — strips a logical-NOT (`!x`→`x`). Catches a test that never
 *   exercises the negated condition.
 * - `string-literal` — replaces a non-empty string literal with the empty string.
 *   Catches a test that never asserts the string's content.
 */
export type MutationOperatorId =
  | 'conditional-boundary'
  | 'equality'
  | 'arithmetic'
  | 'logical'
  | 'boolean-literal'
  | 'return-value'
  | 'unary-not'
  | 'string-literal';

/**
 * The closed, canonically-ordered list of operator ids — the ORDER is the
 * deterministic tiebreak the catalogue sort uses when two mutants share a
 * `(line, column)` (two operators applicable at the same span, e.g. an `equality`
 * inside a `logical`). Ascending index = canonical precedence. Exported so the
 * meta-proof can assert the exact catalogue without re-deriving it.
 */
export const MUTATION_OPERATORS: readonly MutationOperatorId[] = [
  'conditional-boundary',
  'equality',
  'arithmetic',
  'logical',
  'boolean-literal',
  'return-value',
  'unary-not',
  'string-literal',
] as const;

/** Ordinal of an operator id in {@link MUTATION_OPERATORS} — the sort tiebreak. */
function operatorRank(operator: MutationOperatorId): number {
  const rank = MUTATION_OPERATORS.indexOf(operator);
  // The catalogue only ever emits known operators, so this is total; the explicit
  // guard keeps the sort total even if a downstream composes a stray id (it sorts
  // last, deterministically, rather than NaN-poisoning the comparator).
  return rank === -1 ? MUTATION_OPERATORS.length : rank;
}

/**
 * One concrete rewrite an operator proposes at a node: replace the source SPAN
 * `[start, end)` (absolute character offsets into the file) with `replacement`.
 * Span-precise so {@link applyMutant} splices exactly that range and the rest of
 * the file stays byte-identical (no whole-tree re-serialization).
 */
export interface Mutation {
  readonly operator: MutationOperatorId;
  /** Absolute start offset of the replaced span (inclusive). */
  readonly start: number;
  /** Absolute end offset of the replaced span (exclusive). */
  readonly end: number;
  /** The exact original text of the span (for the human-readable diff). */
  readonly originalText: string;
  /** The text spliced in its place. */
  readonly mutatedText: string;
}

/**
 * The OPERATOR-AGNOSTIC core of a content-addressed mutant — every field a runner
 * consumes to splice + evaluate a mutant, WITHOUT the `operator` discriminant. Extracted
 * so the deterministic splice ({@link applyMutant}) and the kill/survive verdict
 * (`evaluateMutant`) operate on ANY span-located mutant — the classic {@link Mutant}
 * (operator ∈ {@link MutationOperatorId}) AND the MC/DC `ConditionMutant` (operator ∈ the
 * condition-force union) — without widening the classic operator catalogue or forking the
 * runner. The `id` is the content address; `line`/`column` are 1-based (human display);
 * `start`/`end` are absolute offsets (the splice the runner applies).
 */
export interface MutantCore {
  /** Stable content address — `addressedDigestOf(...).integrity_digest`. */
  readonly id: IntegrityDigest;
  /** The repo-relative source file the mutant lives in. */
  readonly file: string;
  /** 1-based line of the mutated span. */
  readonly line: number;
  /** 1-based column of the mutated span. */
  readonly column: number;
  /** Absolute start offset of the mutated span (inclusive). */
  readonly start: number;
  /** Absolute end offset of the mutated span (exclusive). */
  readonly end: number;
  /** The exact original text of the span. */
  readonly originalText: string;
  /** The text the span is replaced with. */
  readonly mutatedText: string;
}

/**
 * A content-addressed mutant — one deterministic, located, identified rewrite of a
 * source file. The `id` is STABLE across runs: it is the blake3 digest (over
 * canonical CBOR) of `{file, operator, line, column, originalText, mutatedText}`,
 * so the same source always mints the same id (the verdict-cache key half the B2
 * cache content-addresses against). The classic-mutation specialization of
 * {@link MutantCore} — its `operator` is a {@link MutationOperatorId}.
 */
export interface Mutant extends MutantCore {
  /** The operator that produced the mutant. */
  readonly operator: MutationOperatorId;
}

/** Options for {@link generateMutants}. */
export interface GenerateMutantsOptions {
  /**
   * The repo-relative file id stamped onto every mutant (so the divergence gate
   * can locate the mutant at a real IR node). When omitted, the `ts.SourceFile`'s
   * own `fileName` is used.
   */
  readonly file?: string;
  /**
   * A BUDGET cap on the catalogue size — at most `budget` mutants are returned. The
   * selection is the DETERMINISTIC PREFIX of the canonical-sorted catalogue after a
   * SEEDED stable shuffle whose seed is the file's content address (so the sample
   * is reproducible across runs, never random). Omitted/`undefined` → the FULL
   * catalogue (the L4 cannon — every applicable mutant). A `budget` of 0 yields no
   * mutants (an explicit no-op, not an error).
   */
  readonly budget?: number;
}

/**
 * Generate the canonical, sorted, content-addressed list of mutants for a parsed
 * source file — the deterministic heart of the engine.
 *
 * Algorithm (every step is a pure function of `sourceFile.text`):
 *  1. ONE top-down `ts.forEachChild` traversal; at each node, every operator in
 *     the catalogue is offered the node and returns 0+ {@link Mutation}s.
 *  2. Each mutation is located (1-based line/column from its start offset) and
 *     content-addressed into a {@link Mutant}.
 *  3. The full list is TOTAL-sorted: line, then column, then operator rank, then
 *     the mutated text (a final content tiebreak so the order is total even if two
 *     operators emit at the identical span — impossible in the current catalogue,
 *     but the sort is total by construction, never order-dependent on traversal).
 *  4. If a `budget` caps the list, the SEEDED deterministic prefix is taken (see
 *     {@link GenerateMutantsOptions.budget}).
 *
 * Same source bytes → byte-identical mutant list with stable ids. No clock, no rng
 * (except the content-seeded budget selection), no I/O.
 */
export function generateMutants(sourceFile: ts.SourceFile, options: GenerateMutantsOptions = {}): readonly Mutant[] {
  const file = options.file ?? sourceFile.fileName;
  const text = sourceFile.text;

  // 1+2. Deterministic top-down traversal → located, content-addressed mutants.
  const mutants: Mutant[] = [];
  const visit = (node: ts.Node): void => {
    for (const operator of MUTATION_OPERATORS) {
      for (const mutation of mutationsFor(operator, node, sourceFile)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(mutation.start);
        mutants.push({
          id: mutantId(file, mutation, line + 1, character + 1),
          file,
          operator: mutation.operator,
          line: line + 1,
          column: character + 1,
          start: mutation.start,
          end: mutation.end,
          originalText: mutation.originalText,
          mutatedText: mutation.mutatedText,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  // 3. Total canonical sort — independent of traversal order.
  mutants.sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      operatorRank(a.operator) - operatorRank(b.operator) ||
      a.mutatedText.localeCompare(b.mutatedText) ||
      a.originalText.localeCompare(b.originalText),
  );

  // 4. Budget: the seeded deterministic prefix (content-derived seed, reproducible).
  if (options.budget === undefined) return mutants;
  if (options.budget <= 0) return [];
  if (mutants.length <= options.budget) return mutants;
  return seededPrefix(mutants, options.budget, contentSeed(file, text));
}

/**
 * Reconstruct the mutated source for ONE mutant — a single precise text splice of
 * its `[start, end)` span. Byte-exact everywhere outside the span, so the only
 * change between original and mutated source is the operator's rewrite (the whole
 * point: the test that fails must fail BECAUSE of the operator, not because of a
 * re-serialization artefact). Pure — derives entirely from `originalSource` + the
 * mutant's offsets.
 */
export function applyMutant(originalSource: string, mutant: MutantCore): string {
  return originalSource.slice(0, mutant.start) + mutant.mutatedText + originalSource.slice(mutant.end);
}

/**
 * The stable content address of a mutant — blake3 over the canonical CBOR of its
 * IDENTITY tuple (`{file, operator, line, column, originalText, mutatedText}`). The
 * tuple is exactly the fields that make a mutant a distinct rewrite; absolute
 * offsets are deliberately EXCLUDED from the id (a whitespace-only edit elsewhere in
 * the file shifts offsets but is the same logical mutant — line/column + text pin
 * it). Routes through the SAME `addressedDigestOf` content-addressing the repo-IR
 * builder uses, never a fork.
 */
function mutantId(file: string, mutation: Mutation, line: number, column: number): IntegrityDigest {
  const bytes = CanonicalCbor.encode({
    file,
    operator: mutation.operator,
    line,
    column,
    originalText: mutation.originalText,
    mutatedText: mutation.mutatedText,
  });
  return addressedDigestOf(bytes, 'blake3').integrity_digest;
}

/**
 * A deterministic 32-bit seed for the budget selection, derived from the file's
 * content (its id + bytes) via the fnv1a display id of the same blake3 address. The
 * seed is therefore a pure function of the source — the budget sample is identical
 * on every run over unchanged source (reproducible, never random).
 */
function contentSeed(file: string, text: string): number {
  const display = addressedDigestOf(UTF8.encode(`${file}\x1f${text}`), 'blake3').display_id;
  // The display id is `fnv1a:<8 hex>`; parse the hex into the 32-bit seed.
  const hex = display.slice(display.indexOf(':') + 1);
  return Number.parseInt(hex, 16) >>> 0;
}

/**
 * A pure 32-bit PRNG step (mulberry32) — deterministic given its state. Used ONLY
 * to drive the seeded budget selection; it is NOT a source of run-time randomness
 * (the seed is content-derived, so the whole sequence is reproducible). Returns the
 * next state and a unit float.
 */
function mulberry32(state: number): { readonly next: number; readonly value: number } {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { next: t >>> 0, value };
}

/**
 * The seeded deterministic prefix: a Fisher–Yates shuffle of `items` driven by the
 * content `seed`, then the first `budget` entries RE-SORTED back into canonical
 * order (so the returned subset is still canonically sorted, just SAMPLED). Because
 * the seed is content-derived and the shuffle is a pure PRNG, the same input always
 * yields the same subset — reproducible budget sampling, never `Math.random`.
 */
function seededPrefix(items: readonly Mutant[], budget: number, seed: number): readonly Mutant[] {
  const shuffled = [...items];
  let state = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const step = mulberry32(state);
    state = step.next;
    const j = Math.floor(step.value * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  const chosen = shuffled.slice(0, budget);
  chosen.sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      operatorRank(a.operator) - operatorRank(b.operator) ||
      a.mutatedText.localeCompare(b.mutatedText) ||
      a.originalText.localeCompare(b.originalText),
  );
  return chosen;
}

/** The full text of a node, used as the mutation's original-text span. */
function nodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}

/**
 * Is `node` in a TYPE-ONLY position — TS-erased syntax that exists at no runtime,
 * so any mutation of it is GUARANTEED-EQUIVALENT by construction (no test, however
 * strong, can observe a change to erased syntax)? Mutating such a node only ever
 * mints a FALSE survivor — there is nothing for a test to catch. The engine must
 * skip it AT THE SOURCE rather than report an unkillable mutant.
 *
 * The robust predicate (walk the parent chain — a single node can be deep inside a
 * type, e.g. a string literal → `LiteralType` → `UnionType` → the parameter's type
 * annotation):
 *   - ANY ancestor is a {@link ts.isTypeNode} — covers a literal type, a union/
 *     intersection type, a type reference, a type annotation (a parameter/variable
 *     `: T`), and a type-alias's RHS. This is the broad, sound catch.
 *   - ANY ancestor is a {@link ts.isTypeAliasDeclaration} (its body is a TypeNode,
 *     but the alias keyword/name region is belt-and-suspenders covered too).
 *   - The node is the specifier of a TYPE-ONLY import/export (`import type … from
 *     '…'` / a type-only named specifier) — the whole declaration is erased.
 *
 * CRUCIAL PRECISION (the default-value boundary). A parameter/variable DEFAULT VALUE
 * (`algo = 'sha256'`) is the node's `initializer`, NOT its `type` — its parent is the
 * `Parameter`/`VariableDeclaration` directly, never a `TypeNode`. So a default value
 * is RUNTIME and is NOT skipped: it remains a real, killable mutant. Only ERASED type
 * syntax is excluded.
 */
function isInTypeOnlyPosition(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isTypeNode(current) || ts.isTypeAliasDeclaration(current)) return true;
    if (isTypeOnlyImportExportSpecifier(current)) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Is `node` the specifier (or a child of the import/export clause) of a TYPE-ONLY
 * import/export — `import type … from '…'`, `export type … from '…'`, or a type-only
 * NAMED specifier (`import { type Foo } from '…'`)? Such a declaration is entirely
 * erased, so a string-literal mutation of its specifier is guaranteed-equivalent.
 */
function isTypeOnlyImportExportSpecifier(node: ts.Node): boolean {
  if (ts.isImportDeclaration(node)) return node.importClause?.isTypeOnly === true;
  if (ts.isExportDeclaration(node)) return node.isTypeOnly;
  if (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) return node.isTypeOnly;
  return false;
}

/**
 * Offer one operator a node and collect its 0+ mutations. A pure dispatch over the
 * catalogue — each branch is a single, documented, behaviour-changing rewrite that
 * NEVER produces a syntactically-invalid program (the operator only fires on the
 * exact node shape it understands, and splices a same-arity token / a typed
 * canonical value).
 *
 * A node in a TYPE-ONLY position ({@link isInTypeOnlyPosition}) is SKIPPED — erased
 * syntax can carry no runtime behaviour, so any mutation of it is guaranteed-
 * equivalent and could only ever mint a FALSE survivor. The skip is at the SOURCE
 * (the deterministic generator never emits the mutant), not a downstream filter.
 */
function mutationsFor(operator: MutationOperatorId, node: ts.Node, sourceFile: ts.SourceFile): readonly Mutation[] {
  if (isInTypeOnlyPosition(node)) return [];
  switch (operator) {
    case 'conditional-boundary':
      return binaryOperatorMutation(node, sourceFile, operator, CONDITIONAL_BOUNDARY_FLIPS);
    case 'equality':
      return binaryOperatorMutation(node, sourceFile, operator, EQUALITY_FLIPS);
    case 'arithmetic':
      return binaryOperatorMutation(node, sourceFile, operator, ARITHMETIC_FLIPS);
    case 'logical':
      return binaryOperatorMutation(node, sourceFile, operator, LOGICAL_FLIPS);
    case 'boolean-literal':
      return booleanLiteralMutation(node, sourceFile, operator);
    case 'return-value':
      return returnValueMutation(node, sourceFile, operator);
    case 'unary-not':
      return unaryNotMutation(node, sourceFile, operator);
    case 'string-literal':
      return stringLiteralMutation(node, sourceFile, operator);
  }
}

/** `SyntaxKind` → its flipped kind, for the binary-operator families. */
const CONDITIONAL_BOUNDARY_FLIPS: ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind> = new Map([
  [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken],
  [ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.LessThanToken],
  [ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken],
  [ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.GreaterThanToken],
]);

const EQUALITY_FLIPS: ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind> = new Map([
  [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken],
  [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken],
  [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken],
  [ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.EqualsEqualsToken],
]);

const ARITHMETIC_FLIPS: ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind> = new Map([
  [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken],
  [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken],
  [ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken],
  [ts.SyntaxKind.SlashToken, ts.SyntaxKind.AsteriskToken],
]);

const LOGICAL_FLIPS: ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind> = new Map([
  [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken],
  [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken],
]);

/** The literal source token a flipped operator kind splices in. */
const OPERATOR_TOKEN: ReadonlyMap<ts.SyntaxKind, string> = new Map([
  [ts.SyntaxKind.LessThanToken, '<'],
  [ts.SyntaxKind.LessThanEqualsToken, '<='],
  [ts.SyntaxKind.GreaterThanToken, '>'],
  [ts.SyntaxKind.GreaterThanEqualsToken, '>='],
  [ts.SyntaxKind.EqualsEqualsEqualsToken, '==='],
  [ts.SyntaxKind.ExclamationEqualsEqualsToken, '!=='],
  [ts.SyntaxKind.EqualsEqualsToken, '=='],
  [ts.SyntaxKind.ExclamationEqualsToken, '!='],
  [ts.SyntaxKind.PlusToken, '+'],
  [ts.SyntaxKind.MinusToken, '-'],
  [ts.SyntaxKind.AsteriskToken, '*'],
  [ts.SyntaxKind.SlashToken, '/'],
  [ts.SyntaxKind.AmpersandAmpersandToken, '&&'],
  [ts.SyntaxKind.BarBarToken, '||'],
]);

/**
 * The binary-operator family driver — if `node` is a `ts.BinaryExpression` whose
 * operator token is in `flips`, splice the FLIPPED operator token (the precise
 * operator-token span only, never the whole expression). Shared by the four binary
 * families (conditional-boundary / equality / arithmetic / logical), each passing
 * its own flip map.
 */
function binaryOperatorMutation(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  operator: MutationOperatorId,
  flips: ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind>,
): readonly Mutation[] {
  if (!ts.isBinaryExpression(node)) return [];
  const token = node.operatorToken;
  const flipped = flips.get(token.kind);
  if (flipped === undefined) return [];
  const mutatedText = OPERATOR_TOKEN.get(flipped);
  // The flip map and the token map are co-defined; an undefined here is an engine
  // bug, not data — skip rather than splice `undefined` (defence in depth).
  if (mutatedText === undefined) return [];
  const start = token.getStart(sourceFile);
  const end = token.getEnd();
  return [{ operator, start, end, originalText: token.getText(sourceFile), mutatedText }];
}

/** `true`↔`false` literal flip — the precise keyword span. */
function booleanLiteralMutation(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  operator: MutationOperatorId,
): readonly Mutation[] {
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return [
      { operator, start: node.getStart(sourceFile), end: node.getEnd(), originalText: 'true', mutatedText: 'false' },
    ];
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return [
      { operator, start: node.getStart(sourceFile), end: node.getEnd(), originalText: 'false', mutatedText: 'true' },
    ];
  }
  return [];
}

/**
 * `return <expr>` → `return <canonical-different-value>`. The replacement is chosen
 * STRUCTURALLY (never randomly): a numeric-literal return becomes `0` (or `1` if it
 * already is `0`, so the value genuinely differs); every other non-void return
 * becomes `null`. A bare `return;` / a return already returning the chosen sentinel
 * is skipped (no behaviour change → not a mutant). Only the `<expr>` span is
 * spliced, never the `return` keyword.
 */
function returnValueMutation(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  operator: MutationOperatorId,
): readonly Mutation[] {
  if (!ts.isReturnStatement(node) || node.expression === undefined) return [];
  const expr = node.expression;
  const originalText = nodeText(expr, sourceFile);
  const mutatedText = canonicalReturnReplacement(expr, originalText);
  if (mutatedText === undefined) return [];
  return [{ operator, start: expr.getStart(sourceFile), end: expr.getEnd(), originalText, mutatedText }];
}

/**
 * The canonical replacement value for a `return <expr>` mutation, or `undefined`
 * when no replacement would change behaviour (the expression already IS the
 * canonical replacement). Numeric → `0`/`1`; everything else → `null`/`undefined`.
 */
function canonicalReturnReplacement(expr: ts.Expression, originalText: string): string | undefined {
  if (ts.isNumericLiteral(expr)) {
    const replacement = expr.text === '0' ? '1' : '0';
    return originalText === replacement ? undefined : replacement;
  }
  if (originalText === 'null') return undefined;
  return 'null';
}

/** `!x` → `x` — strip a single logical-NOT (the prefix-`!` operand becomes the whole expr). */
function unaryNotMutation(node: ts.Node, sourceFile: ts.SourceFile, operator: MutationOperatorId): readonly Mutation[] {
  if (!ts.isPrefixUnaryExpression(node) || node.operator !== ts.SyntaxKind.ExclamationToken) return [];
  const originalText = nodeText(node, sourceFile);
  const mutatedText = nodeText(node.operand, sourceFile);
  return [{ operator, start: node.getStart(sourceFile), end: node.getEnd(), originalText, mutatedText }];
}

/**
 * A non-empty string literal → the empty string. The replacement keeps the SAME
 * quote style (so the splice stays valid source), emptying only the content. A
 * literal that is already empty is skipped (no behaviour change). Template literals
 * are deliberately NOT mutated here (their substitutions would need re-balancing) —
 * the operator stays unambiguous.
 */
function stringLiteralMutation(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  operator: MutationOperatorId,
): readonly Mutation[] {
  if (!ts.isStringLiteral(node) || node.text === '') return [];
  const raw = nodeText(node, sourceFile);
  const quote = raw.charAt(0);
  return [
    {
      operator,
      start: node.getStart(sourceFile),
      end: node.getEnd(),
      originalText: raw,
      mutatedText: `${quote}${quote}`,
    },
  ];
}
