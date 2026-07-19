/**
 * Gate: claim-property — the claim-vs-reality family beyond perf. A DECLARED NAME
 * that promises a SEMANTIC property a reader (and a downstream consumer who ships on
 * it) takes as guaranteed — `deterministic`, `pure`, `content-addressed`,
 * `canonical`, `reproducible` — is a CLAIM. If nothing CONFIRMS that property, the
 * claim is unproven prose. This gate is the enforcement; but it is PRECISE about
 * which claims are HARD-gateable (Rice) and which are merely advisory.
 *
 * THE RICE BOUNDARY (the honest hard-vs-advisory cut). A detector earns HARD
 * (blocking, `error`) authority ONLY where the claim is UNAMBIGUOUS and attributes to
 * a SPECIFIC declared symbol with a MEASURABLE / decidable confirmer. Two classes
 * earn it:
 *
 *  • NAME-BASED CLAIM (the symbol's NAME asserts the property). A declared symbol
 *    whose name carries `deterministic`/`reproducible` (→ `deterministicFold`), `pure`
 *    (→ `pureProject`), or `content-addressed`/`canonical`/`canonicalize` (→
 *    `canonicalize`) is an UNAMBIGUOUS claim about THAT symbol — the name is the
 *    assertion, not prose. Confirmer:
 *      – deterministic/reproducible → a determinism / DST / property test that
 *        references the symbol or its module (committed bytes; decidable). Absent → HARD.
 *      – content-addressed/canonical → a round-trip / identity test through the
 *        content-address kernel that references the symbol or its module. Absent → HARD.
 *      – pure → the symbol's OWN DECLARATION reads NO ambient entropy. An in-span read
 *        is the CONTRADICTION below. (A pure NAME with no entropy read is decidably
 *        clean — no external evidence needed, so no finding.)
 *
 *  • PURITY CONTRADICTION (the strongest hard case — a self-contradiction decided
 *    in-file). A `pure` claim (name OR a declaration-leading doc) whose documented
 *    declaration calls `Date.now(` / `performance.now(` / `Math.random(` / argless
 *    `new Date()` (the {@link no-nondeterminism} oracle) cannot be true. SCOPED to the
 *    declaration the claim documents, not the file: a `pure` doc above one symbol is
 *    NOT contradicted by an ambient read in a SIBLING declaration (e.g. the sanctioned,
 *    no-nondeterminism-WAIVED entropy boundary), so the blocking gate never reds a
 *    correct waived boundary. In-span ambient read → HARD.
 *
 * THE ADVISORY CLASS (Rice: an undecidable confirmer ⟹ never blocking). A
 * DECLARATION-LEADING DOC comment (the leading JSDoc/comment block immediately above a
 * declaration) that claims `deterministic`/`reproducible` or `content-addressed`/
 * `canonical` for THAT declaration, with no confirmer referencing it, is an `advisory`
 * finding — a calibrating work-item for the owner, NOT a block. Why advisory and not
 * hard: a prose claim's confirmer is genuinely undecidable — the comment may describe
 * an aspiration, a neighboring concept, or a property proven elsewhere; we cannot
 * decide which symbol it binds with the certainty a blocking verdict demands. It is
 * STILL attributed to a specific declared symbol (declaration-scoped), so it is a real
 * work-list entry, never free-floating prose noise.
 *
 * WHAT THIS GATE DELIBERATELY DOES NOT DO. A claim keyword in FREE-FLOATING prose (an
 * explanatory comment NOT leading a declaration — a module header, an inline aside, a
 * vocabulary list, this very file's documentation of its own claim words) is NOT a
 * finding at any severity. It is unprovable which symbol such prose claims, so flagging
 * it is fairy dust (and it would flag the gate's own vocabulary docs — the meta-lie this
 * family exists to refuse). Anything SEMANTIC and undecidable (does this fn ACTUALLY
 * compute a canonical form? is it TRULY deterministic under all faults?) is the
 * ambition÷proof HEATMAP's advisory triage ({@link ambition-proof}), never here.
 *
 * PRECISION (the always-must for a blocking gate). Mirrors {@link perf-claim-bench}:
 *  • CODE/NAME claims — a claim keyword as a WHOLE WORD inside a DECLARED symbol name,
 *    scanned over {@link codeOnly} text (comments + strings blanked), so a prose
 *    mention never trips it and the keyword list (a string array) can't flag itself.
 *  • DECLARATION-LEADING DOC claims — a claim keyword in the leading comment block of a
 *    declaration, scanned over {@link stringsBlanked} text with backtick/quote spans
 *    blanked, attributed to the declaration the block leads.
 *
 * LEAN: a pure fold over GateContext bytes (no `typescript`, no IR). It ships
 * red/green/mutation fixtures, so it self-proves via the authority ratchet, and it
 * rides in `LITESHIP_IR_GATES` alongside the other claim-vs-reality gates.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding, type Severity } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stableEvidenceDigest } from '../verdict-cache.js';
import { codeOnly, stringsBlanked } from './code-only.js';

export const CLAIM_PROPERTY_RULE_ID = 'gauntlet/claim-without-confirmer';

/** The closed set of semantic-property claim kinds this gate confirms. */
type ClaimKind = 'deterministic' | 'pure' | 'content-addressed';

