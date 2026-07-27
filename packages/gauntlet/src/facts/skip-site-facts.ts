/**
 * SkipSite FactPack — the host-produced evidence the {@link noSkippedTestFactGate} decides
 * over, and the PRODUCER + KERNEL that bracket it. This is the FactGate PoC's data spine:
 * the "gate-as-data" reshaping of the always-blocking no-skipped-test rule.
 *
 * The closure gate ({@link noSkippedTestGate}) fuses three jobs in one arbitrary `run(context)`
 * body: ACQUISITION (enumerate the governed corpus, read bytes, run the skip detector),
 * NORMALIZATION (the per-site registry lookup + the placeholder / capability-consistency
 * floors), and DECISION (block the unsanctioned). That fusion is exactly what lets a closure
 * read undeclared evidence — there is a body to hide a read in.
 *
 * The FactGate split draws the line where it honestly falls:
 *
 *  - PRODUCER ({@link produceSkipSiteFacts}) — HOST-side, does ALL acquisition + normalization.
 *    It wraps the CANONICAL skip detector (the injected `detectSkipsAST`, or the token
 *    `detectSkips` fallback) and the CANONICAL sanction primitives ({@link sanctionEntryFor},
 *    {@link siteCarriesPlaceholderMarker}, {@link siteConsistentWithCapability}) — never a
 *    mirror — and emits each site's THREE orthogonal floor inputs as flat data.
 *  - KERNEL ({@link decideSkipSite}) — a bounded, data-only decision over one site's booleans.
 *    No regex, no Map, no filesystem: just the floor composition that IS the rule's law.
 *
 * The honest finding the PoC answers (acceptance #10): the decision DOES reduce to a data-only
 * kernel — PROVIDED the producer performs acquisition + normalization + the registry lookup
 * (the string / regex / Map work). The kernel cannot do those and stay data-only; that work is
 * acquisition, not decision, and belongs to the producer. What remains in the kernel — the
 * precedence of the three floors — is the genuine, bounded law.
 *
 * @module
 */

import type { GateContext } from '../gate.js';
import { detectSkips, type SkipForm, type SkipMatch } from '../gates/skip-detect.js';
import {
  sanctionEntryFor,
  siteCarriesPlaceholderMarker,
  siteConsistentWithCapability,
} from '../gates/skip-allowlist.js';

/**
 * One detected skip site, with the three orthogonal floor inputs PRE-COMPUTED by the producer
 * so the {@link decideSkipSite kernel} composes them with no string / Map work of its own:
 *  - `carriesPlaceholder` — the site's source line carries a placeholder marker (TODO / stub /
 *    …); a placeholder can never be sanctioned (the always-blocking no-placeholder floor).
 *  - `sanctionMatched` — the `(file, normalized-site)` pair is enumerated in the sanctioned-skip
 *    allowlist (the pre-floor registry match).
 *  - `capabilityConsistent` — the matched entry is self-consistent with its declared capability
 *    (the AST-conditionality proof when available, else the keyword heuristic); `false` when no
 *    entry matched.
 */
export interface SkipSiteFact {
  readonly file: string;
  readonly line: number;
  readonly form: SkipForm;
  readonly token: string;
  readonly carriesPlaceholder: boolean;
  readonly sanctionMatched: boolean;
  readonly capabilityConsistent: boolean;
}

/** The injected FactPack — every detected skip site across the governed corpus, as flat data. */
export interface SkipSiteFacts {
  readonly sites: readonly SkipSiteFact[];
}

/** The skip detector the producer wraps — the injected `detectSkipsAST` or the token fallback. */
export type SkipDetector = (source: string) => readonly SkipMatch[];

/**
 * A `.ts` file the no-skipped-test rule judges — excludes `tests/generated/` (the plumb-gate's
 * tree owns that subtree's zero-skip guarantee). The producer's corpus filter; a deliberate
 * (trivial) twin of the closure gate's own `isGoverned`, so the shadow-diff is a TRUE
 * differential over the whole path, not a shared-helper blind spot.
 */
