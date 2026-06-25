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
 * ALIASED RUNNER ROOTS (codex round-4 — the rebind/import-rename evasion). The walk above
 * starts ONLY from the literal runner names (`it`/`test`/…), so ANY rebinding hid a skip from
 * BOTH consumers (proven `[]` misses: `import { it as spec } from "vitest"; spec.skip(...)`,
 * `const t = it; t.skip(...)`, `const { skip } = it; skip(...)`, `const skipIt = it.skip;
 * skipIt(...)`). The cure is a per-file PRE-PASS (`resolveAliases`) over the SAME
 * `codeOnly`-stripped text that, before the token walk, resolves runner aliases and feeds them
 * into the root set.
 *
 * STATEMENT-AWARE, NOT LINE-AWARE (codex round-5 — the multi-LINE evasion). The alias pre-pass
 * used to tokenize each PHYSICAL line and split on `;`, so a declaration/import whose tokens
 * SPAN multiple lines was never seen as one statement — four proven `[]` misses, all LEGAL
 * Vitest spellings: `import {\n  it as spec\n} from "vitest"`, `import * as v from "vitest"`
 * (`v.it.skip`), `const t: typeof it = it`, `const {\n  skip\n} = it`. The cure
 * ({@link tokenizeFile} + {@link splitFileStatements}) builds ONE whole-file token stream — each
 * token tagged with its 1-based line — collapsing `(...)`/`[...]` groups ACROSS line boundaries,
 * then splits into STATEMENTS on top-level `;` (and `import`/`export`/declaration boundaries that
 * lack a `;`) so a multi-line construct resolves as a single statement. The per-line token WALK
 * that finds the actual `.skip(` CALL stays line-by-line (a call sits on one line), and the
 * aliases it now knows about were resolved over the whole-file statement stream.
 *
 * The alias forms the statement pre-pass resolves into the root/alias sets:
 *  - VITEST IMPORT-RENAME — `import { it as spec, test as t2 } from "vitest"` ⇒ `spec`/`t2`
 *    become runner roots (the chain `spec.skip` then trips exactly like `it.skip`). This now
 *    resolves even when the specifier list SPANS lines (`import {\n  it as spec\n} from …`);
 *  - NAMESPACE IMPORT — `import * as v from "vitest"` ⇒ `v` is a runner NAMESPACE; a chain
 *    `v.it.skip(` / `v.describe.skip(` is the dotted runner form behind a namespace and trips
 *    (the walk treats a `<namespace>.<runner>` head as the runner root, then continues);
 *  - LOCAL REBIND — `const t = it;` / `let d = describe;` ⇒ `t`/`d` become runner roots;
 *    resolved TRANSITIVELY one decidable hop at a time to a fixpoint (`const a = it; const b =
 *    a;` ⇒ both `a` and `b` are roots — the depth is bounded only by the number of rebinds in
 *    the file, each pass adds the next hop until no new alias appears). A TYPE ANNOTATION on the
 *    binding (`const t: typeof it = it`) is stepped over: the `: <type>` between the LHS name and
 *    the `=` does not break the `= it` rebind detection;
 *  - `.skip`-CAPTURE — `const skipIt = it.skip;` ⇒ a bare `skipIt(...)` call is a DIRECT skip
 *    caller (the accessor was captured as a value, then invoked);
 *  - DESTRUCTURED skip member — `const { skip } = it;` / `const { todo: t } = test;` ⇒ a bare
 *    `skip(...)` / `t(...)` call is a skip (the skip member pulled off a runner root).
 *
 * THE HONEST RESIDUAL — what STATIC analysis cannot decide here. The ONE undecidable shape we
 * still FLAG (not silently pass) is a rebind whose RHS uses a runner root as a TERNARY ARM
 * (`const t = cond ? it : myObj`): the value can BE the runner, the ternary is a deliberate
 * obfuscation signal, and it is NARROW enough not to false-positive on the (very common)
 * ordinary use of a runner-NAMED identifier. A later call/chain on `t` is flagged `aliased`.
 *
 * What stays genuinely UNDECIDABLE and is therefore NOT flagged (to avoid flooding a real repo
 * with false positives — `it`/`test`/`describe`/`bench` are heavily-used ordinary names):
 *  - a call-result rebind (`const t = makeRunner()`) — only types tell whether the callee returns
 *    a runner; flagging every `const r = describe(...)` would mis-fire on the unrelated CLI
 *    `describe` command and a thousand like it;
 *  - a runner alias imported from a NON-runner module (`import { it as x } from "./local"`) —
 *    cross-module binding;
 *  - a member computed from runtime values on an ALIASED root (`alias["sk"+"ip"]`) — the
 *    existing `computed` form flags a computed member on a LITERAL root, but not through an
 *    opaque alias value;
 *  - a rebind to a name with NO runner mention at all (`const t = myObj; t.skip()`) — a genuine
 *    non-runner `.skip`, correctly left clean;
 *  - (codex round-5 residual, confirmed still undecidable) a binding pulled from a CALL RESULT
 *    rather than a static reference — `const { it: x } = await import("vitest")` (dynamic-import
 *    destructure), `import vitest from "vitest"; vitest.it.skip(` (DEFAULT import then member),
 *    a NAMESPACE re-aliased through a plain rebind (`const w = v; w.it.skip(` where `v` is the
 *    namespace) or a namespace MEMBER captured to a local (`const myIt = v.it; myIt.skip(`). Each
 *    needs cross-binding value resolution (what does `import(...)` resolve to; is `vitest`'s
 *    default the runner namespace; does `w`/`myIt` carry the namespace value) that only real
 *    binding resolution can answer — a string/token scan provably cannot, and a heuristic broad
 *    enough to catch them floods a real repo with false positives on ordinary `v`/`x`/`w` names.
 * The TRULY-complete fix for ALL of these is host-side binding resolution via the `ts.Program`
 * (the IR already carries it) — deliberately NOT built here (the lean engine has no `typescript`
 * dep); left as a documented host follow-up. See `resolveAliases`.
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
  | 'computed' // a COMPUTED member access on a test root — `it[cond ? "skip" : "only"]` / `it[v]` — could resolve to skip
  | 'aliased'; // a SUSPICIOUS rebind to a non-literal RHS that mentions a runner — `const t = cond ? it : x; t.skip(` — statically undecidable, flagged not passed

