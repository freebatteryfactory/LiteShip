/**
 * Gate: no skipped test — the FACTGATE form (the "gate-as-data" PoC of the always-blocking
 * no-skipped-test rule). Same rule, same `ruleId` (`gauntlet/no-skipped-test`), same findings
 * as the closure {@link noSkippedTestGate} — but its decision is DATA, not an arbitrary
 * `run(context)` body.
 *
 * The closure gate's `run` fuses acquisition + normalization + decision in one body that can
 * read anything on the context. Here the three are split honestly:
 *  - the PRODUCER ({@link produceSkipSiteFactsFromContext}, host-side) does acquisition +
 *    normalization, landing a {@link SkipSiteFacts} pack on `context.skipSites`;
 *  - this gate DECLARES it consumes `skipSites` ({@link FactGate.requires}) and DECIDES with a
 *    context-free {@link decideSkips} over exactly that pack — the {@link decideSkipSite kernel}
 *    composed across sites.
 *
 * Because the decision never receives a {@link GateContext}, it physically cannot read
 * undeclared evidence; because cache identity is the declared FactPack's digest
 * ({@link factBundleDigest}, synthesized by {@link defineFactGate}), soundness is structural,
 * not a hand-authored `evidenceDigest`. This is the experiment, not (yet) the production gate:
 * the closure {@link noSkippedTestGate} remains the registered rule; this one is proven
 * equivalent over the adversarial corpus by the shadow-diff before any promotion.
 *
 * @module
 */

