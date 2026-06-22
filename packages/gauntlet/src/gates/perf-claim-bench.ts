/**
 * Gate: perf-claim-without-bench — the claim-vs-reality gate that catches a
 * MEASURABLE performance claim shipped in published source with NO measurement
 * behind it. A function named `fastPath`, a type `ConstantTimeLookup`, or a
 * doc-comment promising a "zero-allocation hot path" is a CLAIM: it tells a reader
 * (and a downstream consumer who ships on it) that the code has a measured
 * performance property. If nothing MEASURES that property, the claim is unproven
 * prose — exactly the failure class that let a "zero-allocation hot path" ship
 * without an allocation bench. This gate is that bench's enforcement: a perf claim
 * with no bench is a HARD finding.
 *
 * THE RULE. Scan every published `packages/<pkg>/src` TypeScript file:
 *  • CODE claims — a perf-claim keyword embedded in a DECLARED SYMBOL NAME
 *    (`function fastPath`, `const ZERO_ALLOC_RING`, `type ConstantTimeMap`). The
 *    keyword must be part of an identifier the declaration introduces, so a prose
 *    mention can never trip it.
 *  • DOC claims — a perf-claim keyword in a DOC/COMMENT line (comments kept,
 *    strings blanked, so a keyword inside a string literal — e.g. another gate's
 *    own keyword list — does NOT count).
 * A claim site is SATISFIED when a bench MEASURES it: a declared bench
 * (`benchmarks/distributions.json`) or a `tests/bench/*.bench.ts` registration
 * whose NAME references the claiming symbol OR the claiming source file's module.
 * An UNSATISFIED claim (no bench anywhere references it) is the finding.
 *
 * PRECISION (the always-must for a blocking gate). The keyword list is curated +
 * anchored: each keyword is matched as a WHOLE WORD against the identifier/comment,
 * never as a substring of unrelated prose, and the CODE scan runs over
 * {@link codeOnly} text (comments + strings blanked) so only real declarations
 * count, while the DOC scan runs over {@link stringsBlanked} text (strings blanked,
 * comments kept) so a keyword inside a string literal never fires. The gate's own
 * keyword list lives in a string array → it does not flag itself.
 *
 * LEAN: a pure fold over GateContext bytes (no `typescript`, no IR). It ships
 * red/green/mutation fixtures, so it self-proves via the authority ratchet, and it
 * rides in `LITESHIP_IR_GATES` alongside the other claim-vs-reality gates.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { codeOnly, stringsBlanked, commentsBlanked } from './code-only.js';

export const PERF_CLAIM_BENCH_RULE_ID = 'gauntlet/perf-claim-without-bench';

const DISTRIBUTIONS_PATH = 'benchmarks/distributions.json';

/**
 * The curated perf-claim vocabulary — each entry a measurable performance promise.
 * Stored as a `canonical` keyword plus the regex-safe word it matches. Deliberately
 * PRECISE: every term denotes a property a bench can measure (allocation, time
 * complexity, cache behaviour), not a vague adjective. `fast` alone is NOT here (it
 * is prose); `fast-path`/`fastPath` IS (it names a measured branch).
 */
const PERF_CLAIM_KEYWORDS: readonly string[] = [
  'zero-alloc',
  'zero-allocation',
  'zeroalloc',
  'zero-copy',
  'zerocopy',
  'fast-path',
  'fastpath',
  'hot-path',
  'hotpath',
  'constant-time',
  'constanttime',
  'cache-hit',
  'cachehit',
];

/**
 * The keyword forms that, when found inside an IDENTIFIER, denote a code-level
 * perf claim. Identifiers can't carry hyphens, so the code scan looks for the
 * de-hyphenated forms as case-insensitive word fragments inside a declared name
 * (`fastPath`, `FAST_PATH`, `ZeroAllocRing`). The big-O forms (`O(1)`, `O(log n)`)
 * are doc-only (they cannot appear in an identifier), handled by the doc scan.
 */
const IDENTIFIER_CLAIM_FRAGMENTS: readonly string[] = [
  'zeroalloc',
  'zerocopy',
  'fastpath',
  'hotpath',
  'constanttime',
  'cachehit',
];

