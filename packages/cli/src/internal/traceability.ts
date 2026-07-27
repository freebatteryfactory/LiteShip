/**
 * The HOST traceability state machine (the avionics-tier requirements-traceability
 * ledger, DO-178B-style) — parse `traceability/*.yaml`, scan the test corpus for
 * `// PROVES:` headers, run the deterministic lifecycle fold, content-address the
 * resolved ledger, and produce the flat {@link TraceabilityFacts} the lean
 * `@liteship/gauntlet` `traceabilityBridgeGate` folds.
 *
 * This is the SAME host-injection pattern as `repo-ir-gauntlet.ts`'s `--supply-chain`
 * block (the host computes the heavy facts; the lean engine just folds): the YAML
 * parse + the corpus scan + the lifecycle machine all live HERE, off the lean
 * gauntlet. The gauntlet carries no `yaml`/`typescript` dep; this module reads the
 * filesystem and reasons over the ledger, then hands the engine a flat facts record.
 *
 * THE LIFECYCLE STATE MACHINE (deterministic, a PURE fold — no class, a `_tag` union):
 *
 *   DECLARED (in invariants.yaml)
 *     → TRACED  (testing-ledger.yaml maps it to a proving test)
 *     → PROVEN  (the exact nested test title EXISTS and its file carries a matching
 *                `// PROVES:` header)
 *   UNTRACED  (declared, no proof, no waiver)                          → a finding
 *   WAIVED    (a non-expired owner-signed waiver covers it)
 *     → EXPIRED  (the waiver's expiry < the injected wall-clock date)  → a finding
 *
 * The transition function is a pure fold over (the ledger + the discovered PROVES
 * headers + the waivers + the wall-clock date). The wall-clock date is INJECTED (the
 * TWO-CLOCK LAW: expiry is a CALENDAR comparison, never `systemClock`). The resolved
 * ledger is content-addressed (the ONE `contentAddressOf` kernel from `@liteship/core`),
 * so DRIFT in the resolved trace is detectable. A malformed ledger FAILS LOUD (a
 * tagged error), never silently misparses.
 *
 * THE HEAD-PROBE LAW: the trace is computed from LIVE test titles and headers, not
 * hardcoded. A renamed/duplicate title, a ledger entry whose claimed file lacks a
 * matching `// PROVES:` header, or a live header with no reverse ledger edge is a
 * DIVERGENCE finding.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { contentAddressOf } from '@liteship/core';
import { walkFiles } from '@liteship/core/fs-walk';
import { normalizeRepoPath } from '@liteship/audit';
import { ParseError, InvariantViolationError } from '@liteship/error';
import type { TraceabilityFacts, ResolvedInvariant, InvariantState, TraceabilityDivergence } from '@liteship/gauntlet';

/** Repo-relative location of the requirements register. */
const INVARIANTS_PATH = 'traceability/invariants.yaml';
/** Repo-relative location of the trace (test refs / waivers). */
const TESTING_LEDGER_PATH = 'traceability/testing-ledger.yaml';
/** The globs the corpus scan walks for `// PROVES:` headers (repo-relative roots). */
const CORPUS_ROOTS: readonly string[] = ['tests', 'packages'];

// ───────────────────────── the parsed-ledger shapes ─────────────────────────

/** One declared invariant as read from invariants.yaml (pre-resolution). */
interface DeclaredInvariant {
  readonly id: string;
  readonly law: string;
  readonly level: string;
  readonly category: string;
}

/** A waiver as read from testing-ledger.yaml. */
interface LedgerWaiver {
  readonly owner: string;
  readonly justification: string;
  /** ISO `yyyy-mm-dd`; past the injected date ⇒ EXPIRED. */
  readonly expiry: string;
}

/** One trace entry: an invariant id mapped to proving tests OR a waiver. */
interface TraceEntry {
  readonly id: string;
  readonly tests?: readonly string[];
  readonly waiver?: LedgerWaiver;
}

// ─────────────────────────── the minimal YAML reader ────────────────────────
//
// NOT a general YAML parser — a total, line-oriented reader over the CONSTRAINED
// ledger schema (a top-level key holding a sequence of mappings; each mapping has
// scalar fields and at most one `tests:` list and one `waiver:` sub-mapping). Like
// the pnpm-lock reader, it FAILS LOUD (tagged ParseError) on any shape it cannot
// account for, never silently dropping an entry (which would let an untraced
// invariant slip the gate).

/** Strip a surrounding single/double quote pair a YAML scalar may carry. */
function unquoteScalar(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Leading-space indent width of a line. */
function indentWidth(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

/** Drop blank lines and full-line `#` comments — the lines the reader walks. */
function significantLines(text: string): { line: string; lineNo: number }[] {
  const out: { line: string; lineNo: number }[] = [];
  const raw = text.split(/\r?\n/);
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i] ?? '';
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    out.push({ line, lineNo: i + 1 });
  }
  return out;
}

/**
 * Read the single top-level mapping key (e.g. `invariants:` / `traces:`) that holds
 * the sequence, returning the lines UNDER it. Fails loud if the expected key is
 * absent — a malformed ledger must be visible, never an empty parse.
 */
function sectionUnder(
  lines: { line: string; lineNo: number }[],
  key: string,
  path: string,
): { line: string; lineNo: number }[] {
  const header = `${key}:`;
  const idx = lines.findIndex(({ line }) => line.trim() === header);
  if (idx < 0) {
    throw ParseError(path, `expected a top-level "${header}" sequence — not a recognizable traceability ledger`);
  }
  return lines.slice(idx + 1);
}