/**
 * One claim-vocabulary entry — a `_tag`-style record (composition over inheritance:
 * the three kinds differ by DATA + a per-kind confirmer, assembled by the union, not
 * by a class hierarchy). `identifierFragments` are the de-hyphenated forms an
 * IDENTIFIER can carry (identifiers cannot hold hyphens); `docWords` are the
 * whole-word forms a DECLARATION-LEADING DOC can carry (hyphen OR camel form).
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
 * `safe`) are NOT here — they have no decidable confirmer, so a gate on them would be
 * fairy dust. `canonical` maps to the content-address confirmer because the LiteShip
 * `canonical` package IS the content-address kernel (`CanonicalCbor` →
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
    // HARD NAME fragments are the UNAMBIGUOUS PRODUCER/OPERATION forms only:
    // `canonicalize`/`canonicalized` (verbs → produce a canonical form),
    // `contentaddress`/`contentaddressed` (the content-address operation). Bare
    // `canonical` as an identifier word is DELIBERATELY NOT here: `canonicalBytes`,
    // `canonicalHead`, `canonicalRule`, `canonicalJson` use `canonical` as the ordinary
    // adjective "the standard/normalized one", NOT a behavioural content-address claim —
    // an ambiguous name cannot earn a BLOCKING verdict (Rice). A `canonical` DOC claim
    // still fires (advisory) when it leads a declaration, where the prose context binds it.
    identifierFragments: ['contentaddressed', 'contentaddress', 'canonicalize', 'canonicalized'],
    docWords: ['content-addressed', 'content-address', 'canonical', 'canonicalize', 'canonicalized'],
    label: 'content-addressing',
  },
];

/** A declaration keyword that introduces a named symbol the code scan inspects. */
const DECLARATION = /\b(?:function|const|let|var|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;

/**
 * A TOP-LEVEL declaration line start — a declaration keyword at column 0 (optionally
 * `export `/`default `-prefixed), capturing the declared symbol's name. The boundary a
 * declaration-leading doc block binds to, and the boundary that ends the span a purity
 * claim documents. A NESTED declaration (indented, inside a claimed symbol's own body)
 * is deliberately NOT a boundary, so a `pure` function with an inner helper still has
 * its whole body in span.
 */
const TOP_LEVEL_DECLARATION =
  /^(?:export\s+)?(?:default\s+)?(?:function\*?|const|let|var|class|abstract\s+class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/;

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
  /** 1-based line of the claim itself (the declaration line, or the doc line). */
  readonly line: number;
  /** `code` = the symbol NAME asserts it; `doc` = a declaration-leading comment asserts it. */
  readonly kind: 'code' | 'doc';
  readonly claimKind: ClaimKind;
  /** The declared symbol the claim attaches to — ALWAYS a specific symbol now. */
  readonly symbol: string;
  /** 1-based line of the declaration the claim binds to (the span anchor). */
  readonly declarationLine: number;
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

/** Is this `codeOnly` line blank (only whitespace) — i.e. it carried only a comment or nothing? */
function isBlankCode(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * The declaration a leading comment block binds to: starting at `fromLine` (0-based,
 * the FIRST line of a contiguous comment block), skip the comment block and any blank
 * lines, then the first TOP-LEVEL declaration line is the one the block documents.
 * Returns `{ line, symbol }` (1-based line, declared name) or `null` when the block
 * leads no declaration (free-floating prose — a module header, a section aside).
 *
 * Operates over `codeOnly` lines: a comment line is blank there, so "the next code"
 * after the block is the first non-blank `codeOnly` line — and it must be a top-level
 * declaration for the block to count as that declaration's leading doc.
 */
function declarationLedByComment(
  codeLines: readonly string[],
  rawLines: readonly string[],
  fromLine: number,
): { readonly line: number; readonly symbol: string } | null {
  // Walk forward over the CONTIGUOUS comment block ONLY (consecutive comment lines), then
  // require the VERY NEXT line to be a top-level declaration. A BLANK line between the
  // comment and the code DETACHES the comment — it is then a section header / module
  // aside that leads NO declaration (the JSDoc convention is doc IMMEDIATELY above decl),
  // so a free-floating explanatory block followed by a blank line and unrelated code is
  // NOT bound to that code. This is the precise "leads a declaration" boundary that keeps
  // free-floating prose from being attributed to an arbitrary later symbol.
  let i = fromLine;
  for (; i < codeLines.length; i++) {
    const raw = rawLines[i] ?? '';
    if (commentStart(raw) >= 0 && isBlankCode(codeLines[i] ?? '')) continue; // a comment-only line
    break; // first non-comment line
  }
  if (i >= codeLines.length) return null;
  const code = codeLines[i] ?? '';
  if (isBlankCode(code)) return null; // a blank line follows the block → detached prose
  const m = TOP_LEVEL_DECLARATION.exec(code);
  if (m !== null && m[1] !== undefined) return { line: i + 1, symbol: m[1] };
  return null;
}

/**
 * Collect every semantic-claim site in one published source file — NAME-based code
 * claims and DECLARATION-LEADING doc claims. Free-floating prose is NOT a site.
 */
function claimsInFile(file: string, text: string): readonly ClaimSite[] {
  const sites: ClaimSite[] = [];
  const codeLines = codeOnly(text).split('\n');

  // ── CODE/NAME claims: a claim fragment inside a DECLARED symbol name. Scan codeOnly
  // text (comments + strings blanked) so only real declarations count.
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
              declarationLine: i + 1,
              detail: `the declared symbol \`${symbol}\` claims ${vocab.label} (the term "${fragment}")`,
            });
          }
        }
      }
      m = DECLARATION.exec(line);
    }
  }

  // ── DECLARATION-LEADING DOC claims: a claim keyword in a COMMENT line that is part
  // of the leading doc block of a declaration. Walk the stringsBlanked text (comments
  // kept, strings blanked); for each contiguous comment block, find the declaration it
  // leads (if any), and if the block claims a property, attribute it to THAT symbol.
  const docLines = stringsBlanked(text).split('\n');
  let i = 0;
  while (i < docLines.length) {
    const raw = docLines[i] ?? '';
    const commentAt = commentStart(raw);
    if (commentAt < 0) {
      i++;
      continue;
    }
    // Gather the contiguous comment block [blockStart, blockEnd) and the kinds it claims.
    const blockStart = i;
    const claimedKinds = new Set<ClaimKind>();
    const claimLineByKind = new Map<ClaimKind, number>();
    let j = i;
    while (j < docLines.length) {
      const cr = docLines[j] ?? '';
      const cAt = commentStart(cr);
      if (cAt < 0) break;
      const comment = blankMentionSpans(cr.slice(cAt));
      for (const vocab of CLAIM_VOCAB) {
        const matcher = DOC_MATCHERS.get(vocab.kind);
        if (matcher !== undefined && matcher.test(comment) && !claimedKinds.has(vocab.kind)) {
          claimedKinds.add(vocab.kind);
          claimLineByKind.set(vocab.kind, j + 1);
        }
      }
      j++;
    }
    // The block leads a declaration iff the next real code after it is a top-level decl.
    if (claimedKinds.size > 0) {
      const led = declarationLedByComment(codeLines, docLines, blockStart);
      if (led !== null) {
        for (const ck of claimedKinds) {
          const vocab = CLAIM_VOCAB.find((v) => v.kind === ck)!;
          sites.push({
            file,
            line: claimLineByKind.get(ck)!,
            kind: 'doc',
            claimKind: ck,
            symbol: led.symbol,
            declarationLine: led.line,
            detail: `the leading documentation of \`${led.symbol}\` claims ${vocab.label}`,
          });
        }
      }
      // else: free-floating prose — NOT a site (dropped, never flagged).
    }
    i = j; // resume after the comment block
  }

  // DEDUPE by (declaration, claimKind): a declaration can carry BOTH a NAME claim and a
  // leading-DOC claim of the same kind (`/** A pure projection. */ function pureProject`
  // claims purity twice). That is ONE claim about ONE symbol — emit it ONCE. The CODE
  // (name) site wins: it is the stronger, unambiguous assertion and (for the non-pure
  // kinds) carries the HARD severity, so the survivor is never the weaker doc advisory.
  const byDeclKind = new Map<string, ClaimSite>();
  for (const site of sites) {
    const key = `${site.declarationLine}${site.claimKind}`;
    const existing = byDeclKind.get(key);
    if (existing === undefined || (existing.kind === 'doc' && site.kind === 'code')) {
      byDeclKind.set(key, site);
    }
  }
  return [...byDeclKind.values()];
}