export function isGoverned(file: string): boolean {
  if (!file.endsWith('.ts')) return false;
  if (/(?:^|\/)tests\/generated\//.test(file)) return false;
  return true;
}

/**
 * The governed corpus: the IR-scoped judged `files()` UNIONED with the UNSCOPED `allFiles()`
 * (the `tests/` tree), minus `tests/generated/`. De-duped + sorted so the fold is deterministic.
 */
export function governedFiles(context: GateContext): readonly string[] {
  const judged = context.files();
  const all = context.allFiles !== undefined ? context.allFiles() : judged;
  const union = new Set<string>([...judged, ...all]);
  return [...union].filter(isGoverned).sort();
}

/**
 * THE PRODUCER — fold a governed file list into a {@link SkipSiteFacts} pack. Does all
 * acquisition (read + detect) and normalization (the registry lookup + the floor inputs),
 * reusing the canonical detector (`detect`, default the token {@link detectSkips}) and the
 * canonical sanction primitives. Pure w.r.t. its inputs; no clock, no ambient I/O beyond the
 * supplied `readFile`.
 */
export function produceSkipSiteFacts(
  files: readonly string[],
  readFile: (file: string) => string | undefined,
  detect: SkipDetector = detectSkips,
): SkipSiteFacts {
  const sites: SkipSiteFact[] = [];
  for (const file of files) {
    const text = readFile(file);
    if (text === undefined) continue;
    const skips = detect(text);
    if (skips.length === 0) continue;
    const rawLines = text.split('\n');
    for (const skip of skips) {
      const rawLine = rawLines[skip.line - 1] ?? '';
      // The PRE-FLOOR registry match (the canonical map, no mirror). The producer decomposes
      // `sanctionedSkipFor` into its three independent floor inputs; the kernel recomposes them.
      const entry = sanctionEntryFor(file, rawLine);
      sites.push({
        file,
        line: skip.line,
        form: skip.form,
        token: skip.token,
        carriesPlaceholder: siteCarriesPlaceholderMarker(rawLine),
        sanctionMatched: entry !== undefined,
        capabilityConsistent:
          entry !== undefined ? siteConsistentWithCapability(rawLine, entry.capability, skip.conditional) : false,
      });
    }
  }
  return { sites };
}

/**
 * Convenience producer over a {@link GateContext} — enumerates the {@link governedFiles},
 * reads through the context, and wraps the INJECTED `detectSkipsAST` when the host supplied it
 * (`context.skipDetector`), the token {@link detectSkips} otherwise. This is the host-side fold
 * a runner/CLI calls to land `context.skipSites`; it reads the context, but it is gauntlet-owned
 * infrastructure, not author gate code — the FactGate's `decide` never sees the context.
 */
export function produceSkipSiteFactsFromContext(
  context: GateContext,
  detect: SkipDetector = context.skipDetector ?? detectSkips,
): SkipSiteFacts {
  return produceSkipSiteFacts(governedFiles(context), (file) => context.readFile(file), detect);
}

/** A per-site verdict — the bounded decision's output alphabet. */
export type SkipVerdict = 'allow' | 'block';

/**
 * THE KERNEL — the bounded, DATA-ONLY decision for one skip site. Reproduces `sanctionedSkipFor`'s
 * law as a pure composition of the producer's three precomputed floors, in the SAME precedence:
 * a placeholder is never sanctionable (floor 1); an unenumerated site is unsanctioned (floor 2);
 * an enumerated-but-capability-inconsistent site is unsanctioned (floor 3); otherwise allowed.
 * No regex, no Map, no I/O — exactly the property the FactGate buys.
 */
export function decideSkipSite(site: SkipSiteFact): SkipVerdict {
  if (site.carriesPlaceholder) return 'block';
  if (!site.sanctionMatched) return 'block';
  if (!site.capabilityConsistent) return 'block';
  return 'allow';
}