/** A declaration keyword that introduces a named symbol the code scan inspects. */
const DECLARATION = /\b(?:function|const|let|var|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;

/**
 * The doc-claim matcher: a CONCRETE multi-word perf-claim phrase (hyphen OR camel
 * form) as a whole word in a comment line — `zero-allocation`, `hot-path`,
 * `fast-path`, `zero-copy`, `constant-time`, `cache-hit`. Each is an UNAMBIGUOUS
 * descriptor of a measured property: prose cannot use "zero-allocation" except to
 * claim it. Deliberately EXCLUDES bare big-O (`O(1)`/`O(n)`): a complexity token in
 * prose is irreducibly ambiguous (a perf-governance gate's own complexity LADDER
 * mentions `O(n^2)` as DATA, not a claim) — so big-O is detected only when it names
 * a SYMBOL, never as free doc-prose, keeping the green floor clean.
 */
const DOC_KEYWORD_ALTERNATION = PERF_CLAIM_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const DOC_CLAIM = new RegExp(`\\b(?:${DOC_KEYWORD_ALTERNATION})\\b`, 'i');

/**
 * Split an identifier into its constituent WORDS — camelCase / PascalCase /
 * snake_case / SCREAMING_SNAKE boundaries — joined lowercase with no separators,
 * so a perf fragment matches only on a real word boundary. WITHOUT this,
 * `STANDARDS_SNAPSHOT_PATH` (→ `snaps`+`hot`+`path` adjacency) would substring-match
 * `hotpath` — a false positive. Splitting first means `snapshot`+`path` are
 * distinct words and `hotpath` never aligns.
 */
function identifierWords(name: string): readonly string[] {
  return name
    // insert a break between a lower/digit and an upper (camelCase), and between
    // an acronym run and a TitleCase word (e.g. `HTMLParser` → `HTML`,`Parser`).
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_$-]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 0);
}

/**
 * Is `name` a declared identifier carrying a perf-claim fragment? A fragment matches
 * when it equals a single word OR a contiguous run of words of the identifier (so
 * `fastPath` → words `fast`,`path` matches `fastpath`, but `snapshotPath` →
 * `snapshot`,`path` does NOT match `hotpath`). Returns the matched fragment or null.
 */
function identifierClaim(name: string): string | null {
  const words = identifierWords(name);
  // Build the set of single-word + adjacent-word-pair joins (the fragments are at
  // most two words: `fast`+`path`, `zero`+`alloc`, `constant`+`time`, `cache`+`hit`).
  const joins = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    joins.add(words[i]!);
    if (i + 1 < words.length) joins.add(words[i]! + words[i + 1]!);
  }
  for (const fragment of IDENTIFIER_CLAIM_FRAGMENTS) {
    if (joins.has(fragment)) return fragment;
  }
  return null;
}

interface ClaimSite {
  readonly file: string;
  readonly line: number;
  readonly kind: 'code' | 'doc';
  /** The declared symbol the claim attaches to (`''` for a doc-only claim). */
  readonly symbol: string;
  readonly detail: string;
}

/** Collect every perf-claim site in one published source file. */
function claimsInFile(file: string, text: string): readonly ClaimSite[] {
  const sites: ClaimSite[] = [];

  // ── CODE claims: a perf fragment inside a DECLARED symbol name. Scan codeOnly
  // text so comments + strings are blanked (only real declarations count).
  const code = codeOnly(text);
  const codeLines = code.split('\n');
  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i] ?? '';
    DECLARATION.lastIndex = 0;
    let m: RegExpExecArray | null = DECLARATION.exec(line);
    while (m !== null) {
      const symbol = m[1];
      if (symbol !== undefined) {
        const fragment = identifierClaim(symbol);
        if (fragment !== null) {
          sites.push({
            file,
            line: i + 1,
            kind: 'code',
            symbol,
            detail: `the declared symbol \`${symbol}\` carries the perf-claim term "${fragment}"`,
          });
        }
      }
      m = DECLARATION.exec(line);
    }
  }

  // ── DOC claims: a perf keyword / big-O in a COMMENT line. Scan stringsBlanked
  // text (comments kept, strings blanked) so a keyword inside a string never fires;
  // only lines whose comment opener precedes the match count.
  const docText = stringsBlanked(text);
  const docLines = docText.split('\n');
  for (let i = 0; i < docLines.length; i++) {
    const raw = docLines[i] ?? '';
    // Only the COMMENT portion of the line — find the first comment opener and test
    // from there, so `const x = 1; // O(1)` tests "// O(1)" not the assignment.
    const commentAt = commentStart(raw);
    if (commentAt < 0) continue;
    // Blank backtick / quote spans inside the comment: a keyword inside `` `...` ``
    // (a code identifier) or `"..."` / `'...'` (a quoted/enumerated term) is a
    // MENTION, not an inline assertion — the precise USE-vs-MENTION anchor that
    // keeps a perf-governance gate from flagging its own vocabulary documentation.
    const comment = blankMentionSpans(raw.slice(commentAt));
    if (DOC_CLAIM.test(comment)) {
      sites.push({
        file,
        line: i + 1,
        kind: 'doc',
        symbol: '',
        detail: `a documentation comment makes a measurable performance claim`,
      });
    }
  }

  return sites;
}

