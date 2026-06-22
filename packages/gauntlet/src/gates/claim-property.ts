/**
 * Gate: claim-property — the claim-vs-reality family beyond perf. A DECLARED NAME
 * or a DOC-COMMENT that promises a SEMANTIC property a reader (and a downstream
 * consumer who ships on it) takes as guaranteed — `deterministic`, `pure`,
 * `content-addressed`, `canonical`, `reproducible` — is a CLAIM. If nothing
 * CONFIRMS that property, the claim is unproven prose. This gate is the
 * enforcement: a claim with no confirmer is a HARD finding.
 *
 * THE RICE BOUNDARY (the honest hard-vs-advisory cut). A detector earns HARD
 * (blocking) authority ONLY where the confirmer is MEASURABLE / decidable. Each
 * claim kind here has exactly such a confirmer:
 *
 *  • DETERMINISTIC / REPRODUCIBLE — confirmer: a determinism / DST / property test
 *    exists for the claiming symbol or its module. The test corpus is committed
 *    bytes; "a test whose name (or `// PROVES:` header) references this symbol or
 *    module" is decidable. Absent → finding.
 *  • PURE — confirmer: the claiming symbol's OWN DECLARATION reads NO ambient entropy
 *    (`Date.now(` / `performance.now(` / `Math.random(` / argless `new Date()` —
 *    the exact {@link no-nondeterminism} oracle). A "pure" claim whose documented
 *    declaration contains an ambient read is a CONTRADICTION — the strongest hard case,
 *    decided in-file with no external evidence. SCOPED to the declaration, not the file:
 *    a `pure` doc above one symbol is NOT contradicted by an ambient read in a SIBLING
 *    declaration (e.g. the sanctioned, no-nondeterminism-WAIVED entropy boundary), so the
 *    blocking gate never reds a correct waived boundary. In-span ambient read → finding.
 *  • CONTENT-ADDRESSED / CANONICAL — confirmer: a round-trip / identity test through
 *    the content-address kernel (`addressedDigestOf` / `contentAddress` /
 *    `ContentAddress` / `CanonicalCbor`) references the claiming symbol or module.
 *    Absent → finding.
 *
 * Anything SEMANTIC and undecidable (does this fn ACTUALLY compute a canonical
 * form? is it TRULY deterministic under all faults?) is NOT a hard gate here — that
 * is the ambition÷proof HEATMAP's advisory triage (`ambition-proof.ts`), never a
 * blocking verdict. Selling an advisory as proof is the fairy dust this family
 * hunts; this gate refuses to commit it.
 *
 * PRECISION (the always-must for a blocking gate). Mirrors {@link perf-claim-bench}:
 *  • CODE claims — a claim keyword as a WHOLE WORD inside a DECLARED symbol name,
 *    scanned over {@link codeOnly} text (comments + strings blanked), so a prose
 *    mention never trips it and the keyword list (a string array) can't flag itself.
 *  • DOC claims — a claim keyword in a COMMENT line, scanned over
 *    {@link stringsBlanked} text with backtick/quote spans blanked, so a keyword
 *    inside `` `deterministic` `` (a mention) or a quoted vocabulary term never fires.
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
import { codeOnly, stringsBlanked } from './code-only.js';

export const CLAIM_PROPERTY_RULE_ID = 'gauntlet/claim-without-confirmer';

/** The closed set of semantic-property claim kinds this gate confirms. */
type ClaimKind = 'deterministic' | 'pure' | 'content-addressed';

/**
 * One claim-vocabulary entry — a `_tag`-style record (composition over inheritance:
 * the three kinds differ by DATA + a per-kind confirmer, assembled by the union, not
 * by a class hierarchy). `identifierFragments` are the de-hyphenated forms an
 * IDENTIFIER can carry (identifiers cannot hold hyphens); `docWords` are the
 * whole-word forms a DOC-COMMENT can carry (hyphen OR camel form).
 */
