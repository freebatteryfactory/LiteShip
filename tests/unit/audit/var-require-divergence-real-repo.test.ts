/**
 * Slice B (B3.2) — the LIVE triangulated cross-check over THIS very repo for the
 * two new properties `var-declaration` (NO_VAR) and `require-call` (NO_REQUIRE).
 *
 * Mirrors `ir-parity-and-divergence.test.ts`'s B1-close section, generalized to the
 * parametric layer: build the host-composed IR (audit's AST oracle + the
 * host-injected LiteShip `invariant-regex` oracle running all three canonical
 * rules) ONCE over the real repo, then assert `noVarDivergenceGate` /
 * `noRequireDivergenceGate` behave correctly and report the ACTUAL divergence
 * counts.
 *
 * WHAT SURFACES (documented, advisory, self-explaining): on this repo the
 * `var-declaration` and `require-call` properties have ZERO AST facts AND ZERO
 * regex facts — the codebase is clean ESM with no legacy bindings and no CommonJS
 * loader calls — so both gates report ZERO divergences. That is NOT the layer going
 * blind: the exclude-vs-miss markers DO fire for the rules' sanctioned exclude
 * files (the NO_VAR exclude trio, the NO_REQUIRE gate-files), proving the host
 * oracle ran each rule live. The default-export property meanwhile carries 9 real
 * AST default-exports, every one a sanctioned policy exclude (the B3.1 ~9→0). The
 * layer now triangulates THREE properties; all findings are advisory (cross-class),
 * never a blocking same-class contradiction.
 *
 * @module
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { buildRepoIR, withRepoRoot, liteshipDevopsProfile } from '@czap/audit';
import { liteshipRegexOracle } from '../../../packages/cli/src/lib/repo-ir-gauntlet.js';
import {
  noVarDivergenceGate,
  noRequireDivergenceGate,
  type Fact,
  type RepoIR,
} from '@czap/gauntlet';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function gateContext(ir: RepoIR) {
  return { repoRoot: REPO_ROOT, readFile: () => undefined, files: () => [] as string[], ir };
}

/** Count facts under `property` from `oracleId`. */
function countFacts(facts: readonly Fact[], property: string, oracleId: string): number {
  return facts.filter((f) => f.property === property && f.oracleId === oracleId).length;
}

/** The distinct files carrying a marker under `markerProperty` (the exclude-vs-miss seam). */
function excludedFiles(facts: readonly Fact[], markerProperty: string): ReadonlySet<string> {
  return new Set(
    facts.filter((f) => f.property === markerProperty && f.oracleId === 'invariant-regex').map((f) => f.file),
  );
}

describe('B3.2 — the LIVE var/require triangulated cross-check over THIS repo', () => {
  let realIR: RepoIR;
  beforeAll(() => {
    // The COMPOSED IR exactly as the CLI host (`buildRepoIRForRepo`) builds it:
    // audit's structural AST oracle + the host-injected LiteShip invariant-regex
    // oracle (which now runs NO_DEFAULT_EXPORT, NO_VAR and NO_REQUIRE).
    realIR = buildRepoIR(withRepoRoot(liteshipDevopsProfile, REPO_ROOT), {
      extraFactOracles: [liteshipRegexOracle],
    });
  }, scaledTimeout(60_000));

  it('the host oracle ran NO_VAR live — the sanctioned exclude trio carries policy-exclude markers', () => {
    // The repo is clean ESM: zero real legacy bindings, so zero AST + zero regex
    // facts. The proof the oracle is NOT blind is the live exclude markers for the
    // NO_VAR rule's sanctioned exclude files (read from the canonical rule, never a
    // hardcoded list).
    const excluded = excludedFiles(realIR.facts, 'var-check-excluded');
    expect(excluded.has('packages/astro/src/integration.ts')).toBe(true);
    expect(excluded.has('packages/remotion/src/hooks.ts')).toBe(true);
    expect(excluded.has('packages/astro/src/client-directives/worker.ts')).toBe(true);
  });

  it('the host oracle ran NO_REQUIRE live — the gate-files carry policy-exclude markers', () => {
    const excluded = excludedFiles(realIR.facts, 'require-check-excluded');
    // The NO_REQUIRE rule excludes the invariant gate's OWN files (they carry the
    // literal as data, not a violation). Those markers prove the rule ran.
    expect(excluded.size).toBeGreaterThanOrEqual(1);
    expect([...excluded].some((f) => f.includes('check-invariants'))).toBe(true);
  });

  it('noVarDivergenceGate reports the ACTUAL divergence count — ZERO, all advisory (clean repo)', () => {
    const findings = noVarDivergenceGate.run(gateContext(realIR));
    // ZERO divergences: no real var, no comment-occurrence the AST misses (after the
    // new gate sources avoid the keyword). The substrate is live (markers fired) —
    // this is genuine agreement, not blindness.
    expect(findings).toEqual([]);
    // Document the substrate: zero AST + zero regex facts on this clean repo.
    expect(countFacts(realIR.facts, 'var-declaration', 'ts-ast')).toBe(0);
    expect(countFacts(realIR.facts, 'var-declaration', 'invariant-regex')).toBe(0);
    // Whatever WOULD surface is advisory (cross-class), never a blocking error.
    for (const f of findings) expect(f.severity).toBe('advisory');
  });

  it('noRequireDivergenceGate reports the ACTUAL divergence count — ZERO, all advisory (clean repo)', () => {
    const findings = noRequireDivergenceGate.run(gateContext(realIR));
    expect(findings).toEqual([]);
    expect(countFacts(realIR.facts, 'require-call', 'ts-ast')).toBe(0);
    expect(countFacts(realIR.facts, 'require-call', 'invariant-regex')).toBe(0);
    for (const f of findings) expect(f.severity).toBe('advisory');
  });

  it('is DETERMINISTIC — folding the same IR yields the same divergence set twice', () => {
    const setOf = (gate: typeof noVarDivergenceGate): readonly string[] =>
      gate
        .run(gateContext(realIR))
        .map((f) => `${f.location?.file}:${f.location?.line}`)
        .sort();
    expect(setOf(noVarDivergenceGate)).toEqual(setOf(noVarDivergenceGate));
    expect(setOf(noRequireDivergenceGate)).toEqual(setOf(noRequireDivergenceGate));
  });
});