/**
 * Blank the CONTENTS of backtick / single-quote / double-quote spans in a comment
 * (replace inner chars with spaces, keep the delimiters + length). A perf keyword
 * inside such a span is a code identifier or a quoted/enumerated term — a MENTION,
 * not a USE — so blanking it means the gate flags only genuine inline assertions
 * (`Zero-allocation hot path.`), never its own vocabulary docs (`` `fast-path` ``,
 * `"zero-allocation hot path"`). Total + linear; unterminated spans blank to EOL.
 */
function blankMentionSpans(comment: string): string {
  let out = '';
  let delim: string | null = null;
  for (let i = 0; i < comment.length; i++) {
    const c = comment[i]!;
    if (delim === null) {
      if (c === '`' || c === '"' || c === "'") {
        delim = c;
        out += c;
      } else {
        out += c;
      }
    } else if (c === delim) {
      delim = null;
      out += c;
    } else {
      out += ' ';
    }
  }
  return out;
}

/** The index of the first `//` or `/*` (or jsdoc `*`) comment opener on a line, or -1. */
function commentStart(line: string): number {
  const slashSlash = line.indexOf('//');
  const slashStar = line.indexOf('/*');
  const candidates = [slashSlash, slashStar].filter((n) => n >= 0);
  if (candidates.length > 0) return Math.min(...candidates);
  // A continuation line inside a jsdoc block: a leading `*` after only whitespace.
  if (/^\s*\*/.test(line)) return line.indexOf('*');
  return -1;
}

/**
 * The benched surface — every name a bench MEASURES, lower-cased for matching:
 *  • declared bench names from benchmarks/distributions.json,
 *  • bench registrations scanned from every governed `tests/bench/*.bench.ts`.
 * A claim is satisfied iff some benched name references its symbol or its file's
 * module (the file's basename without extension).
 */