/**
 * Parse a sequence of mappings under a top-level key. Each item starts with a
 * `- key: value` line at the sequence indent; continuation lines at a deeper indent
 * are the item's remaining fields (including a nested `tests:` list of `- scalar`
 * entries and a nested `waiver:` mapping). Returns one record per item, with every
 * scalar/list/sub-mapping field flattened into a typed accumulator the callers map.
 *
 * The reader is total over the ledger schema (sequence indent 0, item fields indent
 * 4, list/sub-mapping leaves indent 6) and throws on a line it cannot place.
 */
interface RawItem {
  readonly fields: ReadonlyMap<string, string>;
  readonly lists: ReadonlyMap<string, readonly string[]>;
  readonly subMaps: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly lineNo: number;
}

function parseSequenceOfMappings(body: { line: string; lineNo: number }[], path: string): readonly RawItem[] {
  const items: RawItem[] = [];
  let fields: Map<string, string> | null = null;
  let lists: Map<string, readonly string[]> | null = null;
  let subMaps: Map<string, Map<string, string>> | null = null;
  let itemLineNo = 0;
  // Context for a nested list (`tests:`) or sub-mapping (`waiver:`) currently open.
  let openListKey: string | null = null;
  let openList: string[] | null = null;
  let openMapKey: string | null = null;
  let openMap: Map<string, string> | null = null;

  const closeNested = (): void => {
    if (openListKey !== null && openList !== null && lists !== null) lists.set(openListKey, openList);
    if (openMapKey !== null && openMap !== null && subMaps !== null) subMaps.set(openMapKey, openMap);
    openListKey = null;
    openList = null;
    openMapKey = null;
    openMap = null;
  };

  const flushItem = (): void => {
    closeNested();
    if (fields !== null && lists !== null && subMaps !== null) {
      items.push({ fields, lists, subMaps, lineNo: itemLineNo });
    }
    fields = null;
    lists = null;
    subMaps = null;
  };

  for (const { line, lineNo } of body) {
    const indent = indentWidth(line);
    const trimmed = line.trim();

    // A new sequence item: `- key: value` at indent 0..2 starting with `- `.
    if (trimmed.startsWith('- ') && indent <= 2) {
      flushItem();
      fields = new Map<string, string>();
      lists = new Map<string, readonly string[]>();
      subMaps = new Map<string, Map<string, string>>();
      itemLineNo = lineNo;
      const rest = trimmed.slice(2);
      const colon = rest.indexOf(':');
      if (colon < 0) {
        throw ParseError(path, `sequence item is not a "- key: value" mapping`, { offset: lineNo });
      }
      const k = rest.slice(0, colon).trim();
      const v = rest.slice(colon + 1).trim();
      fields.set(k, unquoteScalar(v));
      continue;
    }

    if (fields === null || lists === null || subMaps === null) {
      throw ParseError(path, `unexpected line outside any sequence item: "${trimmed}"`, { offset: lineNo });
    }

    // A nested list ENTRY (`- scalar`) for the currently-open list key.
    if (trimmed.startsWith('- ') && openListKey !== null && openList !== null) {
      openList.push(unquoteScalar(trimmed.slice(2)));
      continue;
    }

    // A `key:` / `key: value` field line within the item.
    const colon = trimmed.indexOf(':');
    if (colon < 0) {
      throw ParseError(path, `field line is not "key: value": "${trimmed}"`, { offset: lineNo });
    }
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();

    // An open sub-mapping (`waiver:`) absorbs deeper `key: value` leaves.
    if (openMapKey !== null && openMap !== null && indent >= 6) {
      if (value === '') {
        throw ParseError(path, `sub-mapping field "${key}" has no value`, { offset: lineNo });
      }
      openMap.set(key, unquoteScalar(value));
      continue;
    }

    // A new field at the item level (indent 4): close any open nested context first.
    closeNested();
    if (value === '') {
      // A bare `key:` opens EITHER a list (`tests:`) or a sub-mapping (`waiver:`).
      if (key === 'tests') {
        openListKey = key;
        openList = [];
      } else {
        openMapKey = key;
        openMap = new Map<string, string>();
      }
      continue;
    }
    fields.set(key, unquoteScalar(value));
  }
  flushItem();
  return items;
}

/** A required scalar field — throws a tagged error when absent (fail loud). */
function requireField(item: RawItem, key: string, path: string): string {
  const v = item.fields.get(key);
  if (v === undefined || v === '') {
    throw ParseError(path, `entry at line ${item.lineNo} is missing the required "${key}" field`, {
      offset: item.lineNo,
    });
  }
  return v;
}

// ─────────────────────── parse the two ledger documents ─────────────────────

/** Parse invariants.yaml into the declared register. Total + fail-loud. */
function parseInvariants(text: string): readonly DeclaredInvariant[] {
  const body = sectionUnder(significantLines(text), 'invariants', INVARIANTS_PATH);
  const items = parseSequenceOfMappings(body, INVARIANTS_PATH);
  const seen = new Set<string>();
  const out: DeclaredInvariant[] = [];
  for (const item of items) {
    const id = requireField(item, 'id', INVARIANTS_PATH);
    if (seen.has(id)) {
      throw InvariantViolationError(
        'traceability',
        `invariant ${id} is declared more than once in ${INVARIANTS_PATH} — a duplicate id breaks the trace's identity`,
      );
    }
    seen.add(id);
    out.push({
      id,
      law: requireField(item, 'law', INVARIANTS_PATH),
      level: requireField(item, 'level', INVARIANTS_PATH),
      category: requireField(item, 'category', INVARIANTS_PATH),
    });
  }
  return out;
}

