/**
 * The two-axis spine-relation gate — acceptance (Wave 8.5, issue #156). This is the
 * NO-AUTHORITY-GAP proof: the gate must reproduce every frozen spine-conformance pin's
 * catch mechanically before those pins are absorbed (the S-conflict discipline — never
 * delete a pin ahead of a green gate that subsumes it).
 *
 * It drives the real @czap/audit builder (a ts.Program probe over the spine mirror +
 * the runtime surface) and folds the observed facts through the real @czap/gauntlet
 * gate. GREEN on the reconciled spine; RED on each of the three historical drift
 * fixtures (CapSet Set→array, Millis brand loss, WGSL omission), injected in-memory via
 * the builder's overlay seam; deterministic; and self-proving through the authority
 * ratchet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSpineRelationFacts, type SpineTypeAdmission } from '../../../packages/audit/src/spine-relation-build.js';
import { spineRelationGate } from '../../../packages/gauntlet/src/gates/spine-relation.js';
import { memoryContext } from '../../../packages/gauntlet/src/engine.js';
import { verifyGate } from '../../../packages/gauntlet/src/authority.js';
import type { Finding } from '../../../packages/gauntlet/src/finding.js';
import type { SpineRelationFacts } from '../../../packages/gauntlet/src/spine-relation-facts.js';
import { LITESHIP_SPINE_ADMISSIONS } from '../../fixtures/spine-relation-admissions.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const CORE_DTS = resolve(REPO_ROOT, 'packages/_spine/core.d.ts');
const REAL_CORE = readFileSync(CORE_DTS, 'utf8');

const ADMISSIONS: readonly SpineTypeAdmission[] = LITESHIP_SPINE_ADMISSIONS.map((row) => ({
  typeName: row.typeName,
  authority: row.authority,
  admittedRelation: row.relation,
  spineExpr: row.spineExpr,
  runtimeModule: row.runtimeModule,
  runtimeExpr: row.runtimeExpr,
}));

/** Fold facts through the real gate (a minimal context carrying only the facts). */
function gateFindings(facts: SpineRelationFacts): readonly Finding[] {
  return spineRelationGate.run({ ...memoryContext({}), spineRelation: facts });
}

/** Build facts with `core.d.ts` drifted in-memory (never touching disk). */
function driftedFacts(mutate: (core: string) => string): { facts: SpineRelationFacts; drifted: string } {
  const drifted = mutate(REAL_CORE);
  expect(drifted, 'the drift edit must actually change core.d.ts').not.toBe(REAL_CORE);
  return { facts: buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, { overlay: { [CORE_DTS]: drifted } }), drifted };
}

describe('spine-relation gate — GREEN on the reconciled spine (no drift, no gap)', () => {
  it(
    'every admitted mirror resolves and conforms — the gate emits zero findings',
    { timeout: scaledTimeout(60_000) },
    () => {
      const facts = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT);
      expect(facts.observations).toHaveLength(ADMISSIONS.length);
      // No authority gap: EVERY admitted pin resolves (a dangling mirror would red).
      const unresolved = facts.observations.filter((o) => !o.resolved);
      expect(
        unresolved,
        `unresolved admissions:\n${unresolved.map((o) => `${o.typeName}: ${o.detail}`).join('\n')}`,
      ).toEqual([]);
      expect(gateFindings(facts)).toEqual([]);
    },
  );

  it('is byte-deterministic (build twice → identical facts)', { timeout: scaledTimeout(60_000) }, () => {
    const a = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT);
    const b = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT);
    expect(a).toEqual(b);
  });
});

describe('spine-relation gate — REDS on the three historical drift fixtures (the relocated pins)', () => {
  it('CapSet Set→array (the levels member changed shape)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) =>
      c.replace('readonly levels: readonly CapTier[];', 'readonly levels: ReadonlySet<CapTier>;'),
    );
    const capSet = facts.observations.find((o) => o.typeName === 'CapSet')!;
    expect(capSet.observedRelation).toBe('opaque'); // incompatible both directions
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CapSet'))).toBe(true);
  });

  it('Millis brand loss (VideoConfig.durationMs demoted to number)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) => c.replace('readonly durationMs: Millis;', 'readonly durationMs: number;'));
    const videoConfig = facts.observations.find((o) => o.typeName === 'VideoConfig')!;
    expect(videoConfig.observedRelation).toBe('public-wider'); // spine widened past the brand
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('VideoConfig'))).toBe(true);
  });

  it('WGSL output omission (CompositeState.outputs dropped a channel)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) => c.replace('readonly wgsl: Record<string, number>;', ''));
    const composite = facts.observations.find((o) => o.typeName === 'CompositeState')!;
    expect(composite.observedRelation).toBe('public-wider'); // spine missing a runtime member
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CompositeState'))).toBe(true);
  });

  it('an unresolved mirror (a removed type) reds as a broken contract', { timeout: scaledTimeout(60_000) }, () => {
    // Rename CapSet on the spine side → the admission's spine type no longer resolves.
    const { facts } = driftedFacts((c) => c.replace('export interface CapSet {', 'export interface CapSetRenamed {'));
    const capSet = facts.observations.find((o) => o.typeName === 'CapSet')!;
    expect(capSet.resolved).toBe(false);
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CapSet') && f.title.includes('no longer resolves'))).toBe(true);
  });
});

describe('spine-relation gate — authority ratchet (Axiom 5)', () => {
  it('self-proves: redCaught ∧ greenClean ∧ mutationKilled', () => {
    const proof = verifyGate(spineRelationGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});