interface ClaimVocab {
  readonly kind: ClaimKind;
  /** Lower-cased fragments matched against an identifier's WORD-joins. */
  readonly identifierFragments: readonly string[];
  /** Whole-word doc forms (regex-escaped + alternated for the doc matcher). */
  readonly docWords: readonly string[];
  /** Human label woven into the claim-site detail. */
  readonly label: string;
}

/**
 * The curated semantic-claim vocabulary. Deliberately PRECISE — every term denotes a
 * property with a MEASURABLE confirmer (Rice): `deterministic`/`reproducible` (a
 * determinism test), `pure` (an in-file ambient-entropy check), `content-addressed`/
 * `canonical` (a round-trip identity test). Vague adjectives (`fast`, `robust`,
 * `safe`) are NOT here — they have no decidable confirmer, so a hard gate on them
 * would be fairy dust. `canonical` maps to the content-address confirmer because the
 * LiteShip `canonical` package IS the content-address kernel (`CanonicalCbor` →
 * `addressedDigestOf`), so a "canonical" claim is confirmed by a round-trip identity
 * test exactly as a "content-addressed" one is.
 */
const CLAIM_VOCAB: readonly ClaimVocab[] = [
  {
    kind: 'deterministic',
    identifierFragments: ['deterministic', 'reproducible'],
    docWords: ['deterministic', 'reproducible', 'reproducibility', 'determinism'],
    label: 'determinism',
  },
  {
    kind: 'pure',
    // `pure` alone is the identifier form (`purelyDeterministic` is covered by the
    // determinism kind; `pureFold` / `PureProjection` name the purity claim).
    identifierFragments: ['pure'],
    docWords: ['pure', 'side-effect-free', 'sideeffectfree', 'referentially-transparent'],
    label: 'purity',
  },
  {
    kind: 'content-addressed',
    identifierFragments: ['contentaddressed', 'contentaddress', 'canonical', 'canonicalize'],
    docWords: ['content-addressed', 'content-address', 'canonical', 'canonicalize', 'canonicalized'],
    label: 'content-addressing',
  },
];

/** A declaration keyword that introduces a named symbol the code scan inspects. */
const DECLARATION = /\b(?:function|const|let|var|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;

/** The ambient-entropy oracle — IDENTICAL to the no-nondeterminism gate's pattern. */
const AMBIENT_ENTROPY = /\bDate\.now\(|\bperformance\.now\(|\bMath\.random\(|\bnew Date\(\s*\)/;

/** The doc-claim matcher for one vocab entry — its whole-word forms, alternated. */
function docMatcher(vocab: ClaimVocab): RegExp {
  const alternation = vocab.docWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`\\b(?:${alternation})\\b`, 'i');
}

const DOC_MATCHERS: ReadonlyMap<ClaimKind, RegExp> = new Map(CLAIM_VOCAB.map((v) => [v.kind, docMatcher(v)]));

/**
 * Split an identifier into its constituent lower-cased WORDS — camelCase /
 * PascalCase / snake_case / SCREAMING_SNAKE boundaries — so a claim fragment matches
 * only on a real word boundary (the same anchoring {@link perf-claim-bench} uses to
 * keep `STANDARDS_SNAPSHOT_PATH` from substring-matching `hotpath`).
 */
function identifierWords(name: string): readonly string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_$-]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 0);
}

/**
 * Does `name` carry the claim fragment of `vocab`? A fragment matches a single word
 * OR a contiguous run of up to two adjacent words (so `contentAddressed` → words
 * `content`,`addressed` joins `contentaddressed`, but `purgePathPure` keeps `pure`
 * as its own word). Returns the matched fragment or `null`.
 */
function identifierClaim(name: string, vocab: ClaimVocab): string | null {
  const words = identifierWords(name);
  const joins = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    joins.add(words[i]!);
    if (i + 1 < words.length) joins.add(words[i]! + words[i + 1]!);
  }
  for (const fragment of vocab.identifierFragments) {
    if (joins.has(fragment)) return fragment;
  }
  return null;
}

