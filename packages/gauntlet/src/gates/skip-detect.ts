/**
 * The SKIP-FORM detector — every shape a test-runner skip can take, recognised over
 * {@link codeOnly} text so a PROSE mention of `it.skip` in a docstring (or a fixture
 * STRING) is never a real skip.
 *
 * The original `noSkippedTestGate` matched only the literal CALL form `(it|test|describe
 * |bench).(skip|todo)(`. That missed the ALIAS forms the harness + the capability-gated
 * tests actually use:
 *  - `const renderIt = COND ? it : it.skip;` — a BARE `it.skip` reference (no call paren),
 *  - `const conditionalIt = COND ? it.skip : it;` — the inverse arm,
 *  - `it.skipIf(...)` / `describe.skipIf(...)` — vitest's runtime-conditional skip call,
 *  - `it.runIf(...)` — its inverse (runs ONLY when the condition holds → skips otherwise),
 *  - `test.skip(cond, reason)` — Playwright's conditional skip,
 * each of which silently ships green for the skipped arm. The fix widens the detector to
 * every form, then the {@link SANCTIONED_SKIPS} allowlist decides allow-vs-block — so a
 * legit capability gate is VISIBLE and audited, and any unsanctioned skip is caught.
 *
 * Composition over inheritance: a match is a flat `_tag`-discriminated DATA record (the
 * skip FORM + the line + the matched text); the scan is a standalone fold. No classes.
 *
 * @module
 */

import { codeOnly } from './code-only.js';

/** The discriminated FORM of a detected skip — what shape the skip took. */
export type SkipForm =
  | 'call' // it.skip( / test.skip( / describe.skip( / bench.skip( / it.todo( / xit(
  | 'conditional' // it.skipIf( / describe.skipIf( / it.runIf( — a runtime-conditional skip call
  | 'alias'; // a BARE it.skip reference (no paren) — `COND ? it : it.skip` / `COND ? it.skip : it`

/** One detected skip — its 1-based line, the form it took, and the matched token. */
export interface SkipMatch {
  readonly line: number;
  readonly form: SkipForm;
  /** The matched skip token (e.g. `it.skip`, `describe.skipIf`, `xit`) — for the detail. */
  readonly token: string;
}

/**
 * A skip/todo CALL: a runner verb (`it`/`test`/`describe`/`bench`) dotted to `skip`/`todo`
 * followed by `(`, OR the legacy `x`-prefix (`xit`/`xdescribe`/`xtest`) followed by `(`.
 * The `(` pins it to an invocation (never the bare reference the alias matcher handles).
 */
const CALL = /\b((?:it|test|describe|bench)\.(?:skip|todo)|x(?:it|describe|test))\s*\(/g;

/**
 * A runtime-CONDITIONAL skip CALL: `.skipIf(` or `.runIf(` on a runner verb. `skipIf`
 * skips when its condition holds; `runIf` skips when it does NOT — both ship the skipped
 * arm green, so both are skips that must be sanctioned to be allowed.
 */
const CONDITIONAL = /\b((?:it|test|describe|bench)\.(?:skipIf|runIf))\s*\(/g;

/**
 * A BARE `it.skip` / `test.skip` / `describe.skip` / `bench.skip` REFERENCE — the dotted
 * skip used as a VALUE, NOT immediately followed by `(`. This is the alias form
 * (`COND ? it : it.skip`, `const f = COND ? it.skip : it`), where the runner is stashed
 * in a variable and called later, so the literal `.skip(` never appears. Two negative
 * lookaheads keep it precise: `(?![A-Za-z])` right after `skip` excludes the conditional
 * `skipIf` (the {@link CONDITIONAL} matcher owns that), and `(?!\s*\()` excludes a real
 * call (the {@link CALL} matcher owns those).
 */
const ALIAS = /\b((?:it|test|describe|bench)\.skip)(?![A-Za-z])\s*(?!\s*\()/g;

/**
 * Scan ONE file's text for EVERY skip form, over {@link codeOnly} text (comments + string
 * literals blanked) so a prose/fixture mention of `it.skip` is never flagged. Returns one
 * {@link SkipMatch} per matched line/form, de-duplicated so a line that matches both the
 * alias lookahead and nothing else is counted once. PURE — no I/O.
 */
export function detectSkips(text: string): readonly SkipMatch[] {
  const lines = codeOnly(text).split('\n');
  const matches: SkipMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    pushAll(matches, line, i + 1, CALL, 'call');
    pushAll(matches, line, i + 1, CONDITIONAL, 'conditional');
    // The alias matcher would also fire on the `it.skip` INSIDE a real `it.skip(` call
    // (the lookahead is for `(`, and a call has the `(`, so it WON'T) — but a call line
    // can still carry a separate bare reference. Suppress a duplicate (same line+token)
    // so a line is reported once per distinct token.
    pushAll(matches, line, i + 1, ALIAS, 'alias');
  }
  return dedupe(matches);
}

/** Run a global matcher over a line, pushing a {@link SkipMatch} per hit. */
function pushAll(out: SkipMatch[], line: string, lineNo: number, re: RegExp, form: SkipForm): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null = re.exec(line);
  while (m !== null) {
    out.push({ line: lineNo, form, token: m[1] ?? m[0] });
    m = re.exec(line);
  }
}

/**
 * De-duplicate by (line, token): the CALL matcher and the ALIAS matcher both key on the
 * dotted `it.skip` text, but the ALIAS lookahead `(?!\s*\()` already excludes a call, so
 * they cannot both fire on the SAME occurrence. This dedupe is the belt-and-braces guard
 * against a line carrying the identical token twice via two matchers — the stronger form
 * (call > conditional > alias) wins, so a real call is never downgraded to an alias.
 */
function dedupe(matches: readonly SkipMatch[]): readonly SkipMatch[] {
  const rank: Record<SkipForm, number> = { call: 3, conditional: 2, alias: 1 };
  const byKey = new Map<string, SkipMatch>();
  for (const m of matches) {
    const key = `${m.line}::${m.token}`;
    const existing = byKey.get(key);
    if (existing === undefined || rank[m.form] > rank[existing.form]) byKey.set(key, m);
  }
  return [...byKey.values()].sort((a, b) => a.line - b.line || (a.token < b.token ? -1 : 1));
}
