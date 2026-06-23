/**
 * The SKIP-FORM detector — every shape a test-runner skip/disable can take, recognised over
 * {@link codeOnly} text so a PROSE mention of `it.skip` in a docstring (or a fixture STRING)
 * is never a real skip.
 *
 * WHY A COMPREHENSIVE TOKEN MATCHER, NOT AN AST. `@czap/gauntlet` is the LEAN engine: by
 * load-bearing LAW it carries NO `typescript` dependency (the RepoIR is an INJECTED
 * capability — the host builds it via one `ts.Program` and hands it in via `GateContext.ir`;
 * the engine never reaches for the compiler). `detectSkips` is a pure, dependency-free
 * primitive both this package's `no-skipped-test` gate AND `@czap/command`'s plumb-scan
 * delegate to, so it must run with zero injected capability — it cannot parse with the TS
 * compiler API. The robust answer within that contract is a TOKEN-AWARE matcher: tokenize
 * the {@link codeOnly}-stripped line into identifiers / `.` / `[...]` / string-literals, then
 * recognise a test-runner ROOT followed by ANY chain of skip-bearing accessors. A token walk
 * (unlike the old flat regex) catches the chained-modifier, bracket, and computed forms a
 * regex provably could not — the exact class codex round-3 broke (`it.concurrent.skip`,
 * `it.each([...]).skip`, `it["skip"]`, `it[cond?"skip":"only"]`).
 *
 * THE SURFACE COVERED (every static Vitest/Playwright/Jasmine skip-or-disable spelling):
 *  - terminal skip/disable property on a runner root: `it.skip` / `test.skip` /
 *    `describe.skip` / `suite.skip` / `bench.skip` / `.todo` / `.fails`;
 *  - the legacy x-prefix DISABLE aliases: `xit` / `xtest` / `xdescribe` / `xspecify`;
 *  - the CHAINED-MODIFIER forms, modifier in ANY position around `skip`: `it.concurrent.skip`,
 *    `test.concurrent.skip`, `it.sequential.skip`, `describe.concurrent.skip`, `it.skip.each`,
 *    `it.each([...]).skip`, `describe.each([...]).skip` — `concurrent`/`sequential`/`each`/
 *    `for` are passed THROUGH so a `skip`/`todo` anywhere in the chain still trips;
 *  - the runtime-CONDITIONAL calls `.skipIf(...)` / `.runIf(...)` (both ship the skipped arm
 *    green);
 *  - BRACKET access `it["skip"]` / `it['skip']` / `test[`skip`]` / `.todo` etc. — a string
 *    index naming a skip member is the dotted form in disguise;
 *  - COMPUTED / dynamic bracket access on a runner root — `it[cond ? "skip" : "only"]` /
 *    `it[someVar]` — where the member can't be read statically. A computed accessor on a TEST
 *    ROOT is suspicious (it CAN resolve to `skip`), so it is FLAGGED as a `computed` form
 *    rather than silently passed;
 *  - the BARE ALIAS reference (`COND ? it : it.skip`, `const f = COND ? it.skip : it`) — a
 *    skip accessor used as a VALUE, with no trailing call paren.
 *
 * Composition over inheritance: a match is a flat `_tag`-discriminated DATA record (the skip
 * FORM + the line + the matched text); the scan is a standalone fold. No classes.
 *
 * @module
 */

import { codeOnly } from './code-only.js';

/** The discriminated FORM of a detected skip — what shape the skip took. */
export type SkipForm =
  | 'call' // a skip/disable accessor immediately invoked — `it.skip(` / `xit(` / `it.concurrent.skip(` / `it["skip"](`
  | 'conditional' // a runtime-conditional skip call — `it.skipIf(` / `describe.runIf(`
  | 'alias' // a BARE skip accessor used as a value (no trailing `(`) — `COND ? it : it.skip`
  | 'computed'; // a COMPUTED member access on a test root — `it[cond ? "skip" : "only"]` / `it[v]` — could resolve to skip

/** One detected skip — its 1-based line, the form it took, and the matched token. */
export interface SkipMatch {
  readonly line: number;
  readonly form: SkipForm;
  /** The matched skip token (e.g. `it.skip`, `describe.skipIf`, `xit`, `it["skip"]`) — for the detail. */
  readonly token: string;
}

/**
 * The test-runner ROOTS a skip can hang off. `it`/`test`/`describe`/`suite`/`bench` are the
 * call surfaces; their `f`-prefixed FOCUS aliases (`fit`/`fdescribe`) are roots too (a focus
 * alias can still be `.skip`-chained). The legacy x-prefix DISABLE aliases are matched
 * separately (they ARE the skip — no accessor needed).
 */