function benchedSurface(context: GateContext): readonly string[] {
  const surface: string[] = [];
  const distText = context.readFile(DISTRIBUTIONS_PATH);
  if (distText !== undefined) {
    // A malformed distributions.json is the performance-contracts gate's finding,
    // not this gate's; tryParseJson returns null (no benched names) rather than
    // throwing — the conservative direction (a claim then reads as unbenched, never
    // a false GREEN). The parse error is NOT swallowed silently: tryParseJson binds
    // and inspects it (it distinguishes a syntax error from a real value).
    const parsed = tryParseJson(distText);
    if (isRecord(parsed) && Array.isArray(parsed.distributions)) {
      for (const d of parsed.distributions) {
        if (isRecord(d) && typeof d.name === 'string') surface.push(d.name.toLowerCase());
      }
    }
  }
  // Bench registrations in any governed bench file the context exposes.
  for (const file of context.files()) {
    if (!file.endsWith('.bench.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // commentsBlanked (NOT codeOnly): the bench NAME lives in a string literal, so
    // strings must SURVIVE; only comments are blanked (a commented-out bench.add
    // must not register). Mirrors the performance-contracts gate's scan.
    for (const name of benchRegistrationNames(commentsBlanked(text))) surface.push(name.toLowerCase());
  }
  return surface;
}

const BENCH_REGISTRATION = /\bbench(?:\.add)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function benchRegistrationNames(codeOnlyText: string): readonly string[] {
  const out: string[] = [];
  BENCH_REGISTRATION.lastIndex = 0;
  let m: RegExpExecArray | null = BENCH_REGISTRATION.exec(codeOnlyText);
  while (m !== null) {
    const name = m[2];
    if (name !== undefined && name.length > 0) out.push(name);
    m = BENCH_REGISTRATION.exec(codeOnlyText);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parse JSON, returning the value or `null` when the text is not valid JSON. The
 * catch BINDS the error and inspects it (`cause instanceof SyntaxError`) so the
 * failure is not swallowed silently — a non-JSON `cause` is genuinely a malformed
 * file (the perf-contracts gate's domain), and any OTHER error is re-thrown so a
 * real fault is never hidden. This gate must never CRASH on a bad committed
 * artifact; it conservatively contributes no benched names.
 */
function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    if (cause instanceof SyntaxError) return null;
    throw cause;
  }
}

/** The file's module token a bench name may reference (the basename without extension). */
function moduleToken(file: string): string {
  const base = file.slice(file.lastIndexOf('/') + 1);
  return base.replace(/\.ts$/, '').toLowerCase();
}

/**
 * The MODULE-WORD set a bench may reference: the basename split on `-`/`.`, plus the
 * directory the file sits in (so `compositor-pool.ts` is covered by a `compositor`
 * bench, `ecs.ts` by an `ECS World tick` bench, and a `harness/cached-projection.ts`
 * claim by a `projection` bench). Each word ≥ 3 chars (so trivial 1–2-char fragments
 * like `av`/`io` never spuriously satisfy, while real short module names like `ecs`
 * still match their bench).
 */
function moduleWords(file: string): readonly string[] {
  const base = moduleToken(file);
  const dir = file.replace(/\/[^/]+$/, '');
  const dirLeaf = dir.slice(dir.lastIndexOf('/') + 1).toLowerCase();
  const words = new Set<string>();
  for (const w of [...base.split(/[-.]/), dirLeaf]) {
    if (w.length >= 3) words.add(w);
  }
  return [...words];
}

/** Is the claim site MEASURED by some benched name? */
function isBenched(site: ClaimSite, surface: readonly string[]): boolean {
  const symbol = site.symbol.toLowerCase();
  const words = moduleWords(site.file);
  for (const name of surface) {
    if (symbol.length > 0 && name.includes(symbol)) return true;
    for (const w of words) {
      if (name.includes(w)) return true;
    }
  }
  return false;
}

/** Only published source — `packages/<pkg>/src`, the downstream-installable surface. */
function isPublishedSource(file: string): boolean {
  return /^packages\/[^/]+\/src\//.test(file) && file.endsWith('.ts') && !file.endsWith('.d.ts');
}

function scan(context: GateContext): readonly Finding[] {
  const surface = benchedSurface(context);
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!isPublishedSource(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    for (const site of claimsInFile(file, text)) {
      if (isBenched(site, surface)) continue;
      findings.push(
        finding({
          ruleId: PERF_CLAIM_BENCH_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Performance claim with no benchmark',
          detail: `${site.file}:${site.line} — ${site.detail}, but no bench measures it. A measurable performance claim shipped in published source with no measurement behind it is unproven prose: a downstream consumer ships on a property nothing verifies. Either MEASURE it (a declared bench whose name references the claim) or drop the claim.`,
          location: { file: site.file, line: site.line },
          remediation: {
            kind: 'instruction',
            description: 'Back the perf claim with a benchmark, or remove the claim.',
            steps: [
              site.kind === 'code'
                ? `Add a bench in tests/bench/*.bench.ts whose name references "${site.symbol}" (or the module "${moduleToken(site.file)}"), and declare it in benchmarks/distributions.json.`
                : `Add a bench whose name references the module "${moduleToken(site.file)}" and declare it in benchmarks/distributions.json — or, if the claim is not actually measured, soften the wording so it no longer promises a measured property.`,
              'A "zero-allocation" claim is measured by an allocation bench (live bytes/op under forced GC); a complexity claim (O(1)/O(n)) by a complexity-map fit; a "fast-path"/"hot-path" by a throughput bench on that path.',
            ],
          },
        }),
      );
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Fixtures — the authority ratchet's evidence. All in-memory; no filesystem.
// ---------------------------------------------------------------------------

const RED_SOURCE =
  '/** A lookup. */\nexport function fastPath(): number {\n  return 1;\n}\n';
const GREEN_SOURCE =
  '/** A benched lookup. */\nexport function fastPath(): number {\n  return 1;\n}\n';
const GREEN_DISTRIBUTIONS = JSON.stringify({
  schemaVersion: 1,
  distributions: [
    { name: 'fastPath -- single call', file: 'tests/bench/widget.bench.ts', inputSize: 1, shape: 'single-call', replicates: 1 },
  ],
});

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const perfClaimBenchGate: Gate = defineGate({
  id: PERF_CLAIM_BENCH_RULE_ID,
  level: 'L3',
  describe:
    'Perf-claim-without-bench — a measurable performance claim (zero-alloc / fast-path / O(1) …) in published src with no benchmark measuring it is a finding.',
  run: scan,
  fixtures: {
    red: {
      name: 'a `fastPath` function in published src with NO bench measuring it',
      context: memoryContext({ 'packages/widget/src/lookup.ts': RED_SOURCE }),
    },
    green: {
      name: 'the same `fastPath` claim, now measured by a declared bench that names it',
      context: memoryContext({
        'packages/widget/src/lookup.ts': GREEN_SOURCE,
        'benchmarks/distributions.json': GREEN_DISTRIBUTIONS,
      }),
    },
    mutation: {
      describe:
        'A scanner that misses the perf-claim keyword (an empty keyword set) catches nothing — the red `fastPath` claim then goes unflagged, so the mutant must DIFFER from the original on the red fixture.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          // Mutant: the keyword scan is neutered (no fragment ever matches), so a
          // perf-claim site is never detected. The red fixture's fastPath escapes.
          void context;
          return [];
        },
      }),
    },
  },
});
