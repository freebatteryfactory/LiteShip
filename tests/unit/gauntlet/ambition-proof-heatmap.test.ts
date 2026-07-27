/**
 * The AMBITION÷PROOF HEATMAP (the claim-vs-reality family's ADVISORY half) — a PURE,
 * deterministic TRIAGE ranking each substantive module by AMBITION (size + complexity +
 * claim density + effective assurance) ÷ PROOF (has-test + property-test + mutation +
 * bench + enrolled invariant + non-test call-sites). These tests pin the LAWS that make
 * it trustworthy AS ADVISORY: (1) it is ADVISORY by construction (the artifact carries
 * `advisory: true` and the module emits DATA, never a Finding — it cannot be wired as a
 * blocking gate); (2) it is a DETERMINISTIC fold (the same inputs fold to a
 * byte-identical artifact twice); (3) the FORMULA ranks a high-ambition/low-proof module
 * ABOVE a low-ambition/high-proof one (the whole point — the hot spot floats up); and
 * (4) the PROOF FLOOR keeps a zero-proof module's hotness FINITE (no division-by-zero
 * Infinity) while still ranking it at the top.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  computeHeatmap,
  makeRepoIR,
  HEATMAP_FORMAT,
  type HeatmapInputs,
  type ModuleProofSignals,
  type FileId,
  type AssuranceLevel,
  type FileNode,
} from '@liteship/gauntlet';

/** A minimal IR over the given substantive module files (the inert fixture digest). */
function irOf(files: readonly FileId[]): ReturnType<typeof makeRepoIR> {
  const nodes: FileNode[] = files.map((id) => ({ id, contentDigest: 'placeholder:no-content-address', packageName: null }));
  return makeRepoIR({ files: nodes });
}

const FULL_PROOF: ModuleProofSignals = {
  hasTestFile: true,
  hasPropertyTest: true,
  hasBench: true,
  hasEnrolledInvariant: true,
  mutationScore: 1,
};
const NO_PROOF: ModuleProofSignals = {
  hasTestFile: false,
  hasPropertyTest: false,
  hasBench: false,
  hasEnrolledInvariant: false,
  mutationScore: null,
};

/** Build inputs for two modules: an ambitious/unproven one and a modest/proven one. */
function twoModuleInputs(): HeatmapInputs {
  const hot: FileId = 'packages/core/src/ambitious.ts';
  const cold: FileId = 'packages/core/src/modest.ts';
  return {
    ir: irOf([hot, cold]),
    moduleSizes: new Map<FileId, number>([
      [hot, 8000],
      [cold, 400],
    ]),
    claimHits: new Map<FileId, number>([
      [hot, 12],
      [cold, 0],
    ]),
    effectiveLevels: new Map<FileId, AssuranceLevel>([
      [hot, 'L4'],
      [cold, 'L1'],
    ]),
    proofSignals: new Map<FileId, ModuleProofSignals>([
      [hot, NO_PROOF],
      [cold, FULL_PROOF],
    ]),
  };
}

describe('the heatmap is ADVISORY by construction', () => {
  it('the artifact carries advisory:true and the format version', () => {
    const heatmap = computeHeatmap(twoModuleInputs());
    expect(heatmap.advisory).toBe(true);
    expect(heatmap.format).toBe(HEATMAP_FORMAT);
  });

  it('emits DATA (ranked hot spots), never Findings — it cannot block', () => {
    const heatmap = computeHeatmap(twoModuleInputs());
    expect(Array.isArray(heatmap.hotSpots)).toBe(true);
    // No hot spot carries a severity / ruleId — it is triage data, not a verdict.
    for (const h of heatmap.hotSpots) {
      expect(h).not.toHaveProperty('severity');
      expect(h).not.toHaveProperty('ruleId');
    }
  });
});