const RUNNER_ROOTS: ReadonlySet<string> = new Set([
  'it',
  'test',
  'describe',
  'suite',
  'bench',
  'fit',
  'fdescribe',
  'specify',
  'fspecify',
]);

/**
 * The legacy x-prefix DISABLE aliases — the token IS the skip (Jasmine/Mocha/Jest heritage,
 * Vitest aliases `xit`/`xtest`/`xdescribe`). A bare identifier match (not a property of
 * something else) is a disabled test.
 */
const X_DISABLE_ALIASES: ReadonlySet<string> = new Set(['xit', 'xtest', 'xdescribe', 'xspecify']);

/**
 * The terminal SKIP/DISABLE member names — a `.skip`/`.todo`/`.fails` accessor (dotted OR
 * bracket-string) on a runner chain disables/blanks the test. `skip` and `todo` are the
 * always-skip members; `fails` inverts the assertion (a green-while-broken disguise) and is
 * treated as a skip-class disable.
 */
const SKIP_MEMBERS: ReadonlySet<string> = new Set(['skip', 'todo', 'fails']);

/**
 * The runtime-CONDITIONAL member names — `.skipIf(cond)` skips when the condition holds,
 * `.runIf(cond)` skips when it does NOT. Both ship the skipped arm green.
 */
const CONDITIONAL_MEMBERS: ReadonlySet<string> = new Set(['skipIf', 'runIf']);

/**
 * CHAIN-PASSTHROUGH modifier members — `concurrent` / `sequential` / `each` / `for` are
 * Vitest chain modifiers that are NOT themselves skips but sit BETWEEN the root and a `skip`
 * (`it.concurrent.skip`, `it.skip.each`, `it.each([...]).skip`). The walker passes through
 * them (and any `(...)` / `[...]` call/index that follows, e.g. `each([1,2])`) so a `skip`
 * later in the chain still trips. Any OTHER known modifier is also passed through generically.
 */
const PASSTHROUGH_MEMBERS: ReadonlySet<string> = new Set(['concurrent', 'sequential', 'each', 'for', 'extend', 'only']);

/** A lightweight token in the {@link codeOnly} stream. */
type Tok =
  | { readonly t: 'id'; readonly v: string; readonly col: number } // identifier / keyword
  | { readonly t: 'dot' } // `.`
  | { readonly t: 'str'; readonly v: string } // a string-literal MEMBER inside `[...]` (its inner text, unquoted)
  | { readonly t: 'lbracket'; readonly computed: boolean; readonly inner: string } // `[ ... ]` member index — computed flags non-pure-string
  | { readonly t: 'call' } // a balanced `( ... )` invocation group, body skipped — the chain may continue after it (`each(...).skip`)
  | { readonly t: 'other'; readonly v: string }; // any other punctuation char (`,` `?` `:` `=` …)

/**
 * Tokenize ONE line, structure read from the {@link codeOnly}-stripped `code` line (so a
 * top-level prose/string `it.skip` is blanked to spaces and never tokenizes), but bracket
 * BODY CONTENTS read from the parallel `raw` line at the SAME column offsets. This split is
 * load-bearing: `codeOnly` blanks ALL string literals — INCLUDING the `"skip"` inside
 * `it["skip"]` — so the code line shows only `it[      ]` and cannot tell a string index from
 * a computed one. `codeOnly` replaces chars 1:1 with spaces (newlines preserved per line), so
 * column `i` in `code` is column `i` in `raw`; we recover the real bracket body from `raw`.
 * A `[...]` that the code line shows as empty/whitespace-only but that the raw line fills with
 * a STRING literal is the disguised dotted form (`it["skip"]`); a raw body that is a non-string
 * expression is a genuine COMPUTED index.
 */