/** Only published source — `packages/<pkg>/src`, the downstream-installable surface. */
function isPublishedSource(file: string): boolean {
  return /^packages\/[^/]+\/src\//.test(file) && file.endsWith('.ts') && !file.endsWith('.d.ts');
}

/**
 * A governed TEST file the confirmer corpus scans — under `tests/` and `.ts`, but NOT a
 * GAUNTLET META-TEST (`tests/**​/gauntlet/**`). Those meta-tests exercise the GATES; they
 * carry the claim vocabulary (`determinism`, `content-address`, `canonical`) as their
 * SUBJECT MATTER and name claimed source modules only as finding-path assertions — so
 * counting one as a confirmer would let the gate's OWN test "prove" an arbitrary
 * module's determinism/content-address claim (the self-confirmation that spuriously
 * cleared the `CapsuleDef` advisory: this file mentions `addressedDigestOf` AND
 * `assembly`). A real confirmer is a determinism/round-trip test of the CLAIMED module,
 * never a test of the gauntlet that hunts such claims.
 */
function isTestFile(file: string): boolean {
  if (!/(?:^|\/)tests\//.test(file) || !file.endsWith('.ts')) return false;
  if (/(?:^|\/)gauntlet\//.test(file)) return false;
  return true;
}

/**
 * The file list the confirmer corpus reads — the UNSCOPED `allFiles()` when the context
 * provides it (the corpus is EVIDENCE, not a judged surface, so it must survive the
 * engine's per-gate level-scoping that narrows `files()` to the gate's band — tests sit
 * BELOW this L3 gate's level and would otherwise be scoped away, leaving an empty corpus
 * and EVERY claim falsely "unconfirmed"). Falls back to `files()` for a context that
 * predates the accessor (an in-memory fixture without scoping is identical either way).
 */
function confirmerCorpusFiles(context: GateContext): readonly string[] {
  return context.allFiles !== undefined ? context.allFiles() : context.files();
}

/** The file's module token a confirmer may reference (basename without extension). */
function moduleToken(file: string): string {
  const base = file.slice(file.lastIndexOf('/') + 1);
  return base.replace(/\.ts$/, '').toLowerCase();
}

/**
 * The MODULE-WORD set a confirmer may reference. The BASENAME words (the file's own
 * name, split on `-`/`.`) are SPECIFIC to the file, so a real 3-char module name —
 * `dag`, `hlc`, `rng`, `ecs` — counts: a `dag.prop.test.ts` naming `dag` confirms a
 * `dag.ts` determinism claim. The DIRECTORY-LEAF word is shared by every sibling file,
 * so it is only a confirmer key when ≥ 4 chars AND not a generic structural leaf
 * (`src`/`lib`/`core` name no specific module — a test under `core/` must NOT confirm
 * an unrelated claim merely by sitting in `core/`; that over-broad dir match is what let
 * the test-scope green mask 1000+ real claims). Mirrors the perf gate's basename ≥3,
 * tightened only on the SHARED dir leaf.
 */
function moduleWords(file: string): readonly string[] {
  const base = moduleToken(file);
  const dir = file.replace(/\/[^/]+$/, '');
  const dirLeaf = dir.slice(dir.lastIndexOf('/') + 1).toLowerCase();
  const words = new Set<string>();
  for (const w of base.split(/[-.]/)) {
    if (w.length >= 3) words.add(w);
  }
  if (dirLeaf.length >= 4 && !GENERIC_DIR_WORDS.has(dirLeaf)) words.add(dirLeaf);
  return [...words];
}

/** Generic structural directory leaves that name no specific module — never a confirmer key. */
const GENERIC_DIR_WORDS: ReadonlySet<string> = new Set([
  'src',
  'lib',
  'core',
  'libs',
  'util',
  'utils',
  'index',
  'runtime',
  'capsules',
  'analysis',
  'harness',
  'commands',
  'host',
  'gates',
  'lifecycle',
]);

/**
 * Does a confirmer body (a test file's code + comments) REFERENCE this claim site —
 * by the claiming symbol name, or by one of the claim file's module words? Used by
 * the determinism + content-address confirmers (purity needs no corpus reference).
 * The symbol match requires a WHOLE-WORD hit (so `project` does not match inside
 * `projection`), keeping a genuinely-tested symbol confirmed without a generic
 * substring satisfying an unrelated claim.
 */
function referencesSite(site: ClaimSite, confirmerText: string): boolean {
  const lower = confirmerText.toLowerCase();
  const symbol = site.symbol.toLowerCase();
  if (symbol.length >= 3 && wholeWordIncludes(lower, symbol)) return true;
  for (const w of moduleWords(site.file)) {
    if (wholeWordIncludes(lower, w)) return true;
  }
  return false;
}

/** Does `haystack` contain `needle` bounded by non-identifier chars on both sides? */
function wholeWordIncludes(haystack: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : haystack[at - 1]!;
    const after = at + needle.length >= haystack.length ? '' : haystack[at + needle.length]!;
    const boundaryBefore = before === '' || !/[a-z0-9_$]/.test(before);
    const boundaryAfter = after === '' || !/[a-z0-9_$]/.test(after);
    if (boundaryBefore && boundaryAfter) return true;
    from = at + 1;
  }
}

/**
 * The DETERMINISM confirmer corpus — the lower-cased text of every governed test file
 * that is itself a determinism / DST / property test (its path or its body names
 * `determinism`/`deterministic`/`replay`/`dst`/`prop`/`PROVES: INV-*` so a generic unit
 * test that merely mentions the module does not count as the determinism confirmer). A
 * claim is confirmed iff some such corpus entry references the site. Comments are KEPT
 * (a `// PROVES: INV-…-DETERMINISTIC` header is real evidence); strings are kept too (a
 * `describe('… deterministic …')` title is the registration).
 */
function determinismConfirmers(context: GateContext): readonly string[] {
  const corpus: string[] = [];
  for (const file of confirmerCorpusFiles(context)) {
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
 * `canonical` package). A "content-addressed"/"canonical" claim is confirmed iff some
 * such test references the site.
 */
function contentAddressConfirmers(context: GateContext): readonly string[] {
  const corpus: string[] = [];
  for (const file of confirmerCorpusFiles(context)) {
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
 * ambient entropy? The confirmer is in-file + decidable: a `pure` symbol/doc whose own
 * declaration body calls `Date.now()` / `performance.now()` / `Math.random()` / argless
 * `new Date()` (the {@link no-nondeterminism} oracle) is a self-contradiction.
 *
 * SCOPED TO THE CLAIM'S DECLARATION, not the whole file. The span is
 * [declarationLine, next top-level declaration) over CODE-only text: only an ambient
 * read INSIDE the very block the purity claim documents counts. A `pure` doc above
 * `fixedClock` is NOT contradicted by a `Date.now()` in a SIBLING `systemClock`
 * declaration (that read is the SANCTIONED, no-nondeterminism-WAIVED entropy boundary).
 * Returns the 1-based line of the first such in-span read, or null when pure.
 */
function ambientEntropyInDeclaration(text: string, declarationLine: number): number | null {
  const codeLines = codeOnly(text).split('\n');
  const spanStart = declarationLine - 1; // 0-based index of the documented declaration
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

function scan(context: GateContext): readonly Finding[] {
  const determinism = determinismConfirmers(context);
  const contentAddress = contentAddressConfirmers(context);
  const findings: Finding[] = [];

  for (const file of context.files()) {
    if (!isPublishedSource(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;

    for (const site of claimsInFile(file, text)) {
      const entropyLine = site.claimKind === 'pure' ? ambientEntropyInDeclaration(text, site.declarationLine) : null;
      const confirmed = confirmSite(site, { determinism, contentAddress, entropyLine });
      if (confirmed.ok) continue;
      findings.push(
        finding({
          ruleId: CLAIM_PROPERTY_RULE_ID,
          severity: confirmed.severity,
          level: 'L3',
          title: `${claimTitle(site.claimKind)}${confirmed.severity === 'advisory' ? ' (advisory — undecidable)' : ''}`,
          detail: `${site.file}:${site.line} — ${site.detail}, but ${confirmed.why}. ${confirmed.framing} Either CONFIRM it (${confirmed.how}) or drop the claim.`,
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
  readonly severity: Severity;
  readonly why: string;
  readonly framing: string;
  readonly how: string;
  readonly steps: readonly string[];
  readonly location?: { readonly file: string; readonly line: number };
}

interface ConfirmerInputs {
  readonly determinism: readonly string[];
  readonly contentAddress: readonly string[];
  readonly entropyLine: number | null;
}

const HARD_FRAMING =
  'A semantic property a symbol NAMES in published source with nothing confirming it is unproven prose: a downstream consumer ships on a guarantee nothing verifies.';
const ADVISORY_FRAMING =
  'A semantic property a declaration DOCUMENTS with nothing confirming it is a calibration item (advisory — a prose claim’s confirmer is undecidable, so this never blocks).';

/**
 * Decide whether a claim site is confirmed, per its `claimKind` — the one place the
 * three confirmers fan out, each a MEASURABLE check (Rice). The SEVERITY follows the
 * hard-vs-advisory cut: a NAME-based determinism/content-address claim and ANY purity
 * contradiction are HARD (`error`); a DECLARATION-LEADING DOC determinism/content-address
 * claim is `advisory` (its confirmer is undecidable). Returns a self-explaining
 * {@link Confirmation} either way.
 */
function confirmSite(site: ClaimSite, inputs: ConfirmerInputs): Confirmation {
  const docAdvisory = site.kind === 'doc';
  const severity: Severity = site.claimKind === 'pure' ? 'error' : docAdvisory ? 'advisory' : 'error';
  const framing = severity === 'advisory' ? ADVISORY_FRAMING : HARD_FRAMING;
  switch (site.claimKind) {
    case 'pure': {
      // The strongest hard case: a self-contradiction, decided in-file but SCOPED to the
      // claim's own declaration (a sibling declaration's sanctioned, waived ambient read
      // is not this symbol's contradiction). A `pure` claim whose documented declaration
      // reads ambient entropy cannot be true — HARD regardless of code/doc origin.
      if (inputs.entropyLine === null) {
        return { ok: true, severity, why: '', framing, how: '', steps: [] };
      }
      return {
        ok: false,
        severity: 'error',
        framing: HARD_FRAMING,
        why: `its declaration reads ambient entropy at line ${inputs.entropyLine} (Date.now / performance.now / Math.random / argless new Date)`,
        how: 'remove the ambient read — thread an injected clock/RNG so the path is genuinely pure',
        steps: [
          `Line ${inputs.entropyLine} reads an ambient nondeterministic source — a "pure" function cannot read the wall clock or unseeded randomness.`,
          'Inject the clock/RNG (the @liteship/core systemClock / wallClock / systemRng substrate) and thread it through, or drop the purity claim.',
        ],
        location: { file: site.file, line: inputs.entropyLine },
      };
    }
    case 'deterministic': {
      if (inputs.determinism.some((c) => referencesSite(site, c))) {
        return { ok: true, severity, why: '', framing, how: '', steps: [] };
      }
      return {
        ok: false,
        severity,
        framing,
        why: 'no determinism / DST / property test references it',
        how: 'add a determinism, replay, or property test that names this symbol or module',
        steps: [
          `Add a determinism/property test (tests/**) whose body or describe/it title names "${site.symbol}" (or the module "${moduleToken(site.file)}"), asserting the same input yields the same output run-to-run.`,
          'A determinism claim is confirmed by a replay test (two runs → byte-identical), a DST scenario, or a fast-check property carrying a `// PROVES: INV-…-DETERMINISTIC` header.',
        ],
      };
    }
    case 'content-addressed': {
      if (inputs.contentAddress.some((c) => referencesSite(site, c))) {
        return { ok: true, severity, why: '', framing, how: '', steps: [] };
      }
      return {
        ok: false,
        severity,
        framing,
        why: 'no round-trip / identity test through the content-address kernel references it',
        how: 'add a round-trip identity test through addressedDigestOf / CanonicalCbor that names this symbol or module',
        steps: [
          `Add a content-address test (tests/**) naming "${site.symbol}" (or the module "${moduleToken(site.file)}") that round-trips through addressedDigestOf / CanonicalCbor and asserts equal value ⟹ equal address.`,
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
      ? 'Determinism claim with no confirmer'
      : 'Content-addressing claim with no confirmer';
}

// ---------------------------------------------------------------------------
// Fixtures — the authority ratchet's evidence. All in-memory; no filesystem.
// Each HARD claim kind ships its own red/green pair so the mutation has real teeth.
// (Advisory doc claims are NON-blocking and are proven by the unit suite, not the
// ratchet's green floor — the ratchet pins the BLOCKING behavior.)
// ---------------------------------------------------------------------------

/** RED: a NAME-based `deterministicFold` symbol with NO determinism test naming it. */
const RED_DETERMINISTIC = 'export function deterministicFold(): number {\n  return 1;\n}\n';
/** RED: a `pure` doc whose OWN declaration reads the wall clock — the contradiction (HARD). */
const RED_PURE = '/** A pure projection. */\nexport function pureProject(): number {\n  return Date.now();\n}\n';
/** RED: a NAME-based `canonicalize` symbol with NO content-address test naming it. */
const RED_CONTENT = 'export function canonicalize(x: number): number {\n  return x;\n}\n';

/** GREEN: the same three claims, each now CONFIRMED by its measurable confirmer. */
const GREEN_DETERMINISTIC = 'export function deterministicFold(): number {\n  return 1;\n}\n';
const GREEN_DETERMINISTIC_TEST =
  "import { it } from 'vitest';\nit('deterministicFold replays byte-identical', () => {\n  // a determinism/replay proof\n});\n";
const GREEN_PURE =
  '/** A pure projection. */\nexport function pureProject(clock: { now(): number }): number {\n  return clock.now();\n}\n';
const GREEN_CONTENT = 'export function canonicalize(x: number): number {\n  return x;\n}\n';
const GREEN_CONTENT_TEST =
  "import { it } from 'vitest';\nimport { addressedDigestOf } from '@liteship/canonical';\nit('canonicalize round-trips: equal value, equal address', () => {\n  void addressedDigestOf;\n});\n";

/**
 * The OUT-OF-IR EVIDENCE digest — the verdict-cache soundness fold for this gate. The
 * gate's verdict depends not only on the published source it scans (IN the IR, covered
 * by the coverage digest) but also on the CONFIRMER TEST CORPUS it reads through the
 * UNSCOPED `allFiles()` (under `tests/` — OUTSIDE the IR). Editing a confirmer test (or
 * deleting it) flips a claim between confirmed and unconfirmed WITHOUT touching any IR
 * source byte, so the cache would serve a stale verdict unless this evidence is folded.
 *
 * We fold the EXACT confirmer corpus the gate's `run` reads: every governed test file
 * (the same {@link confirmerCorpusFiles} ∩ {@link isTestFile} set the determinism +
 * content-address confirmer scans walk), as `(path, body)` pairs. The fold is
 * order-independent ({@link stableEvidenceDigest} sorts by path), so it is stable and
 * sensitive to ADDING, REMOVING, or EDITING any confirmer. Pure: it only re-reads the
 * bytes through the same context `run` uses.
 */
function claimPropertyEvidenceDigest(context: GateContext): string {
  const entries: [string, string][] = [];
  for (const file of confirmerCorpusFiles(context)) {
    if (!isTestFile(file)) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    entries.push([file, text]);
  }
  return stableEvidenceDigest(entries);
}

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const claimPropertyGate: Gate = defineGate({
  id: CLAIM_PROPERTY_RULE_ID,
  level: 'L3',
  describe:
    'Claim-without-confirmer — a NAME-based semantic property claim (deterministic / pure / content-addressed) in published src with no measurable confirmer, or a purity claim contradicted by an in-declaration ambient read, is a HARD finding; a declaration-leading DOC claim with no confirmer is advisory (Rice).',
  run: scan,
  evidenceDigest: claimPropertyEvidenceDigest,
  fixtures: {
    red: {
      name: 'three published NAME/contradiction claims (deterministicFold / pureProject-with-Date.now / canonicalize) each MISSING its confirmer',
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