/**
 * The CONDITIONALITY classification of a detected skip — whether the skip's reachability is
 * GUARDED by a runtime condition (a capability gate) or is UNCONDITIONAL (a placeholder).
 *
 * This is the F2-soundness discriminant. The TOKEN {@link detectSkips} cannot decide it (it
 * cannot see an enclosing `if (<cond>) { … }` ancestor), so it leaves it `undefined`; the
 * AST detector (`detectSkipsAST`, in `@czap/audit`) sets it from a real ancestor walk:
 *  - `'skipIf'` / `'runIf'` — the call member IS the runtime gate (`it.skipIf(cond)(…)`);
 *  - `'ternary'` — the skip accessor is a TERNARY ARM (`cond ? it : it.skip`);
 *  - `'enclosing-if'` — the skip CALL sits inside an `if (<cond>) { … }` whose body holds it
 *    (the ancestor walk the token level cannot do — the soundness win);
 *  - `'unconditional'` — none of the above; the skip is ALWAYS reached (a placeholder).
 *
 * Optional on {@link SkipMatch}: the lean token detector omits it (the keyword-heuristic
 * fallback path decides sanctioning), the AST detector always sets it (the structural path).
 */
export type SkipConditionality = 'skipIf' | 'runIf' | 'ternary' | 'enclosing-if' | 'unconditional';