interface ClaimSite {
  readonly file: string;
  readonly line: number;
  readonly kind: 'code' | 'doc';
  readonly claimKind: ClaimKind;
  /** The declared symbol the claim attaches to (`''` for a doc-only claim). */
  readonly symbol: string;
  readonly detail: string;
}

/** The index of the first `//` or `/*` (or jsdoc `*`) comment opener on a line, or -1. */
function commentStart(line: string): number {
  const slashSlash = line.indexOf('//');
  const slashStar = line.indexOf('/*');
  const candidates = [slashSlash, slashStar].filter((n) => n >= 0);
  if (candidates.length > 0) return Math.min(...candidates);
  if (/^\s*\*/.test(line)) return line.indexOf('*');
  return -1;
}

/**
 * Blank the CONTENTS of backtick / single-quote / double-quote spans in a comment
 * (the precise USE-vs-MENTION anchor: a claim keyword inside `` `pure` `` or a quoted
 * vocabulary term is a MENTION, not an inline assertion). Linear; an unterminated
 * span blanks to EOL. IDENTICAL semantics to the perf-claim gate's anchor.
 */
function blankMentionSpans(comment: string): string {
  let out = '';
  let delim: string | null = null;
  for (let i = 0; i < comment.length; i++) {
    const c = comment[i]!;
    if (delim === null) {
      if (c === '`' || c === '"' || c === "'") delim = c;
      out += c;
    } else if (c === delim) {
      delim = null;
      out += c;
    } else {
      out += ' ';
    }
  }
  return out;
}

/** Collect every semantic-claim site in one published source file. */
function claimsInFile(file: string, text: string): readonly ClaimSite[] {
  const sites: ClaimSite[] = [];

  // ── CODE claims: a claim fragment inside a DECLARED symbol name. Scan codeOnly
  // text (comments + strings blanked) so only real declarations count.
  const codeLines = codeOnly(text).split('\n');
  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i] ?? '';
    DECLARATION.lastIndex = 0;
    let m: RegExpExecArray | null = DECLARATION.exec(line);
    while (m !== null) {
      const symbol = m[1];
      if (symbol !== undefined) {
        for (const vocab of CLAIM_VOCAB) {
          const fragment = identifierClaim(symbol, vocab);
          if (fragment !== null) {
            sites.push({
              file,
              line: i + 1,
              kind: 'code',
              claimKind: vocab.kind,
              symbol,
              detail: `the declared symbol \`${symbol}\` claims ${vocab.label} (the term "${fragment}")`,
            });
          }
        }
      }
      m = DECLARATION.exec(line);
    }
  }

  // ── DOC claims: a claim keyword in a COMMENT line. Scan stringsBlanked text
  // (comments kept, strings blanked); blank backtick/quote spans so a mention never
  // fires; only the comment portion of the line is tested.
  const docLines = stringsBlanked(text).split('\n');
  for (let i = 0; i < docLines.length; i++) {
    const raw = docLines[i] ?? '';
    const commentAt = commentStart(raw);
    if (commentAt < 0) continue;
    const comment = blankMentionSpans(raw.slice(commentAt));
    for (const vocab of CLAIM_VOCAB) {
      const matcher = DOC_MATCHERS.get(vocab.kind);
      if (matcher !== undefined && matcher.test(comment)) {
        sites.push({
          file,
          line: i + 1,
          kind: 'doc',
          claimKind: vocab.kind,
          symbol: '',
          detail: `a documentation comment claims ${vocab.label}`,
        });
      }
    }
  }

  return sites;
}

/** Only published source — `packages/<pkg>/src`, the downstream-installable surface. */
function isPublishedSource(file: string): boolean {
  return /^packages\/[^/]+\/src\//.test(file) && file.endsWith('.ts') && !file.endsWith('.d.ts');
}