import { defineFactGate, pickFacts, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { SkipForm } from './skip-detect.js';
import {
  decideSkipSite,
  produceSkipSiteFactsFromContext,
  type SkipSiteFact,
  type SkipVerdict,
} from '../facts/skip-site-facts.js';

/** A human label for the detected skip form, for the finding detail (verbatim with the closure gate). */
function formLabel(form: SkipForm): string {
  switch (form) {
    case 'call':
      return 'a skip/todo call';
    case 'conditional':
      return 'a runtime-conditional skip (.skipIf / .runIf)';
    case 'alias':
      return 'an aliased skip reference (e.g. `COND ? it : it.skip`)';
    case 'computed':
      return 'a computed member access on a test runner (e.g. `it[cond ? "skip" : "only"]`) — it can resolve to skip';
    case 'aliased':
      return 'a suspicious aliased runner (a rebind to a non-literal RHS mentioning a runner, e.g. `const t = cond ? it : x`) — statically undecidable, flagged not passed';
  }
}

/** Build the gate's Finding for one blocked site — verbatim with the closure gate's emission. */
function blockedFinding(site: SkipSiteFact): Finding {
  return finding({
    ruleId: 'gauntlet/no-skipped-test',
    severity: 'error',
    level: 'L2',
    title: 'Skipped test — green while proving nothing',
    detail: `${site.file}:${site.line} carries ${formLabel(site.form)} (\`${site.token}\`). A skipped test ships GREEN while asserting nothing — it is unfinished work disguised as passing, the exact lie the harness must never emit. This rule is always-blocking: a skip can never be waived, only made real, honestly removed, or — if it is a genuine capability gate — ENUMERATED in the sanctioned-skip allowlist (skip-allowlist.ts) so it is visible and audited.`,
    location: { file: site.file, line: site.line },
    remediation: {
      kind: 'instruction',
      description:
        'Make the test real, remove it, or — for a genuine capability gate — enumerate it in the sanctioned-skip allowlist.',
      steps: [
        'If the test asserts something real, WIRE it: bind the real subject and turn the skip into a running `it(...)` with teeth.',
        'If the case is a genuine capability gate (ffmpeg/wasm/SharedArrayBuffer/coverage absent), add an enumerated entry to SANCTIONED_SKIPS (skip-allowlist.ts) with the file + the EXACT skip SITE (the normalized source line) + the capability reason — the sanction is per-site, not per-file, and the allowlist is the visible, snapshot-pinned record (adding an entry is a standards WEAKEN the raccoon-rule diff surfaces).',
        'If the test was a placeholder for work not yet done, delete it; an empty promise of coverage is worse than no test (it reads as covered).',
      ],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. Maps the declared {@link SkipSiteFacts}
 * pack through the per-site {@link decideSkipSite kernel} (injectable, so the mutation fixture
 * can swap in a plausible-but-wrong kernel) and emits a finding for every blocked site. An
 * absent pack (`context.skipSites` not injected) folds to an empty verdict.
 */
export function decideSkips(
  facts: FactBundle,
  decide: (site: SkipSiteFact) => SkipVerdict = decideSkipSite,
): readonly Finding[] {
  const pack = facts.skipSites;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const site of pack.sites) {
    if (decide(site) === 'allow') continue;
    findings.push(blockedFinding(site));
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Fixtures — the SAME adversarial corpus as the closure gate, but as INJECTED facts:
// each fixture context carries `skipSites` produced (token detector) off its files, so the
// fact gate's synthesized `run` (decide ∘ pickFacts) sees the same world the closure gate scans.
// ---------------------------------------------------------------------------

/** A fixture context with the SkipSite FactPack produced over its files (token detector). */
function factContext(files: Record<string, string>): GateContext {
  const base = memoryContext(files);
  return { ...base, skipSites: produceSkipSiteFactsFromContext(base) };
}

/** A real (sanctioned) file path used in the GREEN fixture — must match the allowlist. */
const SANCTIONED_FILE = 'tests/smoke/intro-render.test.ts';

/** The qualified fact gate — fixtures included, so it self-proves through the SAME ratchet. */
export const noSkippedTestFactGate: FactGate = defineFactGate({
  id: 'gauntlet/no-skipped-test',
  level: 'L2',
  describe:
    'FactGate form of no-skipped-test: declares it consumes the SkipSite FactPack and DECIDES with a context-free kernel — flags every skip form across package source + the tests/ tree, allowed only when the site is in the enumerated capability-gated allowlist.',
  requires: ['skipSites'],
  decide: (facts) => decideSkips(facts),
  fixtures: {
    red: {
      name: 'an UNSANCTIONED tests/-tree file with the EXOTIC skip forms a flat `.skip(` regex misses (alias + chained-modifier + bracket + computed + ALIASED runner roots)',
      context: factContext({
        'tests/unit/widget/unwired.test.ts':
          'const renderIt = COND ? it : it.skip;\n' +
          "renderIt('not wired yet', () => {});\n" +
          "it.concurrent.skip('chained modifier skip', () => {});\n" +
          'it["skip"]("bracket skip", () => {});\n' +
          'it[cond ? "skip" : "only"]("computed skip", () => {});\n',
        'tests/unit/widget/import-rename.test.ts':
          'import { it as spec } from "vitest";\nspec.skip("import-renamed runner skip", () => {});\n',
        'tests/unit/widget/rebind.test.ts': 'const t = it;\nt.skip("rebound runner skip", () => {});\n',
        'tests/unit/widget/destructure.test.ts': 'const { skip } = it;\nskip("destructured skip member", () => {});\n',
        'tests/unit/widget/capture.test.ts': 'const skipIt = it.skip;\nskipIt("captured skip accessor", () => {});\n',
      }),
    },
    green: {
      name: 'a SANCTIONED capability-gate skip passes + a prose mention of it.skip is clean',
      context: factContext({
        [SANCTIONED_FILE]: "it.skip('skipped — ffmpeg libx264 render probe failed (see liteship doctor)', () => {});\n",
        'tests/unit/widget/good.test.ts':
          "// This suite never uses it.skip — every test runs.\nit('asserts a real fact', () => {\n  const label = 'unlike an it.skip placeholder, this asserts';\n  expect(label.length).toBeGreaterThan(0);\n});\n",
      }),
    },
    mutation: {
      describe:
        'A kernel that DROPS the sanction floors (blocks only placeholder-marked sites, treating every other detected skip as allowed) lets the red fixture — every exotic + aliased UNSANCTIONED skip, none placeholder-marked — escape with zero findings. The mutant must differ from the original on red.',
      mutate: (gate: Gate): Gate => {
        const brokenKernel = (site: SkipSiteFact): SkipVerdict => (site.carriesPlaceholder ? 'block' : 'allow');
        const brokenDecide = (facts: FactBundle): readonly Finding[] => decideSkips(facts, brokenKernel);
        return {
          ...gate,
          decide: brokenDecide,
          run: (context: GateContext): readonly Finding[] => brokenDecide(pickFacts(context, ['skipSites'])),
        };
      },
    },
  },
});