describe('the heatmap is a DETERMINISTIC fold', () => {
  it('the same inputs fold to a byte-identical artifact twice', () => {
    const inputs = twoModuleInputs();
    const a = computeHeatmap(inputs);
    const b = computeHeatmap(inputs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('ranks by a TOTAL, STABLE order (ties break by file id)', () => {
    // Two identical-signal modules — the tie must break deterministically by file id.
    const a: FileId = 'packages/core/src/aaa.ts';
    const z: FileId = 'packages/core/src/zzz.ts';
    const inputs: HeatmapInputs = {
      ir: irOf([z, a]),
      moduleSizes: new Map([[a, 1000], [z, 1000]]),
      claimHits: new Map([[a, 1], [z, 1]]),
      effectiveLevels: new Map<FileId, AssuranceLevel>([[a, 'L3'], [z, 'L3']]),
      proofSignals: new Map([[a, NO_PROOF], [z, NO_PROOF]]),
    };
    const heatmap = computeHeatmap(inputs);
    expect(heatmap.hotSpots.map((h) => h.file)).toEqual([a, z]);
  });
});

describe('the FORMULA — a high-ambition / low-proof module floats to the top', () => {
  it('ranks the ambitious/unproven module ABOVE the modest/proven one', () => {
    const heatmap = computeHeatmap(twoModuleInputs());
    expect(heatmap.hotSpots[0]?.file).toBe('packages/core/src/ambitious.ts');
    expect(heatmap.hotSpots[1]?.file).toBe('packages/core/src/modest.ts');
    // The hot spot has the higher ambition AND the lower proof — the whole point.
    expect(heatmap.hotSpots[0]!.ambition.ambition).toBeGreaterThan(heatmap.hotSpots[1]!.ambition.ambition);
    expect(heatmap.hotSpots[0]!.proof.proof).toBeLessThan(heatmap.hotSpots[1]!.proof.proof);
    expect(heatmap.hotSpots[0]!.hotness).toBeGreaterThan(heatmap.hotSpots[1]!.hotness);
  });

  it('the PROOF FLOOR keeps a zero-proof module FINITE (no Infinity) yet still hot', () => {
    const hot = twoModuleInputs().proofSignals.get('packages/core/src/ambitious.ts')!;
    expect(hot.mutationScore).toBeNull(); // unmeasured → the sound floor (0)
    const heatmap = computeHeatmap(twoModuleInputs());
    const top = heatmap.hotSpots[0]!;
    expect(top.proof.proof).toBe(0); // genuinely zero proof
    expect(Number.isFinite(top.hotness)).toBe(true); // floored, not Infinity
    expect(top.hotness).toBeGreaterThan(0);
  });

  it('an unmeasured mutation score never INFLATES proof (the sound direction)', () => {
    const file: FileId = 'packages/core/src/x.ts';
    const measured: HeatmapInputs = {
      ir: irOf([file]),
      moduleSizes: new Map([[file, 1000]]),
      claimHits: new Map([[file, 0]]),
      effectiveLevels: new Map<FileId, AssuranceLevel>([[file, 'L3']]),
      proofSignals: new Map([[file, { ...NO_PROOF, mutationScore: 1 }]]),
    };
    const unmeasured: HeatmapInputs = {
      ...measured,
      proofSignals: new Map([[file, { ...NO_PROOF, mutationScore: null }]]),
    };
    // Same module, only the mutation score differs: measured-1 must prove STRICTLY more.
    expect(computeHeatmap(measured).hotSpots[0]!.proof.proof).toBeGreaterThan(
      computeHeatmap(unmeasured).hotSpots[0]!.proof.proof,
    );
  });
});

describe('scope — only substantive packages/*/src modules are ranked', () => {
  it('ignores a non-src file present in the IR', () => {
    const src: FileId = 'packages/core/src/real.ts';
    const tooling: FileId = 'scripts/tool.ts';
    const inputs: HeatmapInputs = {
      ir: irOf([src, tooling]),
      moduleSizes: new Map([[src, 1000], [tooling, 1000]]),
      claimHits: new Map([[src, 1], [tooling, 1]]),
      effectiveLevels: new Map<FileId, AssuranceLevel>([[src, 'L3'], [tooling, 'L3']]),
      proofSignals: new Map([[src, NO_PROOF], [tooling, NO_PROOF]]),
    };
    const heatmap = computeHeatmap(inputs);
    expect(heatmap.hotSpots.map((h) => h.file)).toEqual([src]);
  });
});