/** A governed TEST file — the corpus the determinism / content-address confirmers scan. */
function isTestFile(file: string): boolean {
  return /(?:^|\/)tests\//.test(file) && file.endsWith('.ts');
}

/** The file's module token a confirmer may reference (basename without extension). */
function moduleToken(file: string): string {
  const base = file.slice(file.lastIndexOf('/') + 1);
  return base.replace(/\.ts$/, '').toLowerCase();
}

/**
 * The MODULE-WORD set a confirmer may reference: the basename split on `-`/`.`, plus
 * the directory leaf the file sits in. Each word ≥ 3 chars (so trivial 1–2-char
 * fragments never spuriously satisfy, while a real short module name like `fnv`
 * still matches). Same shape as the perf-claim gate's `moduleWords`.
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

/**
 * Does a confirmer body (a test file's code + comments) REFERENCE this claim site —
 * by the claiming symbol name, or by one of the claim file's module words? Used by
 * the determinism + content-address confirmers (purity needs no corpus reference).
 */
function referencesSite(site: ClaimSite, confirmerText: string): boolean {
  const lower = confirmerText.toLowerCase();
  const symbol = site.symbol.toLowerCase();
  if (symbol.length > 0 && lower.includes(symbol)) return true;
  for (const w of moduleWords(site.file)) {
    if (lower.includes(w)) return true;
  }
  return false;
}

/**
 * The DETERMINISM confirmer corpus — the lower-cased text of every governed test
 * file that is itself a determinism / DST / property test (its path or its body
 * names `determinism`/`deterministic`/`replay`/`dst`/`prop`/`PROVES: INV-*` so a
 * generic unit test that merely mentions the module does not count as the
 * determinism confirmer). A claim is confirmed iff some such corpus entry references
 * the site. Comments are KEPT (a `// PROVES: INV-…-DETERMINISTIC` header is real
 * evidence); strings are kept too (a `describe('… deterministic …')` title is the
 * registration). Heavy stripping is unnecessary — we only ask "is this a determinism
 * test, and does it name the claim?".
 */