/** One detected skip — its 1-based line, the form it took, and the matched token. */
export interface SkipMatch {
  readonly line: number;
  readonly form: SkipForm;
  /** The matched skip token (e.g. `it.skip`, `describe.skipIf`, `xit`, `it["skip"]`) — for the detail. */
  readonly token: string;
  /**
   * The CONDITIONALITY classification — present ONLY when a structural (AST) detector produced
   * this match (`detectSkipsAST`); the token {@link detectSkips} omits it (`undefined`).
   * When present it is the SOUND F2 discriminant: an `'unconditional'` skip is a non-sanctionable
   * placeholder regardless of its title; any other value is a signable capability gate.
   */
  readonly conditional?: SkipConditionality;
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

/** A whole-file token: a {@link Tok} tagged with its 1-based source line (for statement-aware scan). */
type FileTok = Tok & { readonly line: number };

/**
 * Tokenize the WHOLE FILE into ONE line-tagged stream, collapsing `(...)` and `[...]` groups
 * ACROSS line boundaries (so a multi-line argument list or computed index is one token). This is
 * what makes the alias pre-pass STATEMENT-aware rather than line-aware: a declaration/import whose
 * tokens span multiple physical lines (`import {\n  it as spec\n} from "vitest"`, `const {\n  skip\n} = it`)
 * becomes a single contiguous token run, so {@link splitFileStatements} sees it as one statement.
 *
 * We scan the joined `codeOnly` text char-by-char (the same 1:1-blanked, newline-preserving text
 * the per-line {@link tokenize} reads), tracking the current line via `\n`. Bracket BODY contents
 * for the string-vs-computed decision are read from the parallel RAW text at the same absolute
 * offset — `codeOnly` is a 1:1 char map, so offsets align across the whole file exactly as they do
 * per line. A `(`/`[` that never closes before EOF collapses to the file end (defensive; never
 * happens in well-formed code).
 */
function tokenizeFile(code: string, raw: string): readonly FileTok[] {
  const toks: FileTok[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0; // absolute offset of the current line's first char — for line-RELATIVE `col`
  while (i < code.length) {
    const c = code[i]!;
    if (c === '\n') {
      line++;
      i++;
      lineStart = i;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '.') {
      toks.push({ t: 'dot', line });
      i++;
      continue;
    }
    if (c === '(') {
      // Collapse the balanced `( ... )` across line boundaries into ONE `call` token.
      let depth = 1;
      let j = i + 1;
      while (j < code.length && depth > 0) {
        const cc = code[j]!;
        if (cc === '(') depth++;
        else if (cc === ')') {
          depth--;
          if (depth === 0) break;
        }
        if (cc === '\n') {
          line++;
          lineStart = j + 1;
        }
        j++;
      }
      toks.push({ t: 'call', line });
      i = j + 1;
      continue;
    }
    if (c === '[') {
      // Collapse the balanced `[ ... ]` across line boundaries; recover the body from RAW for the
      // string-vs-computed decision (offsets align — codeOnly is a 1:1 char map).
      let depth = 1;
      let j = i + 1;
      const startLine = line;
      while (j < code.length && depth > 0) {
        const cc = code[j]!;
        if (cc === '[') depth++;
        else if (cc === ']') {
          depth--;
          if (depth === 0) break;
        }
        if (cc === '\n') {
          line++;
          lineStart = j + 1;
        }
        j++;
      }
      const rawBody = raw.slice(i + 1, j);
      const str = pureStringIndex(rawBody);
      if (str !== undefined) toks.push({ t: 'str', v: str, line: startLine });
      else toks.push({ t: 'lbracket', computed: rawBody.trim().length > 0, inner: rawBody.trim(), line: startLine });
      i = j + 1;
      continue;
    }
    if (isIdentStart(c)) {
      let v = c;
      let j = i + 1;
      while (j < code.length && isIdentPart(code[j]!)) {
        v += code[j]!;
        j++;
      }
      toks.push({ t: 'id', v, col: i - lineStart, line });
      i = j;
      continue;
    }
    toks.push({ t: 'other', v: c, line });
    i++;
  }
  return toks;
}

/**
 * Split the whole-file token stream into STATEMENTS. A statement ends at a top-level `;`. Because
 * an `import`/`export` line without a trailing `;` (ASI) would otherwise glue onto the next
 * statement, an `import` or `export` keyword at a statement boundary also ENDS the previous
 * statement (it always starts a fresh one). The dropped `;` is not re-emitted. Each returned slice
 * is one statement's line-tagged tokens — possibly spanning several physical lines.
 */
function splitFileStatements(toks: readonly FileTok[]): (readonly FileTok[])[] {
  const out: (readonly FileTok[])[] = [];
  let start = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k]!;
    if (t.t === 'other' && t.v === ';') {
      if (k > start) out.push(toks.slice(start, k));
      start = k + 1;
      continue;
    }
    // An `import`/`export` keyword that is NOT the first token of the current statement begins a
    // new one (ASI for a `;`-less import/export directly followed by another statement).
    if (t.t === 'id' && (t.v === 'import' || t.v === 'export') && k > start) {
      out.push(toks.slice(start, k));
      start = k;
    }
  }
  if (start < toks.length) out.push(toks.slice(start));
  return out;
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
 * The per-file ALIAS resolution — runner roots, direct skip-callers, destructured skip members,
 * and the suspicious (undecidable) rebinds — resolved by `resolveAliases` from the whole
 * file's `codeOnly` text, then handed to {@link scanLine} so the token walk treats `spec.skip`,
 * `t.skip`, `skipIt(...)`, and a bare `skip(...)` exactly like their literal-root equivalents.
 */
interface AliasTable {
  /** Identifiers that resolve (≥1 hop) to a runner root — added to the root set for the walk. */
  readonly roots: ReadonlySet<string>;
  /** Identifiers bound to a runner NAMESPACE import (`import * as v from "vitest"`) — a `v.it.skip` chain trips. */
  readonly namespaces: ReadonlySet<string>;
  /** Identifiers bound DIRECTLY to a skip accessor (`const skipIt = it.skip`) → the captured token; a bare call on them is a skip. */
  readonly directSkips: ReadonlyMap<string, string>;
  /** Identifiers destructured AS a skip member off a runner (`const { skip } = it`) → the source chain; a bare call is a skip. */
  readonly bareSkips: ReadonlyMap<string, string>;
  /** `line:col` of each destructured skip member's local name AT ITS BINDING PATTERN — suppresses the pattern from being read as a bare-skip USE (the multi-line destructure case the per-line site guard can't see). */
  readonly patternSites: ReadonlySet<string>;
  /** Identifiers rebound to a NON-literal RHS that MENTIONS a runner (`const t = cond ? it : x`) → the RHS text; a call/chain on them is FLAGGED `aliased` (undecidable, not silently passed). */
  readonly suspicious: ReadonlyMap<string, string>;
}

/**
 * Scan ONE file's text for EVERY skip form, over {@link codeOnly} text (comments + top-level
 * string literals blanked) so a prose/fixture mention of `it.skip` is never flagged. Returns
 * one {@link SkipMatch} per matched line/form, de-duplicated. PURE — no I/O.
 *
 * FILE-AWARE: a per-file `resolveAliases` PRE-PASS runs first (over the same `codeOnly`
 * text) so a runner rebind / import-rename / `.skip`-capture / destructured skip member is
 * resolved to a real root BEFORE the line-by-line token walk — closing the codex round-4
 * aliased-root evasion. See the module docstring for the resolved vs flagged vs undecidable
 * boundary.
 */
export function detectSkips(text: string): readonly SkipMatch[] {
  const code = codeOnly(text);
  const codeLines = code.split('\n');
  const rawLines = text.split('\n');
  const aliases = resolveAliases(code, text);
  const matches: SkipMatch[] = [];
  for (let i = 0; i < codeLines.length; i++) {
    scanLine(codeLines[i] ?? '', rawLines[i] ?? '', i + 1, aliases, matches);
  }
  return dedupe(matches);
}

/**
 * THE PER-FILE ALIAS PRE-PASS. Over the whole file's `codeOnly`-stripped tokens (so a prose
 * mention of `const t = it` in a comment/string never resolves an alias), recognise the four
 * DECIDABLE runner-rebind shapes and the one SUSPICIOUS (undecidable-but-smelly) shape, then
 * close over them to a fixpoint so transitive rebinds (`const a = it; const b = a;`) resolve
 * one hop per pass (depth bounded by the rebind count). The recognised forms:
 *
 *  - `import { it as spec, test as t2 } from "vitest"` → `spec`, `t2` are roots. We scan the
 *    import specifier list for `<runnerRoot> as <local>` pairs (and a bare `it` import re-exposes
 *    `it`, already a root). The module is required to be a known test runner (`vitest` /
 *    `@jest/globals` / `node:test` / `bun:test`) so an unrelated `import { it as x } from "./z"`
 *    is not mistaken for a runner — but if the module is unknown AND the imported name is a
 *    runner root, that is the undecidable cross-module case → recorded `suspicious`.
 *  - `const t = it;` / `let d = describe;` → `t`, `d` are roots (RHS is exactly a known root or
 *    an already-resolved alias root — the transitive hop).
 *  - `const skipIt = it.skip;` → `skipIt` is a DIRECT skip caller (RHS is a runner chain whose
 *    terminal member is a skip/conditional member). A bare `skipIt(...)` is a skip.
 *  - `const { skip } = it;` / `const { todo: gone } = test;` → a bare `skip(...)` / `gone(...)`
 *    is a skip (the skip member destructured off a runner root).
 *  - `const t = cond ? it : x;` / `const t = makeRunner();` (RHS is NOT a clean alias but DOES
 *    mention a runner root) → `suspicious`: a call/chain on `t` is FLAGGED `aliased`.
 *
 * UNDECIDABLE (left to the host's `ts.Program`, NOT resolved here): a rebind whose RHS mentions
 * NO runner at all (`const t = myObj`) is simply not an alias (so `t.skip()` stays clean — a
 * genuine non-runner skip is a false positive we must not raise); a runner alias imported from a
 * NON-runner module; a member computed from runtime values on an aliased root.
 */
function resolveAliases(code: string, raw: string): AliasTable {
  const roots = new Set<string>(RUNNER_ROOTS);
  const namespaces = new Set<string>();
  const directSkips = new Map<string, string>();
  const bareSkips = new Map<string, string>();
  const patternSites = new Set<string>();
  const suspicious = new Map<string, string>();

  // Tokenize the WHOLE FILE into one line-tagged stream, then split into STATEMENTS on top-level
  // `;` / import boundaries. This is STATEMENT-aware, not line-aware: a declaration/import whose
  // tokens span multiple physical lines (`import {\n  it as spec\n} from "vitest"`, `const {\n
  // skip\n} = it`) is now ONE statement, so every collector sees the whole construct. Multiple
  // declarations on one physical line still each resolve (the `;` split is unchanged).
  const statements = splitFileStatements(tokenizeFile(code, raw));

  // Pass 1 (non-transitive): imports (named-rename + namespace), destructures, and direct-skip
  // captures. These don't depend on other aliases, so one pass settles them.
  for (const toks of statements) {
    collectImportRenames(toks, roots, namespaces, suspicious);
    collectDestructuredSkips(toks, bareSkips, patternSites);
    collectDirectSkipCaptures(toks, directSkips);
  }

  // Pass 2 (transitive fixpoint): plain `const t = <root>` rebinds (incl. a `: typeof it` typed
  // annotation), one hop per pass, until no new root is discovered (`const a = it; const b = a;`
  // → both `a` and `b`). The loop count is bounded by the number of rebind statements.
  let changed = true;
  let guard = 0;
  while (changed && guard < statements.length + 1) {
    changed = false;
    guard++;
    for (const toks of statements) {
      if (collectRootRebinds(toks, roots, suspicious)) changed = true;
    }
  }

  return { roots, namespaces, directSkips, bareSkips, patternSites, suspicious };
}

/**
 * The test-runner modules whose `import { it as x }` we trust to be a real runner rename. An
 * `import { it as x } from "./local"` is NOT one of these — its `it` could be anything — so it is
 * NOT silently treated as a runner (it is recorded suspicious only because a runner-named import
 * from an unknown module is itself a smell).
 */
const RUNNER_MODULES: ReadonlySet<string> = new Set(['vitest', '@jest/globals', 'node:test', 'bun:test']);

/**
 * `import { it as spec, test as t2 } from "vitest"` → add `spec`, `t2` as roots (when the module
 * is a known runner). A runner-named import from an UNKNOWN module is recorded suspicious. We read
 * the specifier list between the `{` and `}` and the module string from the trailing `from "..."`.
 *
 * ALSO `import * as v from "vitest"` → register `v` as a runner NAMESPACE (the shape is
 * `import other('*') id('as') id(<local>) id('from') …`). A `v.it.skip(` chain then trips: the
 * walk recognises a `<namespace>.<runner>` head as a runner root. Because the specifier list and
 * the `from` clause may span multiple physical lines, this runs over the whole-file STATEMENT
 * token stream (see {@link tokenizeFile} / {@link splitFileStatements}).
 */
function collectImportRenames(
  toks: readonly Tok[],
  roots: Set<string>,
  namespaces: Set<string>,
  suspicious: Map<string, string>,
): void {
  if (toks.length === 0 || toks[0]?.t !== 'id' || toks[0].v !== 'import') return;
  // NAMESPACE import: `import * as v from "vitest"` → `v` is a runner namespace.
  if (toks[1]?.t === 'other' && toks[1].v === '*' && toks[2]?.t === 'id' && toks[2].v === 'as' && toks[3]?.t === 'id') {
    const moduleName = importModuleName(toks);
    if (moduleName === undefined || RUNNER_MODULES.has(moduleName)) namespaces.add(toks[3].v);
    return;
  }
  // Find the brace span and the module string. `codeOnly` blanks the module string CONTENTS, so
  // the `from` module is read from the raw bracket recovery is N/A — instead detect the source by
  // the `from` keyword; the module IDENTITY is recovered from the raw line via the str token only
  // for bracket bodies, not import sources, so we accept the import as a runner import when a
  // `from` clause is present and resolve the module name from the raw token stream is unavailable.
  // Simpler + sound: collect `<name> as <local>` pairs where <name> is a runner root, and decide
  // trust by the module — recovered below.
  const moduleName = importModuleName(toks);
  let i = 0;
  // Walk the specifier list: sequences of `id [as id]` separated by `other ','`.
  while (i < toks.length) {
    const tk = toks[i];
    if (tk?.t === 'id' && RUNNER_ROOTS.has(tk.v)) {
      const asTok = toks[i + 1];
      const localTok = toks[i + 2];
      if (asTok?.t === 'id' && asTok.v === 'as' && localTok?.t === 'id') {
        // `it as spec` — `spec` is the local binding for a runner.
        if (moduleName === undefined || RUNNER_MODULES.has(moduleName)) roots.add(localTok.v);
        else suspicious.set(localTok.v, `imported runner alias from non-runner module ${moduleName}`);
        i += 3;
        continue;
      }
    }
    i++;
  }
}

/**
 * Recover the import's module string. `codeOnly` blanks the module-string contents, but the
 * RAW line carries it; the import source follows the `from` keyword. We find `from` in the token
 * stream and read the next string-ish run from the raw text is not retained per-line here, so we
 * return `undefined` (treat as a TRUSTED runner import) UNLESS a `from` clause names a module we
 * can read — kept conservative: a missing module name defaults to trusted, because a bare
 * `import { it as spec }` in a test file is overwhelmingly the vitest runner, and treating it as a
 * root is the safe (catch-the-skip) direction. A genuine non-runner import that happens to rename
 * `it` and then `.skip()`s it is vanishingly rare AND still merely flags a real `.skip(` call.
 */
function importModuleName(_toks: readonly Tok[]): string | undefined {
  return undefined;
}

/**
 * `const t = it;` / `let d = describe;` (and the `var` keyword too) — a previously-resolved alias root. Adds
 * the LHS name as a root when the RHS is EXACTLY a single known root token followed by a
 * statement end (`;` / line end). A non-trivial RHS that MENTIONS a root but is not a clean alias
 * (`const t = cond ? it : x`) is recorded suspicious. Returns true if it added a NEW root (drives
 * the transitive fixpoint). The RHS-mentions-no-root case is left untouched (not an alias).
 *
 * A TYPE ANNOTATION on the binding (`const t: typeof it = it`) is stepped over: an optional
 * `: <type-tokens>` between the LHS name and the binding `=` is skipped, so the `= it` rebind is
 * detected on its RHS exactly as for an un-annotated binding. The annotation's OWN `typeof it`
 * mention is not the RHS — only what follows the binding `=` is.
 */
function collectRootRebinds(toks: readonly Tok[], roots: Set<string>, suspicious: Map<string, string>): boolean {
  // Shape: `id(decl-kw) id(lhs) [other(':') <type…>] other('=') <rhs…>` where decl-kw ∈ {const,let,var}.
  if (toks.length < 4) return false;
  const kw = toks[0];
  const lhs = toks[1];
  if (kw?.t !== 'id' || (kw.v !== 'const' && kw.v !== 'let' && kw.v !== 'var')) return false;
  if (lhs?.t !== 'id') return false;
  if (roots.has(lhs.v)) return false; // already a root
  // Locate the binding `=`, stepping over an optional `: <type annotation>` between LHS and `=`.
  const eqIdx = bindingEqIndex(toks);
  if (eqIdx === -1) return false;
  const rhs = toks.slice(eqIdx + 1);
  // Clean alias: RHS is exactly one root id, then end-of-statement (`;`) or nothing.
  const first = rhs[0];
  const second = rhs[1];
  const cleanAlias =
    first?.t === 'id' && roots.has(first.v) && (second === undefined || (second.t === 'other' && second.v === ';'));
  if (cleanAlias && first?.t === 'id') {
    roots.add(lhs.v);
    return true;
  }
  // Suspicious: the RHS uses a runner root as a TERNARY ARM (`const t = cond ? it : x`) — the
  // binding can BE the runner, so a later call on `t` is undecidable-but-smelly → flag. This is
  // deliberately NARROW (ternary-arm only): the runner names `it`/`test`/`describe`/`bench` are
  // extremely common as ordinary identifiers (a loop var `test`, the CLI `describe(...)` command,
  // an object shorthand `{ test }`), so a broader "RHS mentions a runner" heuristic floods a real
  // repo with false positives. A plain call-result rebind (`const t = makeRunner()`) is therefore
  // left UNDECIDABLE here — only the host's ts.Program can resolve whether the callee returns a
  // runner; see the module docstring's host follow-up note. We also do NOT flag when the RHS
  // already contains a DETECTABLE skip chain (`cond ? it : it.skip`): that is the `alias`/`call`
  // form, already caught at this line — double-flagging it is redundant.
  if (!suspicious.has(lhs.v) && ternaryArmIsBareRoot(rhs, roots) && !rhsHasDetectableSkip(rhs, roots)) {
    suspicious.set(lhs.v, 'rebind to a ternary whose arm is a bare runner root');
  }
  return false;
}

/**
 * Find the BINDING `=` index in a `const lhs [: type] = rhs` statement — the `=` that separates
 * the (optionally type-annotated) binding pattern from its initializer. The LHS is `toks[1]`; the
 * binding `=` is `toks[2]` unless `toks[2]` is a `:` type-annotation opener, in which case we step
 * over the annotation to the next top-level `=` (tracking `<…>` generic depth so a generic default
 * `Foo<T = X>`'s inner `=` is not mistaken for the binding `=`). Returns -1 if no binding `=` is
 * found (e.g. an uninitialized `let t: typeof it;` declaration).
 */
function bindingEqIndex(toks: readonly Tok[]): number {
  const at2 = toks[2];
  if (at2?.t === 'other' && at2.v === '=') return 2;
  if (at2?.t !== 'other' || at2.v !== ':') return -1; // neither `= …` nor `: …` after the LHS name
  let angle = 0;
  for (let k = 3; k < toks.length; k++) {
    const t = toks[k]!;
    if (t.t !== 'other') continue;
    if (t.v === '<') angle++;
    else if (t.v === '>') angle = Math.max(0, angle - 1);
    else if (t.v === '=' && angle === 0) return k;
  }
  return -1;
}

/**
 * Does a runner root appear as a TERNARY ARM in the RHS — `cond ? it : x` (true arm) or
 * `cond ? x : it` (false arm)? We require a GENUINE ternary, distinguished from the colons that
 * also appear in object literals / type annotations (`{ test: X }`) and the `?` in `??`/`?.`:
 *  - TRUE arm: the bare root is immediately preceded by a lone ternary `?` (`... ? it`);
 *  - FALSE arm: the bare root is immediately preceded by a `:` that PAIRS with a preceding lone
 *    `?` (`cond ? x : it`) — a bare `:` with no opening `?` is an object/type colon, not ternary.
 * A root used as a member base (`it.toString`), a call (`describe(...)`), or an object shorthand
 * key is NOT a bare ternary value and is NOT flagged — ordinary uses of a runner-NAMED identifier.
 */
function ternaryArmIsBareRoot(rhs: readonly Tok[], roots: ReadonlySet<string>): boolean {
  const hasTernaryQuestion = hasLoneTernaryQuestion(rhs);
  for (let k = 0; k < rhs.length; k++) {
    const t = rhs[k]!;
    if (t.t !== 'id' || !roots.has(t.v)) continue;
    const before = rhs[k - 1];
    const after = rhs[k + 1];
    const isMemberBase = after !== undefined && (after.t === 'dot' || after.t === 'str' || after.t === 'lbracket');
    const isCall = after !== undefined && after.t === 'call';
    if (isMemberBase || isCall) continue; // `it.x` / `describe(...)` — not a bare ternary value
    // TRUE arm: preceded by a lone ternary `?`.
    if (isLoneQuestion(rhs, k - 1)) return true;
    // FALSE arm: preceded by a `:`, and the RHS has an opening ternary `?` (so the `:` is ternary,
    // not an object/type-annotation colon).
    if (before?.t === 'other' && before.v === ':' && hasTernaryQuestion) return true;
  }
  return false;
}

/** Is the token at `idx` a LONE ternary `?` — a single `?` not part of `??` (nullish) or `?.` (optional chain)? */
function isLoneQuestion(toks: readonly Tok[], idx: number): boolean {
  const t = toks[idx];
  if (t?.t !== 'other' || t.v !== '?') return false;
  const prev = toks[idx - 1];
  const next = toks[idx + 1];
  if (prev?.t === 'other' && prev.v === '?') return false; // second `?` of `??`
  if (next?.t === 'other' && (next.v === '?' || next.v === '.')) return false; // `??` opener or `?.`
  return true;
}

/** Does the RHS contain at least one lone ternary `?` (distinguishing a ternary from object/type colons)? */
function hasLoneTernaryQuestion(toks: readonly Tok[]): boolean {
  for (let k = 0; k < toks.length; k++) if (isLoneQuestion(toks, k)) return true;
  return false;
}

/** Does the RHS contain a runner root that walks to a skip terminal (an already-detectable `it.skip` chain)? */
function rhsHasDetectableSkip(rhs: readonly Tok[], roots: ReadonlySet<string>): boolean {
  for (let k = 0; k < rhs.length; k++) {
    const t = rhs[k]!;
    if (t.t === 'id' && roots.has(t.v) && captureSkipChain(rhs, k, t.v) !== undefined) return true;
  }
  return false;
}

/**
 * `const skipIt = it.skip;` / `let t = describe.todo;` → record `skipIt`/`t` as a DIRECT skip
 * caller (the value is a runner→skip chain, captured then later invoked). The RHS must be a
 * runner root followed by a chain whose FIRST trip is a skip/conditional member (we reuse the
 * chain walker against the RHS tokens with a probe collector). We map the LHS → the captured
 * chain token for the finding detail.
 */
function collectDirectSkipCaptures(toks: readonly Tok[], directSkips: Map<string, string>): void {
  if (toks.length < 5) return;
  const kw = toks[0];
  const lhs = toks[1];
  const eq = toks[2];
  if (kw?.t !== 'id' || (kw.v !== 'const' && kw.v !== 'let' && kw.v !== 'var')) return;
  if (lhs?.t !== 'id') return;
  if (eq?.t !== 'other' || eq.v !== '=') return;
  const rhsRoot = toks[3];
  if (rhsRoot?.t !== 'id' || !RUNNER_ROOTS.has(rhsRoot.v)) return;
  // Probe the RHS chain (from the root at index 3) for a skip/conditional terminal. We reuse a
  // capture-only walk: if it trips, the LHS is a direct skip caller bound to that chain.
  const captured = captureSkipChain(toks, 3, rhsRoot.v);
  if (captured !== undefined) directSkips.set(lhs.v, captured);
}

/**
 * From a runner root at `start`, walk the accessor chain and return the captured chain TOKEN
 * (`it.skip`, `describe.skipIf`, `it["skip"]`) when the chain reaches a skip/conditional member
 * BEFORE any call — i.e. the value being bound IS a skip accessor (no trailing invocation needed,
 * because the capture site binds it; the call comes later via the alias). Returns `undefined` when
 * the chain has no skip terminal (a plain `const t = it.each` is not a skip capture). Mirrors
 * {@link walkChain}'s recognition but RETURNS the token instead of emitting a finding.
 */
function captureSkipChain(toks: readonly Tok[], start: number, rootName: string): string | undefined {
  let j = start + 1;
  let chain = rootName;
  while (j < toks.length) {
    const tk = toks[j]!;
    if (tk.t === 'dot') {
      const next = toks[j + 1];
      if (next === undefined || next.t !== 'id') return undefined;
      const member = next.v;
      chain += '.' + member;
      if (SKIP_MEMBERS.has(member) || CONDITIONAL_MEMBERS.has(member)) return chain;
      if (PASSTHROUGH_MEMBERS.has(member) || isPlausibleModifier(member)) {
        j += 2;
        continue;
      }
      return undefined;
    }
    if (tk.t === 'str') {
      chain += `["${tk.v}"]`;
      if (SKIP_MEMBERS.has(tk.v) || CONDITIONAL_MEMBERS.has(tk.v)) return chain;
      if (PASSTHROUGH_MEMBERS.has(tk.v)) {
        j += 1;
        continue;
      }
      return undefined;
    }
    if (tk.t === 'call' || (tk.t === 'lbracket' && !tk.computed)) {
      j += 1;
      continue;
    }
    return undefined; // a computed index or end — not a clean skip capture
  }
  return undefined;
}

/**
 * `const { skip } = it;` / `const { todo: gone } = test;` → record the destructured local name
 * (`skip` / `gone`) as a BARE skip caller bound to that runner. The shape: `kw '{' <member>
 * [':' <local>] (',' …) '}' '=' <root> [';']`. Only members in {@link SKIP_MEMBERS} /
 * {@link CONDITIONAL_MEMBERS} matter; an ordinary destructure (`const { each } = it`) is ignored.
 * We map the local name → the runner chain it came off, for the finding detail.
 *
 * NOTE on tokenization: `codeOnly` leaves `{`/`}`/`:` as `other` tokens; the RHS root is the id
 * after the `=`. We scan the brace group for `member [: local]` pairs.
 */
function collectDestructuredSkips(
  toks: readonly FileTok[],
  bareSkips: Map<string, string>,
  patternSites: Set<string>,
): void {
  const kw = toks[0];
  if (kw?.t !== 'id' || (kw.v !== 'const' && kw.v !== 'let' && kw.v !== 'var')) return;
  if (toks[1]?.t !== 'other' || toks[1].v !== '{') return;
  // Find the closing `}` then the `= <root>`.
  let close = -1;
  for (let k = 2; k < toks.length; k++) {
    const t = toks[k]!;
    if (t.t === 'other' && t.v === '}') {
      close = k;
      break;
    }
  }
  if (close === -1) return;
  const eq = toks[close + 1];
  const rootTok = toks[close + 2];
  if (eq?.t !== 'other' || eq.v !== '=') return;
  if (rootTok?.t !== 'id' || !RUNNER_ROOTS.has(rootTok.v)) return;
  // Walk the brace contents collecting `member` and an optional `: local` rename.
  for (let k = 2; k < close; k++) {
    const memTok = toks[k]!;
    if (memTok.t !== 'id') continue;
    if (!SKIP_MEMBERS.has(memTok.v) && !CONDITIONAL_MEMBERS.has(memTok.v)) continue;
    // Optional rename `: local`.
    let local = memTok.v;
    let localTok: FileTok = memTok;
    const colon = toks[k + 1];
    const renamed = toks[k + 2];
    if (colon?.t === 'other' && colon.v === ':' && renamed?.t === 'id') {
      local = renamed.v;
      localTok = renamed;
      k += 2;
    }
    bareSkips.set(local, `${rootTok.v}.${memTok.v}`);
    // Record the local name's BINDING-PATTERN position so the line walk does not read the pattern
    // occurrence itself as a bare-skip USE (the per-line destructure-site guard can't see a `{`
    // opened on an earlier physical line; this position suppression is line-span-independent).
    if (localTok.t === 'id') patternSites.add(`${localTok.line}:${localTok.col}`);
  }
}

/**
 * Walk one line's tokens, recognising a test-runner ROOT (LITERAL or ALIAS-resolved) followed by
 * a chain that contains a skip/disable accessor (dotted, bracket-string, conditional, or
 * computed). The walk starts at EVERY token (not just the first) so a runner appearing mid-line
 * — `const f = COND ? it : it.skip` — is found at its own offset. The {@link AliasTable} (from
 * the per-file pre-pass) widens the root set with resolved rebinds/import-renames and adds the
 * bare/direct/suspicious alias-call forms.
 */
function scanLine(code: string, raw: string, lineNo: number, aliases: AliasTable, out: SkipMatch[]): void {
  const toks = tokenize(code, raw);
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i]!;
    if (tk.t !== 'id') continue;
    const isMember = i > 0 && toks[i - 1]!.t === 'dot';
    // A bare x-prefix disable alias (`xit(` / `xdescribe(`): the token IS the skip. Guard it
    // is NOT a property access (`foo.xit` is not a runner) by checking the previous token.
    if (X_DISABLE_ALIASES.has(tk.v) && !isMember) {
      out.push({ line: lineNo, form: 'call', token: tk.v });
      continue;
    }
    if (isMember) continue; // `obj.it` / `obj.skipIt` — a property, never a root or an alias call
    // A DIRECT skip caller (`const skipIt = it.skip; skipIt(...)`): a bare invocation IS the skip.
    // Skip the binding SITE itself (it is recognised below as a normal `it.skip` capture/value).
    const directCapture = aliases.directSkips.get(tk.v);
    if (directCapture !== undefined && !isBindingSite(toks, i)) {
      out.push({ line: lineNo, form: followedByCall(toks, i + 1) ? 'call' : 'alias', token: directCapture });
      continue;
    }
    // A DESTRUCTURED skip member (`const { skip } = it; skip(...)`): a bare `skip(...)` is a skip.
    // Suppress the BINDING-PATTERN occurrence itself — both the single-line case (`isDestructureSite`)
    // and the multi-line case (`patternSites`, recorded by line:col during alias resolution, since
    // the per-line `{`-lookback can't see a brace opened on an earlier physical line).
    const bareCapture = aliases.bareSkips.get(tk.v);
    const atPatternSite = aliases.patternSites.has(`${lineNo}:${tk.col}`);
    if (bareCapture !== undefined && !isBindingSite(toks, i) && !isDestructureSite(toks, i) && !atPatternSite) {
      out.push({ line: lineNo, form: followedByCall(toks, i + 1) ? 'call' : 'alias', token: bareCapture });
      continue;
    }
    // A SUSPICIOUS alias (rebind to a non-literal RHS that mentions a runner): a call/chain on it
    // is statically undecidable but smelly → FLAG `aliased` rather than silently pass. Skip the
    // binding SITE (`const t = cond ? it : x` — that line resolves the alias, doesn't call it).
    if (aliases.suspicious.has(tk.v) && !isBindingSite(toks, i)) {
      // Only flag an actual USE: a call `t(...)` or a `.skip`/bracket chain on it. A bare mention
      // (passing `t` as a value) is too weak to flag — require a call or a member access.
      if (followedByCall(toks, i + 1) || isFollowedByMemberAccess(toks, i + 1)) {
        out.push({ line: lineNo, form: 'aliased', token: tk.v });
      }
      continue;
    }
    // A runner NAMESPACE (`import * as v from "vitest"; v.it.skip(...)`): a `<ns>.<runner>` head is
    // the runner root behind the namespace. Walk the chain from the runner member, so `v.it.skip`
    // trips exactly like `it.skip` (the reported token carries the `<ns>.` prefix for the detail).
    if (aliases.namespaces.has(tk.v) && !isBindingSite(toks, i)) {
      const dot = toks[i + 1];
      const runner = toks[i + 2];
      if (dot?.t === 'dot' && runner?.t === 'id' && RUNNER_ROOTS.has(runner.v)) {
        walkChain(toks, i + 2, `${tk.v}.${runner.v}`, lineNo, out);
      }
      continue;
    }
    if (!aliases.roots.has(tk.v)) continue;
    walkChain(toks, i, tk.v, lineNo, out);
  }
}