function tokenize(code: string, raw: string): readonly Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i]!;
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '.') {
      toks.push({ t: 'dot' });
      i++;
      continue;
    }
    if (c === '(') {
      // Collapse the balanced `( ... )` invocation into ONE `call` token, skipping its body
      // (depth-aware over the CODE line; nested parens close correctly). The body is the
      // callback/args — never a chain-relevant `.skip` on THIS root — so the chain resumes at
      // whatever follows the matching `)` (`it.each([1]).skip` → `id:it .each call .skip`).
      let depth = 1;
      let j = i + 1;
      while (j < code.length && depth > 0) {
        const cc = code[j]!;
        if (cc === '(') depth++;
        else if (cc === ')') {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      toks.push({ t: 'call' });
      i = j + 1; // skip past the `)`
      continue;
    }
    if (c === '[') {
      // Find the MATCHING `]` over the CODE line (depth-aware; a `[` inside a blanked string
      // can't appear since codeOnly spaced it out), then read the body from the RAW line at
      // the same span so string contents survive. The body decides string vs computed.
      let depth = 1;
      let j = i + 1;
      while (j < code.length && depth > 0) {
        const cc = code[j]!;
        if (cc === '[') depth++;
        else if (cc === ']') {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      const rawBody = raw.slice(i + 1, j); // contents of `[...]` from the RAW line (strings intact)
      const str = pureStringIndex(rawBody);
      if (str !== undefined) toks.push({ t: 'str', v: str });
      else toks.push({ t: 'lbracket', computed: rawBody.trim().length > 0, inner: rawBody.trim() });
      i = j + 1; // skip past the `]`
      continue;
    }
    if (isIdentStart(c)) {
      let v = c;
      let j = i + 1;
      while (j < code.length && isIdentPart(code[j]!)) {
        v += code[j]!;
        j++;
      }
      toks.push({ t: 'id', v, col: i });
      i = j;
      continue;
    }
    toks.push({ t: 'other', v: c });
    i++;
  }
  return toks;
}

/**
 * If a bracket body is a PURE string-literal index (`"skip"` / `'skip'` / `` `skip` ``) with
 * nothing else, return the unquoted inner text; otherwise `undefined` (it is a computed
 * index). NOTE: `codeOnly` blanks string CONTENTS at the top level, but a `[...]` body is
 * code, so the quotes + inner text survive here for us to read.
 */
function pureStringIndex(body: string): string | undefined {
  const trimmed = body.trim();
  if (trimmed.length < 2) return undefined;
  const q = trimmed[0]!;
  if (q !== '"' && q !== "'" && q !== '`') return undefined;
  if (trimmed[trimmed.length - 1] !== q) return undefined;
  const inner = trimmed.slice(1, -1);
  // A pure literal has no UN-escaped closing quote inside — a quote inside means concat/expr.
  if (inner.includes(q) && !inner.includes('\\' + q)) return undefined;
  return inner.replace(/\\(.)/g, '$1');
}

function isIdentStart(c: string): boolean {
  return /[A-Za-z_$]/.test(c);
}
function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_$]/.test(c);
}

/**
 * Scan ONE file's text for EVERY skip form, over {@link codeOnly} text (comments + top-level
 * string literals blanked) so a prose/fixture mention of `it.skip` is never flagged. Returns
 * one {@link SkipMatch} per matched line/form, de-duplicated. PURE — no I/O.
 */
export function detectSkips(text: string): readonly SkipMatch[] {
  const codeLines = codeOnly(text).split('\n');
  const rawLines = text.split('\n');
  const matches: SkipMatch[] = [];
  for (let i = 0; i < codeLines.length; i++) {
    scanLine(codeLines[i] ?? '', rawLines[i] ?? '', i + 1, matches);
  }
  return dedupe(matches);
}

/**
 * Walk one line's tokens, recognising a test-runner ROOT followed by a chain that contains a
 * skip/disable accessor (dotted, bracket-string, conditional, or computed). The walk starts at
 * EVERY token (not just the first) so a runner appearing mid-line — `const f = COND ? it :
 * it.skip` — is found at its own offset.
 */
function scanLine(code: string, raw: string, lineNo: number, out: SkipMatch[]): void {
  const toks = tokenize(code, raw);
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i]!;
    if (tk.t !== 'id') continue;
    // A bare x-prefix disable alias (`xit(` / `xdescribe(`): the token IS the skip. Guard it
    // is NOT a property access (`foo.xit` is not a runner) by checking the previous token.
    if (X_DISABLE_ALIASES.has(tk.v) && (i === 0 || toks[i - 1]!.t !== 'dot')) {
      out.push({ line: lineNo, form: 'call', token: tk.v });
      continue;
    }
    if (!RUNNER_ROOTS.has(tk.v)) continue;
    if (i > 0 && toks[i - 1]!.t === 'dot') continue; // `obj.it` — `it` is a property, not the root
    walkChain(toks, i, tk.v, lineNo, out);
  }
}

/**
 * From a confirmed runner root at index `start`, walk the accessor chain. Each `.member`,
 * `["member"]`, or `[computed]` either: trips a skip (skip/todo/fails member, or a conditional
 * member, or a computed access), is passed through (a known chain modifier — `concurrent`/
 * `each`/…), or ENDS the chain (an unrelated member / a call that isn't a skip). The first
 * trip wins for the line+root; we record it and stop walking this root.
 */