/** Parse testing-ledger.yaml into the trace entries. Total + fail-loud. */
function parseTestingLedger(text: string): readonly TraceEntry[] {
  const body = sectionUnder(significantLines(text), 'traces', TESTING_LEDGER_PATH);
  const items = parseSequenceOfMappings(body, TESTING_LEDGER_PATH);
  const out: TraceEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = requireField(item, 'id', TESTING_LEDGER_PATH);
    if (seen.has(id)) {
      throw InvariantViolationError(
        'traceability',
        `invariant ${id} is traced more than once in ${TESTING_LEDGER_PATH} — one invariant has exactly one proof-or-waiver owner`,
      );
    }
    seen.add(id);
    const tests = item.lists.get('tests');
    const waiverMap = item.subMaps.get('waiver');
    if (tests !== undefined && waiverMap !== undefined) {
      throw InvariantViolationError(
        'traceability',
        `trace entry ${id} carries BOTH tests and a waiver — exactly one is allowed (a trace OR a signed deferral)`,
      );
    }
    if (tests === undefined && waiverMap === undefined) {
      throw InvariantViolationError(
        'traceability',
        `trace entry ${id} carries NEITHER tests nor a waiver — a trace entry must map to a proof or a waiver`,
      );
    }
    if (tests !== undefined) {
      if (tests.length === 0) {
        throw InvariantViolationError('traceability', `trace entry ${id} has an empty tests list`);
      }
      out.push({ id, tests });
      continue;
    }
    const wm = waiverMap as ReadonlyMap<string, string>;
    const owner = wm.get('owner');
    const justification = wm.get('justification');
    const expiry = wm.get('expiry');
    if (owner === undefined || justification === undefined || expiry === undefined) {
      throw ParseError(TESTING_LEDGER_PATH, `waiver for ${id} must carry owner + justification + expiry`, {
        offset: item.lineNo,
      });
    }
    out.push({ id, waiver: { owner, justification, expiry } });
  }
  return out;
}

// ─────────────────────────── the PROVES header scan ─────────────────────────

/**
 * The `// PROVES:` header regex — captures the comma-separated id list. ANCHORED to
 * the START of the trimmed line (`^`): the line must BE a comment header, never prose
 * or a string literal that merely CONTAINS the token (a doc sentence like "scans for
 * `// PROVES:` headers", or a fixture that writes `// PROVES: ${x}`, must NOT register
 * — those would mint phantom undeclared-proof divergences). Each captured token is
 * additionally validated against {@link INV_ID} so only real INV-* ids count.
 */
const PROVES_HEADER = /^\/\/\s*PROVES:\s*(.+)/;

/**
 * The invariant-id shape: `INV-` then uppercase letters/digits/hyphens. A captured
 * token that does not match is a stray fragment (a template-literal tail, a prose
 * word), NOT a real proof claim — it is dropped, never minted as a divergence.
 */
const INV_ID = /^INV-[A-Z0-9-]+$/;

/**
 * One discovered proof claim from a test file's header: the file and the invariant
 * ids it claims to prove. The bidirectional-trace cross-check reads these.
 */
interface ProofClaim {
  readonly file: string;
  readonly invariantIds: readonly string[];
}

/** One statically-resolved Vitest title, including every enclosing suite. */
export interface ResolvedTestTitle {
  readonly fullTitle: string;
  readonly leafTitle: string;
  /** Present only when the statically resolved test call owns an executable callback. */
  readonly callback?: ts.ArrowFunction | ts.FunctionExpression;
}

type TestTitleScalar = string | number | boolean;
type TestTitleEnvironment = ReadonlyMap<string, TestTitleScalar>;

/** Strip TypeScript wrappers that do not change a test-title value. */
function unwrapTitleExpression(expression: ts.Expression): ts.Expression {
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

/** Evaluate the closed scalar subset Vitest titles and simple data tables use. */
function testTitleScalar(expression: ts.Expression, environment: TestTitleEnvironment): TestTitleScalar | undefined {
  const current = unwrapTitleExpression(expression);
  if (ts.isStringLiteralLike(current)) return current.text;
  if (ts.isNumericLiteral(current)) return Number(current.text);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isIdentifier(current)) return environment.get(current.text);
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.MinusToken) {
    const operand = testTitleScalar(current.operand, environment);
    return typeof operand === 'number' ? -operand : undefined;
  }
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const substitution = testTitleScalar(span.expression, environment);
      if (substitution === undefined) return undefined;
      value += String(substitution) + span.literal.text;
    }
    return value;
  }
  return undefined;
}

/** Evaluate a literal array used by `for..of` or `it.each([...])`. */
function testTitleRows(
  expression: ts.Expression,
  environment: TestTitleEnvironment,
): readonly (readonly TestTitleScalar[])[] | undefined {
  const current = unwrapTitleExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) return undefined;
  const rows: TestTitleScalar[][] = [];
  for (const element of current.elements) {
    if (ts.isSpreadElement(element)) return undefined;
    const rowExpression = unwrapTitleExpression(element);
    if (ts.isArrayLiteralExpression(rowExpression)) {
      const row: TestTitleScalar[] = [];
      for (const cell of rowExpression.elements) {
        if (ts.isSpreadElement(cell)) return undefined;
        const value = testTitleScalar(cell, environment);
        if (value === undefined) return undefined;
        row.push(value);
      }
      rows.push(row);
      continue;
    }
    const value = testTitleScalar(rowExpression, environment);
    if (value === undefined) return undefined;
    rows.push([value]);
  }
  return rows;
}

function memberName(expression: ts.Expression): string | undefined {
  const current = unwrapTitleExpression(expression);
  if (ts.isPropertyAccessExpression(current)) return current.name.text;
  if (ts.isElementAccessExpression(current) && current.argumentExpression !== undefined) {
    const key = testTitleScalar(current.argumentExpression, new Map());
    return typeof key === 'string' ? key : undefined;
  }
  return undefined;
}