function determinismConfirmers(context: GateContext): readonly string[] {
  const corpus: string[] = [];
  for (const file of context.files()) {
    if (!isTestFile(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    const lowerPath = file.toLowerCase();
    const lowerBody = text.toLowerCase();
    const isDeterminismTest =
      /determinism|deterministic|reproducib|replay|\.dst\.|\bdst\b|\.prop\.|assertreplaydeterministic/.test(
        lowerPath + '\n' + lowerBody,
      );
    if (isDeterminismTest) corpus.push(lowerBody);
  }
  return corpus;
}

/**
 * The CONTENT-ADDRESS confirmer corpus — the lower-cased text of every governed test
 * file that exercises the content-address kernel (it names `addresseddigestof` /
 * `contentaddress` / `canonicalcbor` / a round-trip/identity assertion through the
 * `canonical` package). A "content-addressed"/"canonical" claim is confirmed iff
 * some such test references the site.
 */
function contentAddressConfirmers(context: GateContext): readonly string[] {
  const corpus: string[] = [];
  for (const file of context.files()) {
    if (!isTestFile(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    const lowerBody = text.toLowerCase();
    const exercisesKernel = /addresseddigestof|contentaddress|canonicalcbor|content-address|round-trip|roundtrip/.test(
      lowerBody,
    );
    if (exercisesKernel) corpus.push(lowerBody);
  }
  return corpus;
}

/**
 * Is a PURITY claim CONTRADICTED — does the DECLARATION the claim documents read
 * ambient entropy? The confirmer is in-file + decidable: a `pure` symbol/doc whose
 * own declaration body calls `Date.now()` / `performance.now()` / `Math.random()` /
 * argless `new Date()` (the {@link no-nondeterminism} oracle) is a self-contradiction.
 *
 * SCOPED TO THE CLAIM'S DECLARATION, not the whole file — the precise use-vs-mention
 * the hard cut demands. A `pure` doc above `fixedClock` must NOT be contradicted by a
 * `Date.now()` in a SIBLING `systemClock` declaration ten lines away (that read is the
 * SANCTIONED entropy boundary the no-nondeterminism gate WAIVES — flagging it here
 * would block a correct, waived boundary, the exact false positive a blocking gate
 * cannot ship). So the span is [claim line, next top-level declaration) over CODE-only
 * text: only an ambient read INSIDE the very block the purity claim documents counts.
 * Returns the 1-based line of the first such in-span read (the contradiction site), or
 * null when the documented declaration is genuinely pure.
 */
function ambientEntropyInDeclaration(text: string, claimLine: number): number | null {
  const codeLines = codeOnly(text).split('\n');
  const start = claimLine - 1; // 0-based index of the claim line
  // A CODE claim sits ON its declaration line; a DOC claim sits ABOVE it. Find the
  // DOCUMENTED declaration = the first top-level declaration at-or-after the claim
  // line. The span the purity claim governs is that declaration's body: [docDecl, the
  // NEXT top-level declaration after it). An ambient read in a LATER sibling
  // declaration (e.g. the sanctioned, waived entropy boundary) falls OUTSIDE this span,
  // so it never contradicts this symbol's purity.
  let docDecl = -1;
  for (let i = start; i < codeLines.length; i++) {
    if (TOP_LEVEL_DECLARATION.test(codeLines[i] ?? '')) {
      docDecl = i;
      break;
    }
  }
  // No declaration at/after the claim (a trailing doc-only claim) — span is from the
  // claim line to EOF (nothing follows to scope against). Otherwise the span ends at
  // the next top-level declaration after the documented one.
  const spanStart = docDecl >= 0 ? docDecl : start;
  let end = codeLines.length;
  for (let i = spanStart + 1; i < codeLines.length; i++) {
    if (TOP_LEVEL_DECLARATION.test(codeLines[i] ?? '')) {
      end = i;
      break;
    }
  }
  for (let i = spanStart; i < end; i++) {
    if (AMBIENT_ENTROPY.test(codeLines[i] ?? '')) return i + 1;
  }
  return null;
}

/**
 * A TOP-LEVEL declaration line start — a declaration keyword at column 0 (optionally
 * `export `-prefixed), the boundary that ends the symbol a purity claim documents. A
 * NESTED declaration (indented, inside the claimed symbol's own body) is deliberately
 * NOT a boundary, so a `pure` function with an inner helper still has its whole body in
 * span. Mirrors {@link DECLARATION} but anchored to the line start.
 */
const TOP_LEVEL_DECLARATION =
  /^(?:export\s+)?(?:default\s+)?(?:function|const|let|var|class|interface|type|enum|namespace)\s/;

function scan(context: GateContext): readonly Finding[] {
  const determinism = determinismConfirmers(context);
  const contentAddress = contentAddressConfirmers(context);
  const findings: Finding[] = [];

  for (const file of context.files()) {
    if (!isPublishedSource(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;

    for (const site of claimsInFile(file, text)) {
      // The purity contradiction is scoped to the DECLARATION the claim documents — an
      // ambient read in a SIBLING declaration (e.g. the sanctioned, waived boundary) is
      // not this symbol's contradiction. Computed per-site (the span starts at the
      // claim's own line); the determinism/content-address confirmers ignore it.
      const entropyLine = site.claimKind === 'pure' ? ambientEntropyInDeclaration(text, site.line) : null;
      const confirmed = confirmSite(site, { determinism, contentAddress, entropyLine });
      if (confirmed.ok) continue;
      findings.push(
        finding({
          ruleId: CLAIM_PROPERTY_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: `${claimTitle(site.claimKind)} with no confirmer`,
          detail: `${site.file}:${site.line} — ${site.detail}, but ${confirmed.why}. A semantic property claimed in published source with nothing confirming it is unproven prose: a downstream consumer ships on a guarantee nothing verifies. Either CONFIRM it (${confirmed.how}) or drop the claim.`,
          location: confirmed.location ?? { file: site.file, line: site.line },
          remediation: {
            kind: 'instruction',
            description: `Back the ${claimWord(site.claimKind)} claim with its confirmer, or remove the claim.`,
            steps: confirmed.steps,
          },
        }),
      );
    }
  }
  return findings;
}

/** The per-kind confirmer verdict — composed by data, not branched into the caller. */
interface Confirmation {
  readonly ok: boolean;
  readonly why: string;
  readonly how: string;
  readonly steps: readonly string[];
  readonly location?: { readonly file: string; readonly line: number };
}

interface ConfirmerInputs {
  readonly determinism: readonly string[];
  readonly contentAddress: readonly string[];
  readonly entropyLine: number | null;
}

/**
 * Decide whether a claim site is confirmed, per its `claimKind` — the one place the
 * three confirmers fan out, each a MEASURABLE check (Rice). Returns a self-explaining
 * {@link Confirmation} either way (so the caller never re-branches on the kind).
 */
function confirmSite(site: ClaimSite, inputs: ConfirmerInputs): Confirmation {
  switch (site.claimKind) {
    case 'pure': {
      // The strongest hard case: a self-contradiction, decided in-file but SCOPED to
      // the claim's own declaration (a sibling declaration's sanctioned, waived ambient
      // read is not this symbol's contradiction). A `pure` claim whose documented
      // declaration reads ambient entropy cannot be true.
      if (inputs.entropyLine === null) {
        return { ok: true, why: '', how: '', steps: [] };
      }
      return {
        ok: false,
        why: `its declaration reads ambient entropy at line ${inputs.entropyLine} (Date.now / performance.now / Math.random / argless new Date)`,
        how: 'remove the ambient read — thread an injected clock/RNG so the path is genuinely pure',
        steps: [
          `Line ${inputs.entropyLine} reads an ambient nondeterministic source — a "pure" function cannot read the wall clock or unseeded randomness.`,
          'Inject the clock/RNG (the @czap/core systemClock / wallClock / systemRng substrate) and thread it through, or drop the purity claim.',
        ],
        location: { file: site.file, line: inputs.entropyLine },
      };
    }
    case 'deterministic': {
      if (inputs.determinism.some((c) => referencesSite(site, c))) {
        return { ok: true, why: '', how: '', steps: [] };
      }
      return {
        ok: false,
        why: 'no determinism / DST / property test references it',
        how: 'add a determinism, replay, or property test that names this symbol or module',
        steps: [
          site.kind === 'code'
            ? `Add a determinism/property test (tests/**) whose body or describe/it title names "${site.symbol}" (or the module "${moduleToken(site.file)}"), asserting the same input yields the same output run-to-run.`
            : `Add a determinism/property test (tests/**) referencing the module "${moduleToken(site.file)}", or — if it is not actually proven deterministic — soften the wording so it no longer promises determinism.`,
          'A determinism claim is confirmed by a replay test (two runs → byte-identical), a DST scenario, or a fast-check property carrying a `// PROVES: INV-…-DETERMINISTIC` header.',
        ],
      };
    }
    case 'content-addressed': {
      if (inputs.contentAddress.some((c) => referencesSite(site, c))) {
        return { ok: true, why: '', how: '', steps: [] };
      }
      return {
        ok: false,
        why: 'no round-trip / identity test through the content-address kernel references it',
        how: 'add a round-trip identity test through addressedDigestOf / CanonicalCbor that names this symbol or module',
        steps: [
          site.kind === 'code'
            ? `Add a content-address test (tests/**) naming "${site.symbol}" (or the module "${moduleToken(site.file)}") that round-trips through addressedDigestOf / CanonicalCbor and asserts equal value ⟹ equal address.`
            : `Add a content-address round-trip test referencing the module "${moduleToken(site.file)}", or soften the wording if it is not actually content-addressed/canonical.`,
          'A content-address/canonical claim is confirmed by an identity round-trip: equal logical values address-equal, and re-canonicalizing is a fixpoint.',
        ],
      };
    }
  }
}

function claimWord(kind: ClaimKind): string {
  return kind === 'pure' ? 'purity' : kind === 'deterministic' ? 'determinism' : 'content-addressing';
}

function claimTitle(kind: ClaimKind): string {
  return kind === 'pure'
    ? 'Purity claim contradicted by ambient entropy'
    : kind === 'deterministic'
      ? 'Determinism claim'
      : 'Content-addressing claim';
}

// ---------------------------------------------------------------------------
// Fixtures — the authority ratchet's evidence. All in-memory; no filesystem.
// Each claim kind ships its own red/green pair so the mutation has real teeth.
// ---------------------------------------------------------------------------

/** RED: a `deterministicFold` symbol with NO determinism test naming it. */
const RED_DETERMINISTIC = 'export function deterministicFold(): number {\n  return 1;\n}\n';
/** RED: a `pure` doc claim in a file that reads the wall clock — a contradiction. */
const RED_PURE = '/** A pure projection. */\nexport function project(): number {\n  return Date.now();\n}\n';
/** RED: a `canonicalize` symbol with NO content-address test naming it. */
const RED_CONTENT = 'export function canonicalize(x: number): number {\n  return x;\n}\n';

/** GREEN: the same three claims, each now CONFIRMED by its measurable confirmer. */
const GREEN_DETERMINISTIC = 'export function deterministicFold(): number {\n  return 1;\n}\n';
const GREEN_DETERMINISTIC_TEST =
  "import { it } from 'vitest';\nit('deterministicFold replays byte-identical', () => {\n  // a determinism/replay proof\n});\n";
const GREEN_PURE =
  '/** A pure projection. */\nexport function project(clock: { now(): number }): number {\n  return clock.now();\n}\n';
const GREEN_CONTENT = 'export function canonicalize(x: number): number {\n  return x;\n}\n';
const GREEN_CONTENT_TEST =
  "import { it } from 'vitest';\nimport { addressedDigestOf } from '@czap/canonical';\nit('canonicalize round-trips: equal value, equal address', () => {\n  void addressedDigestOf;\n});\n";

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const claimPropertyGate: Gate = defineGate({
  id: CLAIM_PROPERTY_RULE_ID,
  level: 'L3',
  describe:
    'Claim-without-confirmer — a semantic property claim (deterministic / pure / content-addressed) in published src with no measurable confirmer (a determinism test / an in-file ambient-entropy check / a content-address round-trip test) is a finding.',
  run: scan,
  fixtures: {
    red: {
      name: 'three published claims (deterministic / pure-with-Date.now / canonical) each MISSING its confirmer',
      context: memoryContext({
        'packages/widget/src/fold.ts': RED_DETERMINISTIC,
        'packages/widget/src/project.ts': RED_PURE,
        'packages/widget/src/canon.ts': RED_CONTENT,
      }),
    },
    green: {
      name: 'the same three claims, each now CONFIRMED (a determinism test / no ambient read / a content-address round-trip test)',
      context: memoryContext({
        'packages/widget/src/fold.ts': GREEN_DETERMINISTIC,
        'packages/widget/src/project.ts': GREEN_PURE,
        'packages/widget/src/canon.ts': GREEN_CONTENT,
        'tests/unit/widget/fold-determinism.prop.test.ts': GREEN_DETERMINISTIC_TEST,
        'tests/unit/widget/canon-address.test.ts': GREEN_CONTENT_TEST,
      }),
    },
    mutation: {
      describe:
        "A scanner that treats every claim as confirmed (the confirmer always returns ok) catches nothing — the red fixture's three unconfirmed claims then go unflagged, so the mutant must DIFFER from the original on the red fixture.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          // Mutant: the confirmer is neutered (every claim "confirmed"), so no claim
          // site is ever a finding. The red fixture's unconfirmed claims escape.
          void context;
          return [];
        },
      }),
    },
  },
});