function walkChain(toks: readonly Tok[], start: number, rootName: string, lineNo: number, out: SkipMatch[]): void {
  let j = start + 1;
  let chain = rootName;
  while (j < toks.length) {
    const tk = toks[j]!;
    if (tk.t === 'dot') {
      const next = toks[j + 1];
      if (next === undefined || next.t !== 'id') return; // `.` with no member — give up
      const member = next.v;
      chain += '.' + member;
      if (SKIP_MEMBERS.has(member)) {
        out.push({ line: lineNo, form: followedByCall(toks, j + 2) ? 'call' : 'alias', token: chain });
        return;
      }
      if (CONDITIONAL_MEMBERS.has(member)) {
        out.push({ line: lineNo, form: 'conditional', token: chain });
        return;
      }
      if (PASSTHROUGH_MEMBERS.has(member) || isPlausibleModifier(member)) {
        j += 2; // consume `.member`; the loop then transparently steps over a trailing `call`/`[...]`
        continue;
      }
      return; // an unrelated member ends the runner chain (e.g. `it.toString`)
    }
    if (tk.t === 'str') {
      // Bracket-STRING access: `it["skip"]` / `it.concurrent["skip"]`.
      chain += `["${tk.v}"]`;
      if (SKIP_MEMBERS.has(tk.v)) {
        out.push({ line: lineNo, form: followedByCall(toks, j + 1) ? 'call' : 'alias', token: chain });
        return;
      }
      if (CONDITIONAL_MEMBERS.has(tk.v)) {
        out.push({ line: lineNo, form: 'conditional', token: chain });
        return;
      }
      if (PASSTHROUGH_MEMBERS.has(tk.v)) {
        j += 1;
        continue;
      }
      return;
    }
    if (tk.t === 'lbracket' && tk.computed) {
      // COMPUTED member access on a test ROOT — `it[cond ? "skip" : "only"]` / `it[v]`. The
      // member can't be read statically; on a runner root it CAN resolve to `skip`, so flag it.
      out.push({ line: lineNo, form: 'computed', token: `${chain}[${tk.inner}]` });
      return;
    }
    if (tk.t === 'call' || (tk.t === 'lbracket' && !tk.computed)) {
      // A balanced `(...)` invocation (`it.each([1])` → the call) or an empty `[]` — TRANSPARENT.
      // The chain may continue to a trailing `.skip` (`it.each([1]).skip`), so step over and keep
      // walking. A call NOT followed by a skip simply ends harmlessly when the line runs out.
      j += 1;
      continue;
    }
    return; // anything else (a `,`, `?`, `=`, end) ends this root's chain with no skip
  }
}

/**
 * A member name we don't explicitly enumerate but which is a plausible chain MODIFIER (a
 * lowercase identifier that is NOT a skip/conditional member) — passed through so an
 * UNKNOWN-but-real modifier between the root and a `skip` (a future Vitest chain word) does
 * not break the walk. We deliberately keep passing through so the detector is FORWARD-robust:
 * the chain only ENDS on a clearly-terminal member, but a skip later in it still trips.
 */
function isPlausibleModifier(member: string): boolean {
  // A modifier is a short, lower-camel chain word; treat any non-skip identifier as a
  // passthrough candidate ONLY if it is not obviously a terminal assertion/getter. We keep
  // this permissive (forward-robust): the real terminal that matters is a `skip` member,
  // and a non-skip member simply continues — a following `(` then ends the chain harmlessly.
  return /^[a-z][A-Za-z0-9]*$/.test(member) && !SKIP_MEMBERS.has(member) && !CONDITIONAL_MEMBERS.has(member);
}

/** Is the token at `idx` an immediate `(...)` call group — distinguishing a CALL form from a bare alias reference? */
function followedByCall(toks: readonly Tok[], idx: number): boolean {
  const tk = toks[idx];
  return tk !== undefined && tk.t === 'call';
}

/**
 * De-duplicate by (line, token), keeping the STRONGEST form per occurrence (call > conditional
 * > computed > alias) so a real call is never downgraded. Distinct tokens on the same line
 * (e.g. two different skips) are kept separately. Sorted by line then token for a stable,
 * reviewable order.
 */
function dedupe(matches: readonly SkipMatch[]): readonly SkipMatch[] {
  const rank: Record<SkipForm, number> = { call: 4, conditional: 3, computed: 2, alias: 1 };
  const byKey = new Map<string, SkipMatch>();
  for (const m of matches) {
    const key = `${m.line}::${m.token}`;
    const existing = byKey.get(key);
    if (existing === undefined || rank[m.form] > rank[existing.form]) byKey.set(key, m);
  }
  return [...byKey.values()].sort((a, b) => a.line - b.line || (a.token < b.token ? -1 : 1));
}