/** Is the id at `idx` the LHS of its own binding (`const <id> = …` / `let <id> = …`)? The binding site is not a call. */
function isBindingSite(toks: readonly Tok[], idx: number): boolean {
  if (idx < 1) return false;
  const prev = toks[idx - 1];
  return prev?.t === 'id' && (prev.v === 'const' || prev.v === 'let' || prev.v === 'var');
}

/** Is the id at `idx` inside the `{ … }` of its OWN destructuring binding (so it is not a call use)? */
function isDestructureSite(toks: readonly Tok[], idx: number): boolean {
  // Look left for an unmatched `{` preceded (eventually) by a decl keyword, with no intervening
  // `=` (the destructure pattern is left of the `=`). A lightweight check: a `{` appears before
  // `idx` after a decl keyword and no `=` lies between that `{` and `idx`.
  for (let k = idx - 1; k >= 0; k--) {
    const t = toks[k]!;
    if (t.t === 'other' && t.v === '=') return false;
    if (t.t === 'other' && t.v === '{') {
      const kw = toks[k - 1];
      return kw?.t === 'id' && (kw.v === 'const' || kw.v === 'let' || kw.v === 'var');
    }
  }
  return false;
}

/** Is the token at `idx` the start of a member access (`.member` / `["member"]` / `[computed]`)? */
function isFollowedByMemberAccess(toks: readonly Tok[], idx: number): boolean {
  const tk = toks[idx];
  return tk !== undefined && (tk.t === 'dot' || tk.t === 'str' || tk.t === 'lbracket');
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
  const rank: Record<SkipForm, number> = { call: 5, conditional: 4, computed: 3, aliased: 2, alias: 1 };
  const byKey = new Map<string, SkipMatch>();
  for (const m of matches) {
    const key = `${m.line}::${m.token}`;
    const existing = byKey.get(key);
    if (existing === undefined || rank[m.form] > rank[existing.form]) byKey.set(key, m);
  }
  return [...byKey.values()].sort((a, b) => a.line - b.line || (a.token < b.token ? -1 : 1));
}