function vitestRootName(expression: ts.Expression): string | undefined {
  const current = unwrapTitleExpression(expression);
  if (ts.isIdentifier(current)) return current.text;
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return vitestRootName(current.expression);
  }
  if (ts.isCallExpression(current)) return vitestRootName(current.expression);
  return undefined;
}

interface VitestCall {
  readonly kind: 'suite' | 'test';
  readonly title: ts.Expression;
  readonly callback?: ts.FunctionExpression | ts.ArrowFunction;
  readonly rows?: readonly (readonly TestTitleScalar[])[];
}

/** Recognize the Vitest call shapes admitted by the traceability ledger. */
function asVitestCall(call: ts.CallExpression, environment: TestTitleEnvironment): VitestCall | undefined {
  const root = vitestRootName(call.expression);
  const terminal = memberName(call.expression);
  const kind =
    terminal === 'describe' || root === 'describe' || root === 'suite'
      ? 'suite'
      : root === 'it' || root === 'test'
        ? 'test'
        : undefined;
  if (kind === undefined) return undefined;

  let rows: readonly (readonly TestTitleScalar[])[] | undefined;
  if (ts.isCallExpression(call.expression) && memberName(call.expression.expression) === 'each') {
    const data = call.expression.arguments[0];
    if (data === undefined) return undefined;
    rows = testTitleRows(data, environment);
    if (rows === undefined) return undefined;
  }

  const title = call.arguments[0];
  if (title === undefined) return undefined;
  const callback = call.arguments.find(
    (argument): argument is ts.FunctionExpression | ts.ArrowFunction =>
      ts.isFunctionExpression(argument) || ts.isArrowFunction(argument),
  );
  return { kind, title, callback, ...(rows === undefined ? {} : { rows }) };
}

function formatEachTitle(pattern: string, row: readonly TestTitleScalar[]): string | undefined {
  let index = 0;
  let unsupported = false;
  const title = pattern.replace(/%%|%[sdifjo]/g, (token) => {
    if (token === '%%') return '%';
    const value = row[index++];
    if (value === undefined) {
      unsupported = true;
      return token;
    }
    if (token === '%j' || token === '%o') return JSON.stringify(value);
    if (token === '%d' || token === '%i' || token === '%f') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) unsupported = true;
      return String(numeric);
    }
    return String(value);
  });
  return unsupported ? undefined : title;
}

function resolvedCallTitles(call: VitestCall, environment: TestTitleEnvironment): readonly string[] {
  const pattern = testTitleScalar(call.title, environment);
  if (typeof pattern !== 'string') return [];
  if (call.rows === undefined) return [pattern];
  return call.rows.map((row) => formatEachTitle(pattern, row)).filter((title): title is string => title !== undefined);
}

/**
 * Parse the actual static Vitest title topology. Unlike a source substring search,
 * this follows nested `describe` callbacks, literal `it.each` tables, and literal
 * `for..of` title variables. Dynamic titles outside that closed subset are omitted,
 * so a ledger pointer cannot false-green on code the resolver did not understand.
 */
export function scanResolvedTestTitles(file: string, text: string): readonly ResolvedTestTitle[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const titles: ResolvedTestTitle[] = [];

  const walk = (node: ts.Node, suites: readonly string[], environment: TestTitleEnvironment): void => {
    if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
      const declaration = node.initializer.declarations[0];
      const rows = testTitleRows(node.expression, environment);
      if (declaration !== undefined && ts.isIdentifier(declaration.name) && rows !== undefined) {
        for (const row of rows) {
          if (row.length !== 1) continue;
          const next = new Map(environment);
          next.set(declaration.name.text, row[0]!);
          walk(node.statement, suites, next);
        }
        return;
      }
    }

    if (ts.isCallExpression(node)) {
      const call = asVitestCall(node, environment);
      if (call !== undefined) {
        const callTitles = resolvedCallTitles(call, environment);
        if (call.kind === 'test') {
          for (const leafTitle of callTitles) {
            titles.push({
              leafTitle,
              fullTitle: [...suites, leafTitle].join(' > '),
              ...(call.callback === undefined ? {} : { callback: call.callback }),
            });
          }
          return;
        }
        if (call.callback !== undefined) {
          for (const suiteTitle of callTitles) walk(call.callback.body, [...suites, suiteTitle], environment);
        }
        return;
      }
    }

    ts.forEachChild(node, (child) => walk(child, suites, environment));
  };

  walk(source, [], new Map());
  return titles;
}

/** Recursively collect unit/property and Playwright test files under `root`. Deterministic (sorted). */
function collectTestFiles(repoRoot: string, root: string): readonly string[] {
  const abs = join(repoRoot, root);
  if (!existsSync(abs)) return [];
  // The shared `@liteship/core/fs-walk` walker (skips `node_modules`/`dist`, keeps
  // `.test.ts` / `.e2e.ts`); the explicit final sort preserves deterministic order.
  return walkFiles(abs, { skipDirs: ['node_modules', 'dist'], suffixes: ['.test.ts', '.e2e.ts'] })
    .map((full) => normalizeRepoPath(relative(repoRoot, full)))
    .sort();
}

/**
 * Scan the corpus for `// PROVES:` headers. A test file may carry one header naming
 * one-or-more invariant ids (comma-separated). Deterministic: files sorted, ids
 * trimmed + de-duplicated per file. The scan reads the header ANYWHERE in the file
 * (a header convention near the top, but not position-pinned).
 */
