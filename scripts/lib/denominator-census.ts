/**
 * W1.3 — the denominator census. Every governing layer answers for its own
 * population, and no config governs files while being governed by nothing.
 *
 * THE CLASS RULE. The ANCHOR is one immutable tracked-file set, taken from
 * exactly one `git ls-files` call. The ALLOWLIST is, per layer, the set its own
 * config actually resolves. A layer is honest when that set is non-empty, at or
 * above its committed floor, and drawn entirely from the tracked anchor.
 *
 * Why this exists. Every gate in this repository reports a NUMERATOR — findings,
 * violations, uncovered edges — against a denominator nobody checks. A layer
 * whose config resolves to zero files reports zero findings and is read as a
 * pass. That shape has shipped here three times: `tsconfig.scripts.json`
 * resolved an empty file set on day one, the `fragments/` tree sat outside
 * every tool, and config files governed populations while no layer governed
 * THEM. Each was found by a person, once, after the fact.
 *
 * The three obligations, and why each is separate:
 *
 *   1. NON-VACUITY — a layer covering nothing cannot report anything. This is
 *      the cheapest check and catches the zero-files class outright.
 *   2. FLOOR — a layer that silently SHRINKS (a glob narrowed, an ignore
 *      widened) still passes non-vacuity. The floor is a shrink alarm, never a
 *      target and never a ceiling: paying coverage up is always allowed.
 *   3. CONFIG GOVERNANCE — the file that decides a population must itself sit
 *      inside some population. Otherwise the one file whose edit silently
 *      changes what gets checked is the one file nothing checks.
 *
 * A non-empty/floor-only law is INSUFFICIENT and the calibration says so:
 * eligibility must be derived independently, or a newly-added source that no
 * config mentions is invisible to all three obligations at once — it is not in
 * any covered set, so nothing reports it missing. {@link ungovernedTrackedFiles}
 * is that fourth obligation, stated against the anchor rather than against any
 * layer's own opinion of itself.
 *
 * @module
 */

import type { TrackedFileCensus } from './tracked-subject-census.js';

/** One governing layer's answer for its own population. */
export interface CoverageLayer {
  readonly id: string;
  /**
   * The config file(s) that DEFINE this layer's population — the files whose
   * edit changes what the layer covers. Governed by {@link configGovernanceFindings}.
   */
  readonly configPaths: readonly string[];
  /** Tracked, repo-relative POSIX paths this layer actually resolves. */
  readonly covered: readonly string[];
  /**
   * Committed non-vacuity floor. A SHRINK ALARM, never a target and never a
   * ceiling — raising coverage is always allowed and never reds.
   */
  readonly floor: number;
}

export type LayerFindingReason = 'empty' | 'below-floor' | 'untracked-coverage';

export interface LayerFinding {
  readonly layer: string;
  readonly reason: LayerFindingReason;
  readonly detail: string;
}

/** Normalize to the tracked census's repo-relative POSIX spelling. */
export function normalizeCensusPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

/**
 * Per-layer honesty: non-empty, at or above floor, and covering only files the
 * anchor actually tracks.
 *
 * `untracked-coverage` is not pedantry. A layer whose glob resolves build
 * output or `node_modules` inflates its own denominator, so a real shrink in
 * AUTHORED coverage can hide behind derived files and never reach the floor.
 */
export function layerFindings(layers: readonly CoverageLayer[], census: TrackedFileCensus): readonly LayerFinding[] {
  const findings: LayerFinding[] = [];
  for (const layer of layers) {
    const covered = layer.covered.map(normalizeCensusPath);
    if (covered.length === 0) {
      findings.push({
        layer: layer.id,
        reason: 'empty',
        detail: `${layer.id} resolves NO files — it reports zero findings over zero inputs, which reads as a pass`,
      });
      continue;
    }
    if (covered.length < layer.floor) {
      findings.push({
        layer: layer.id,
        reason: 'below-floor',
        detail: `${layer.id} covers ${covered.length} files, below its committed floor of ${layer.floor} — coverage shrank`,
      });
    }
    const untracked = covered.filter((path) => !census.has(path));
    if (untracked.length > 0) {
      findings.push({
        layer: layer.id,
        reason: 'untracked-coverage',
        detail:
          `${layer.id} counts ${untracked.length} untracked path(s) toward its own denominator ` +
          `(e.g. ${untracked.slice(0, 3).join(', ')}) — derived files can mask a real shrink in authored coverage`,
      });
    }
  }
  return findings;
}

/**
 * Config files that decide a population while sitting inside none.
 *
 * The file whose edit silently changes what gets checked must itself be checked
 * by something. A layer may govern its own config, which is normal and fine —
 * `eslint.config.js` being linted is exactly the desired shape.
 */
export function configGovernanceFindings(
  layers: readonly CoverageLayer[],
  declaredUngoverned: Readonly<Record<string, string>> = {},
): readonly string[] {
  const governed = new Set(layers.flatMap((layer) => layer.covered.map(normalizeCensusPath)));
  // A config no SOURCE layer can hold (a lockfile, an rc a formatter would
  // recurse on) may still be governed by a named law. The declaration carries
  // that authority, and the anchor law separately proves the declaration is not
  // stale — so this is a redirection of the obligation, never a waiver of it.
  const declared = new Set(Object.keys(declaredUngoverned).map(normalizeCensusPath));
  const findings: string[] = [];
  for (const layer of layers) {
    for (const configPath of layer.configPaths) {
      const path = normalizeCensusPath(configPath);
      if (!governed.has(path) && !declared.has(path)) {
        findings.push(`${path} (governs ${layer.id}, governed by nothing)`);
      }
    }
  }
  return [...new Set(findings)].sort();
}

/**
 * Tracked files no layer covers and no declaration excuses.
 *
 * This is the obligation the other three cannot express. Non-vacuity, floors,
 * and config governance are all stated from inside a layer's own opinion of
 * itself; a source file that no config mentions is absent from every covered
 * set, so none of them can report it. Only a comparison against the ANCHOR can.
 */
export function ungovernedTrackedFiles(
  census: TrackedFileCensus,
  layers: readonly CoverageLayer[],
  declaredUngoverned: Readonly<Record<string, string>>,
): readonly string[] {
  const governed = new Set(layers.flatMap((layer) => layer.covered.map(normalizeCensusPath)));
  const declared = Object.keys(declaredUngoverned).map(normalizeCensusPath);
  return census.paths
    .map(normalizeCensusPath)
    .filter((path) => !governed.has(path))
    .filter((path) => !declared.some((entry) => path === entry || path.startsWith(`${entry}/`)))
    .sort();
}

/**
 * Declared-ungoverned entries that no longer describe anything untracked or
 * uncovered — the complement, so the exemption list cannot rot into a denylist
 * that quietly excuses files a layer has since picked up.
 */
export function staleUngovernedDeclarations(
  census: TrackedFileCensus,
  layers: readonly CoverageLayer[],
  declaredUngoverned: Readonly<Record<string, string>>,
): readonly string[] {
  const governed = new Set(layers.flatMap((layer) => layer.covered.map(normalizeCensusPath)));
  const tracked = census.paths.map(normalizeCensusPath);
  const stale: string[] = [];
  for (const entry of Object.keys(declaredUngoverned).map(normalizeCensusPath)) {
    const members = tracked.filter((path) => path === entry || path.startsWith(`${entry}/`));
    if (members.length === 0) {
      stale.push(`${entry} (declared ungoverned but tracks no files)`);
    } else if (members.every((path) => governed.has(path))) {
      stale.push(`${entry} (declared ungoverned but every member is now covered)`);
    }
  }
  return stale.sort();
}