function scanProofClaims(repoRoot: string): readonly ProofClaim[] {
  const claims: ProofClaim[] = [];
  for (const root of CORPUS_ROOTS) {
    for (const file of collectTestFiles(repoRoot, root)) {
      const text = readFileSync(join(repoRoot, file), 'utf8');
      const ids = new Set<string>();
      for (const line of text.split(/\r?\n/)) {
        // Match against the TRIMMED line so the header anchor (`^//`) fires on a
        // genuine comment header at any indent, but NOT on a token embedded mid-line
        // (a string literal, a backtick-wrapped doc mention).
        const m = PROVES_HEADER.exec(line.trim());
        if (m === null) continue;
        for (const part of (m[1] ?? '').split(',')) {
          const id = part.trim();
          // Only real INV-* ids count — a stray fragment (template tail, prose) is
          // dropped, never minted as a phantom proof claim / undeclared-proof divergence.
          if (INV_ID.test(id)) ids.add(id);
        }
      }
      if (ids.size > 0) claims.push({ file, invariantIds: [...ids].sort() });
    }
  }
  return claims.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

// ──────────────────────── the deterministic lifecycle fold ──────────────────

/** True iff the waiver's expiry (ISO yyyy-mm-dd) is strictly before `now` (day granularity). */
function waiverExpired(expiry: string, now: Date): boolean {
  return new Date(expiry).getTime() < now.getTime();
}

interface ParsedTestRef {
  readonly file: string;
  readonly title: string | undefined;
}

/** Split the ledger's `file::test-name` identity without discarding either half. */
function parseTestRef(ref: string): ParsedTestRef {
  const sep = ref.indexOf('::');
  if (sep < 0) return { file: ref, title: undefined };
  return { file: ref.slice(0, sep), title: ref.slice(sep + 2) || undefined };
}

type TestTitleResolution = 'resolved' | 'unresolved' | 'ambiguous';

/**
 * Resolve an exact full nested title. Existing un-nested ledger rows remain valid
 * only when their leaf title is unique within the file; duplicates require the full
 * `suite > nested suite > test` identity and duplicate full identities fail closed.
 */
function resolveTestTitle(
  ref: ParsedTestRef,
  titlesByFile: ReadonlyMap<string, readonly ResolvedTestTitle[]>,
): TestTitleResolution {
  if (ref.title === undefined) return 'unresolved';
  const titles = titlesByFile.get(ref.file) ?? [];
  const fullMatches = titles.filter((title) => title.fullTitle === ref.title);
  if (fullMatches.length === 1) return 'resolved';
  if (fullMatches.length > 1) return 'ambiguous';
  const leafMatches = titles.filter((title) => title.leafTitle === ref.title);
  if (leafMatches.length === 1) return 'resolved';
  return leafMatches.length > 1 ? 'ambiguous' : 'unresolved';
}

/**
 * Resolve one declared invariant to its lifecycle state — the PURE transition. Given
 * the trace entry, the per-file proof-claim/title indexes, and the wall-clock date:
 *  - a `tests:` entry whose exact titles resolve uniquely and whose files carry a
 *    matching PROVES header → PROVEN.
 *  - a `tests:` entry with no matching live header / missing test → resolved as
 *    UNTRACED with the WHY (the divergence is recorded separately for the gate).
 *  - a `waiver:` entry → WAIVED, or EXPIRED when its expiry is past `now`.
 *  - no trace entry at all → UNTRACED.
 */
function resolveState(
  inv: DeclaredInvariant,
  trace: TraceEntry | undefined,
  provesByFile: ReadonlyMap<string, ReadonlySet<string>>,
  titlesByFile: ReadonlyMap<string, readonly ResolvedTestTitle[]>,
  now: Date,
): InvariantState {
  if (trace === undefined) {
    return { _tag: 'untraced', reason: 'no trace entry maps it to a proving test or a waiver.' };
  }
  if (trace.waiver !== undefined) {
    const { owner, justification, expiry } = trace.waiver;
    return waiverExpired(expiry, now)
      ? { _tag: 'expired', owner, justification, expiry }
      : { _tag: 'waived', owner, justification, expiry };
  }
  const tests = trace.tests ?? [];
  // PROVEN iff EVERY claimed test ref resolves one title and its file's live header
  // names this invariant. A ref that fails either half is recorded as a divergence
  // (below) and the invariant falls to UNTRACED — never green on a stale name.
  const allBacked = tests.every((ref) => {
    const parsed = parseTestRef(ref);
    return provesByFile.get(parsed.file)?.has(inv.id) === true && resolveTestTitle(parsed, titlesByFile) === 'resolved';
  });
  if (allBacked && tests.length > 0) {
    return { _tag: 'proven', provingTests: [...tests].sort() };
  }
  return {
    _tag: 'untraced',
    reason:
      'its claimed proving test(s) do not resolve one exact title with a matching `// PROVES:` header (a ledger⇔test divergence — see the divergence findings).',
  };
}

/**
 * Detect the ledger⇔header DIVERGENCES (the bidirectional-trace check):
 *  - `undeclared-proof`: a header PROVES an INV not in invariants.yaml.
 *  - `missing-test`:     a ledger `tests:` ref points at a file absent from the corpus.
 *  - `unbacked-claim`:   a ledger `tests:` ref's file exists but its header does not
 *                        name the invariant, its exact title does not resolve, or a
 *                        live file/header proof has no reverse ledger edge.
 */
function detectDivergences(
  declared: readonly DeclaredInvariant[],
  traces: readonly TraceEntry[],
  claims: readonly ProofClaim[],
  corpusFiles: ReadonlySet<string>,
  provesByFile: ReadonlyMap<string, ReadonlySet<string>>,
  titlesByFile: ReadonlyMap<string, readonly ResolvedTestTitle[]>,
): readonly TraceabilityDivergence[] {
  const declaredIds = new Set(declared.map((d) => d.id));
  const out: TraceabilityDivergence[] = [];

  // undeclared-proof: a live header names an INV the register never declared.
  for (const claim of claims) {
    for (const id of claim.invariantIds) {
      if (!declaredIds.has(id)) {
        out.push({
          kind: 'undeclared-proof',
          invariantId: id,
          detail: `the test ${claim.file} carries \`// PROVES: ${id}\` but ${id} is not declared in ${INVARIANTS_PATH}.`,
          subject: claim.file,
        });
      }
    }
  }

  const tracedProofPairs = new Set<string>();

  // missing-test / unbacked-claim: walk every `tests:` ref.
  for (const trace of traces) {
    for (const ref of trace.tests ?? []) {
      const parsed = parseTestRef(ref);
      const file = parsed.file;
      tracedProofPairs.add(`${file}\0${trace.id}`);
      if (!corpusFiles.has(file)) {
        out.push({
          kind: 'missing-test',
          invariantId: trace.id,
          detail: `the ledger claims ${ref} proves ${trace.id}, but ${file} is not in the test corpus.`,
          subject: ref,
        });
        continue;
      }
      if (provesByFile.get(file)?.has(trace.id) !== true) {
        out.push({
          kind: 'unbacked-claim',
          invariantId: trace.id,
          detail: `the ledger claims ${ref} proves ${trace.id}, but ${file}'s \`// PROVES:\` header does not name ${trace.id}.`,
          subject: ref,
        });
        continue;
      }
      const titleResolution = resolveTestTitle(parsed, titlesByFile);
      if (titleResolution !== 'resolved') {
        out.push({
          kind: 'unbacked-claim',
          invariantId: trace.id,
          detail:
            titleResolution === 'ambiguous'
              ? `the ledger claims ${ref} proves ${trace.id}, but that title is ambiguous in ${file}; use the unique full nested title and remove duplicate full identities.`
              : `the ledger claims ${ref} proves ${trace.id}, but its exact test title does not resolve in ${file}.`,
          subject: ref,
        });
      }
    }
  }

  // The reverse edge: every live file/header proof claim for a declared invariant
  // must be represented by at least one ledger ref in that same file. Otherwise a
  // test can announce authority without entering the trace register at all.
  for (const claim of claims) {
    for (const id of claim.invariantIds) {
      if (!declaredIds.has(id) || tracedProofPairs.has(`${claim.file}\0${id}`)) continue;
      out.push({
        kind: 'unbacked-claim',
        invariantId: id,
        detail: `the live test ${claim.file} carries \`// PROVES: ${id}\`, but testing-ledger.yaml has no proving-test ref for ${id} in that file.`,
        subject: claim.file,
      });
    }
  }

  return out.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) || a.invariantId.localeCompare(b.invariantId) || a.subject.localeCompare(b.subject),
  );
}

/**
 * Build the {@link TraceabilityFacts} the `traceabilityBridgeGate` folds — the HOST's
 * heavy job. Pure given (`repoRoot`, `now`): parse the two ledgers, scan the corpus
 * for PROVES headers, run the lifecycle fold, detect divergences, and content-address
 * the resolved ledger. Deterministic (sorted, content-addressed); `now` is the
 * INJECTED wall-clock date (the two-clock law — never `Date.now()` in here). A
 * malformed ledger throws a tagged error (fail-closed), never a silent misparse.
 */
export function buildTraceabilityFacts(repoRoot: string, now: Date): TraceabilityFacts {
  const invariantsPath = join(repoRoot, INVARIANTS_PATH);
  const ledgerPath = join(repoRoot, TESTING_LEDGER_PATH);
  if (!existsSync(invariantsPath) || !existsSync(ledgerPath)) {
    throw InvariantViolationError(
      'traceability',
      `the traceability ledger is missing (${INVARIANTS_PATH} and/or ${TESTING_LEDGER_PATH}) — the requirements-traceability run cannot resolve the trace without it.`,
    );
  }

  const declared = parseInvariants(readFileSync(invariantsPath, 'utf8'));
  const traces = parseTestingLedger(readFileSync(ledgerPath, 'utf8'));

  // A trace entry must reference a DECLARED invariant — a trace for an undeclared id
  // is a corrupt ledger (fail loud, never silently ignored).
  const declaredIds = new Set(declared.map((d) => d.id));
  for (const t of traces) {
    if (!declaredIds.has(t.id)) {
      throw InvariantViolationError(
        'traceability',
        `${TESTING_LEDGER_PATH} traces ${t.id}, which is not declared in ${INVARIANTS_PATH} — every trace must reference a declared invariant.`,
      );
    }
  }
  const traceById = new Map(traces.map((t) => [t.id, t]));

  const claims = scanProofClaims(repoRoot);
  const provesByFile = new Map<string, ReadonlySet<string>>(claims.map((c) => [c.file, new Set(c.invariantIds)]));
  const corpusFiles = new Set<string>(claims.map((c) => c.file));
  const titlesByFile = new Map<string, readonly ResolvedTestTitle[]>();
  const indexTitles = (file: string): void => {
    if (titlesByFile.has(file)) return;
    const absolute = join(repoRoot, file);
    if (!existsSync(absolute)) return;
    titlesByFile.set(file, scanResolvedTestTitles(file, readFileSync(absolute, 'utf8')));
  };
  for (const claim of claims) indexTitles(claim.file);
  // Also include EVERY test ref's file in the corpus set so a present-but-headerless
  // test is detected as `unbacked-claim`, not falsely as `missing-test`.
  for (const t of traces) {
    for (const ref of t.tests ?? []) {
      const file = parseTestRef(ref).file;
      if (existsSync(join(repoRoot, file))) {
        corpusFiles.add(file);
        indexTitles(file);
      }
    }
  }

  const invariants: ResolvedInvariant[] = declared
    .map((inv) => ({
      id: inv.id,
      law: inv.law,
      level: inv.level as ResolvedInvariant['level'],
      category: inv.category,
      state: resolveState(inv, traceById.get(inv.id), provesByFile, titlesByFile, now),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const divergences = detectDivergences(declared, traces, claims, corpusFiles, provesByFile, titlesByFile);

  // Content-address the RESOLVED ledger (the one @liteship/core kernel) — the drift
  // keystone. The address omits `now` so it stays stable across a same-day re-run;
  // it folds the invariants' resolved states + the divergences (the verdict surface).
  const ledgerAddress = contentAddressOf({ invariants, divergences });

  return { invariants, divergences, ledgerAddress };
}

// ═══════════════════════════ THE OBLIGATIONS LEDGER ═══════════════════════════
//
// The deferred-obligation taxonomy (P17, Program C). The SAME bidirectional-trace
// shape as the invariant ledger above, but over `traceability/obligations.yaml` and
// the `// OBLIGATION: OBL-*` markers in `packages/*/src`: a genuine, time-boxed
// deferral is REGISTERED in the ledger and referenced in source by a marker; the
// reconciler REQUIRES every marker to name a registered obligation (the head-probe
// LAW again). A marker naming an UNREGISTERED obligation is a divergence. A registered
// obligation with NO marker is FINE — it carries a `pointer` to its area (a devops
// phase, a test-note over the skip-allowlist) instead of an in-source marker.
//
// This is ADDITIVE to the invariant trace above — it does NOT touch
// {@link buildTraceabilityFacts} or the `traceabilityBridgeGate` bridge. The lean
// enforcement teeth for the intent-debt side (a bare `TODO`/`FIXME`/`HACK` that was
// never registered as an obligation) live in the `gauntlet/no-unregistered-todo` gate.

/** Repo-relative location of the obligations ledger (the deferred-obligation taxonomy). */
const OBLIGATIONS_PATH = 'traceability/obligations.yaml';

/** The source roots the marker scan walks for `// OBLIGATION:` markers (repo-relative). */
const OBLIGATION_SRC_ROOTS: readonly string[] = ['packages'];

/** The published-source shape a marker may live in — `packages/<pkg>/src/**` `.ts`. */
const PACKAGE_SRC = /^packages\/[^/]+\/src\//;

/** The closed taxonomy bucket every obligation declares. */
const OBLIGATION_CLASSES: ReadonlySet<string> = new Set(['deferred-feature', 'debt', 'test-note']);

/**
 * The `// OBLIGATION:` marker regex — captures the comma-separated id list. ANCHORED to
 * the START of the trimmed line (`^`), exactly like {@link PROVES_HEADER}: the line must
 * BE a comment marker, never prose or a string literal that merely CONTAINS the token (a
 * jsdoc line begins with `*`, a `const x = '// OBLIGATION: …'` string begins with `const`
 * — neither trims to `^//`, so neither registers a phantom). Each captured token is
 * additionally validated against {@link OBL_ID} so only real OBL-* ids count.
 */
const OBLIGATION_MARKER = /^\/\/\s*OBLIGATION:\s*(.+)/;

/**
 * The obligation-id shape: `OBL-` then uppercase letters/digits/hyphens. A captured token
 * that does not match (a `OBL-*` doc wildcard, a prose word) is a stray fragment, NOT a
 * real obligation reference — dropped, never minted as a divergence.
 */
const OBL_ID = /^OBL-[A-Z0-9-]+$/;

/** One declared obligation as read from obligations.yaml. */
export interface DeclaredObligation {
  readonly id: string;
  /** The taxonomy bucket: `deferred-feature` | `debt` | `test-note`. */
  readonly class: string;
  readonly owner: string;
  /** ISO `yyyy-mm-dd` re-confirmation date (a clock on the deferral). */
  readonly reviewBy: string;
  /** The file OR area the obligation lives at. */
  readonly pointer: string;
  readonly note: string;
}

/** One discovered `// OBLIGATION:` marker from a source file. */
export interface ObligationMarker {
  readonly file: string;
  /** The obligation ids the marker references (comma-separated in source), sorted + de-duped. */
  readonly obligationIds: readonly string[];
}

/**
 * A ledger⇔marker DIVERGENCE — a marker in source references an obligation the ledger
 * never declared (`unregistered-obligation`). The reverse (a registered obligation with
 * no marker) is NOT a divergence: it is a valid pointer-only obligation.
 */
export interface ObligationDivergence {
  readonly kind: 'unregistered-obligation';
  /** The obligation id the divergence concerns. */
  readonly obligationId: string;
  /** Human-readable WHY. */
  readonly detail: string;
  /** The source file the unregistered marker lives in. */
  readonly subject: string;
}

/**
 * The reconciled obligations ledger — every declared obligation, every discovered marker,
 * and every ledger⇔marker divergence, with the content address of the resolved ledger.
 */
export interface ObligationLedger {
  readonly obligations: readonly DeclaredObligation[];
  readonly markers: readonly ObligationMarker[];
  readonly divergences: readonly ObligationDivergence[];
  readonly ledgerAddress: string;
}

/** Parse obligations.yaml into the declared taxonomy. Total + fail-loud. */
function parseObligations(text: string): readonly DeclaredObligation[] {
  const body = sectionUnder(significantLines(text), 'obligations', OBLIGATIONS_PATH);
  const items = parseSequenceOfMappings(body, OBLIGATIONS_PATH);
  const seen = new Set<string>();
  const out: DeclaredObligation[] = [];
  for (const item of items) {
    const id = requireField(item, 'id', OBLIGATIONS_PATH);
    if (!OBL_ID.test(id)) {
      throw InvariantViolationError(
        'obligations',
        `obligation "${id}" in ${OBLIGATIONS_PATH} is not a valid OBL-<AREA>-<slug> id (uppercase letters/digits/hyphens after "OBL-")`,
      );
    }
    if (seen.has(id)) {
      throw InvariantViolationError(
        'obligations',
        `obligation ${id} is declared more than once in ${OBLIGATIONS_PATH} — a duplicate id breaks the ledger's identity`,
      );
    }
    seen.add(id);
    const cls = requireField(item, 'class', OBLIGATIONS_PATH);
    if (!OBLIGATION_CLASSES.has(cls)) {
      throw InvariantViolationError(
        'obligations',
        `obligation ${id} has class "${cls}", not one of the closed taxonomy [${[...OBLIGATION_CLASSES].join(', ')}]`,
      );
    }
    out.push({
      id,
      class: cls,
      owner: requireField(item, 'owner', OBLIGATIONS_PATH),
      reviewBy: requireField(item, 'review-by', OBLIGATIONS_PATH),
      pointer: requireField(item, 'pointer', OBLIGATIONS_PATH),
      note: requireField(item, 'note', OBLIGATIONS_PATH),
    });
  }
  return out;
}

/** Recursively collect the `packages/<pkg>/src/**` `.ts` files (repo-relative, sorted, deterministic). */
function collectSourceFiles(repoRoot: string, root: string): readonly string[] {
  const abs = join(repoRoot, root);
  if (!existsSync(abs)) return [];
  return walkFiles(abs, { skipDirs: ['node_modules', 'dist'], suffixes: ['.ts'] })
    .map((full) => normalizeRepoPath(relative(repoRoot, full)))
    .filter((rel) => PACKAGE_SRC.test(rel))
    .sort();
}

/**
 * Scan `packages/&#42;/src` for `// OBLIGATION:` markers. Mirrors {@link scanProofClaims}: a
 * file may carry one-or-more markers naming one-or-more obligation ids (comma-separated).
 * Deterministic — files sorted, ids trimmed + de-duped per file. The anchor (`^//` on the
 * TRIMMED line) fires on a genuine comment marker at any indent, never on a mid-line token.
 */
function scanObligationMarkers(repoRoot: string): readonly ObligationMarker[] {
  const markers: ObligationMarker[] = [];
  for (const root of OBLIGATION_SRC_ROOTS) {
    for (const file of collectSourceFiles(repoRoot, root)) {
      const text = readFileSync(join(repoRoot, file), 'utf8');
      const ids = new Set<string>();
      for (const line of text.split(/\r?\n/)) {
        const m = OBLIGATION_MARKER.exec(line.trim());
        if (m === null) continue;
        for (const part of (m[1] ?? '').split(',')) {
          const id = part.trim();
          if (OBL_ID.test(id)) ids.add(id);
        }
      }
      if (ids.size > 0) markers.push({ file, obligationIds: [...ids].sort() });
    }
  }
  return markers.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

/**
 * Detect the ledger⇔marker DIVERGENCES: a marker in source referencing an obligation the
 * ledger never declared (`unregistered-obligation`). The reverse — a registered obligation
 * carried only by a pointer, with no marker — is intentionally NOT a divergence.
 */
function detectObligationDivergences(
  declared: readonly DeclaredObligation[],
  markers: readonly ObligationMarker[],
): readonly ObligationDivergence[] {
  const declaredIds = new Set(declared.map((d) => d.id));
  const out: ObligationDivergence[] = [];
  for (const marker of markers) {
    for (const id of marker.obligationIds) {
      if (!declaredIds.has(id)) {
        out.push({
          kind: 'unregistered-obligation',
          obligationId: id,
          detail: `the source file ${marker.file} carries \`// OBLIGATION: ${id}\` but ${id} is not declared in ${OBLIGATIONS_PATH} — every in-source obligation marker must name a registered obligation.`,
          subject: marker.file,
        });
      }
    }
  }
  return out.sort((a, b) => a.obligationId.localeCompare(b.obligationId) || a.subject.localeCompare(b.subject));
}

/**
 * Build the reconciled {@link ObligationLedger} — parse obligations.yaml, scan
 * `packages/&#42;/src` for `// OBLIGATION:` markers, reconcile the two halves, and
 * content-address the resolved ledger. Pure given `repoRoot` (deterministic, sorted,
 * content-addressed — no clock, unlike the invariant fold: an obligation's `review-by`
 * is data the ledger CARRIES, not a verdict this reconciler decides). A missing or
 * malformed ledger FAILS LOUD (a tagged error), never a silent empty parse.
 */
export function buildObligationLedger(repoRoot: string): ObligationLedger {
  const obligationsPath = join(repoRoot, OBLIGATIONS_PATH);
  if (!existsSync(obligationsPath)) {
    throw InvariantViolationError(
      'obligations',
      `the obligations ledger is missing (${OBLIGATIONS_PATH}) — the deferred-obligation reconciliation cannot resolve without it.`,
    );
  }
  const obligations = parseObligations(readFileSync(obligationsPath, 'utf8'));
  const markers = scanObligationMarkers(repoRoot);
  const divergences = detectObligationDivergences(obligations, markers);
  const ledgerAddress = contentAddressOf({ obligations, markers, divergences });
  return { obligations, markers, divergences, ledgerAddress };
}
