/**
 * Supply-chain gate (Slice C, avionics tier) — the self-proving fold over the
 * host-supplied {@link SupplyChainFacts}.
 *
 * Pins:
 *  - the authority ratchet: red caught, green clean, mutation killed → blocking.
 *  - the FOUR fact families each red the gate independently (a violation in any
 *    one is an L4 error finding).
 *  - an ABSENT family is reported as an HONEST advisory `not-evidenced`, never a
 *    silent green.
 *  - the gate is LEAN: it folds facts, parses no YAML, decodes no CBOR (a pure
 *    function of `context.supplyChain`).
 */

// PROVES: INV-SUPPLY-CHAIN-HERMETIC, INV-SUPPLY-CHAIN-NO-AMBIENT-CI
import { describe, it, expect } from 'vitest';
import {
  supplyChainGate,
  verifyGate,
  earnedAuthority,
  memoryContext,
  type GateContext,
  type SupplyChainFacts,
} from '@liteship/gauntlet';

function ctx(facts: SupplyChainFacts | undefined): GateContext {
  return facts === undefined ? memoryContext({}) : { ...memoryContext({}), supplyChain: facts };
}

const CLEAN: SupplyChainFacts = {
  lockfile: { lockfileVersion: '9.0', packageCount: 2, violations: [] },
  sbom: { artifactPath: 'reports/sbom.json', contentAddress: 'addr', componentCount: 2, violations: [] },
  provenance: { packageName: '@liteship/x', sourceCommit: '0'.repeat(40), sourceDirty: false, violations: [] },
  ci: { workflowsScanned: ['.github/workflows/release.yml'], violations: [] },
};

describe('supplyChainGate — authority ratchet', () => {
  it('self-proves and earns blocking authority', () => {
    const proof = verifyGate(supplyChainGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('the level is L4 (avionics tier)', () => {
    expect(supplyChainGate.level).toBe('L4');
  });
});

describe('supplyChainGate — each family reds independently (bite proofs)', () => {
  it('a git-URL lockfile violation reds the gate', () => {
    const facts: SupplyChainFacts = {
      ...CLEAN,
      lockfile: {
        lockfileVersion: '9.0',
        packageCount: 2,
        violations: [{ code: 'git-url-dependency', subject: 'p@git', detail: 'git source' }],
      },
    };
    const f = supplyChainGate.run(ctx(facts));
    expect(f.some((x) => x.ruleId === 'gauntlet/supply-chain/lockfile/git-url-dependency')).toBe(true);
    expect(f.every((x) => x.severity === 'error')).toBe(true);
  });

  it('an incomplete SBOM reds the gate', () => {
    const facts: SupplyChainFacts = {
      ...CLEAN,
      sbom: {
        artifactPath: 'reports/sbom.json',
        contentAddress: 'addr',
        componentCount: 1,
        violations: [{ code: 'incomplete-sbom', subject: 'left-pad@1', detail: 'missing' }],
      },
    };
    const f = supplyChainGate.run(ctx(facts));
    expect(f.some((x) => x.ruleId === 'gauntlet/supply-chain/sbom/incomplete-sbom')).toBe(true);
  });

  it('a drifted lockfile_address reds the gate', () => {
    const facts: SupplyChainFacts = {
      ...CLEAN,
      provenance: {
        packageName: '@liteship/x',
        sourceCommit: '0'.repeat(40),
        sourceDirty: false,
        violations: [{ code: 'lockfile-address-drift', subject: '@liteship/x', detail: 'drift' }],
      },
    };
    const f = supplyChainGate.run(ctx(facts));
    expect(f.some((x) => x.ruleId === 'gauntlet/supply-chain/provenance/lockfile-address-drift')).toBe(true);
  });

  it('an ambient NPM_TOKEN reds the gate', () => {
    const facts: SupplyChainFacts = {
      ...CLEAN,
      ci: {
        workflowsScanned: ['.github/workflows/release.yml'],
        violations: [{ code: 'ambient-publish-token', subject: 'release.yml:5', detail: 'NPM_TOKEN' }],
      },
    };
    const f = supplyChainGate.run(ctx(facts));
    expect(f.some((x) => x.ruleId === 'gauntlet/supply-chain/ci/ambient-publish-token')).toBe(true);
  });
});

describe('supplyChainGate — honest under-coverage', () => {
  it('NO injected facts → four advisory not-evidenced findings, zero errors (never silent green)', () => {
    const f = supplyChainGate.run(ctx(undefined));
    const advisories = f.filter((x) => x.severity === 'advisory');
    expect(advisories).toHaveLength(4);
    expect(f.filter((x) => x.severity === 'error')).toHaveLength(0);
    expect(f.map((x) => x.ruleId).sort()).toEqual([
      'gauntlet/supply-chain/ci/not-evidenced',
      'gauntlet/supply-chain/lockfile/not-evidenced',
      'gauntlet/supply-chain/provenance/not-evidenced',
      'gauntlet/supply-chain/sbom/not-evidenced',
    ]);
  });

  it('a partially-evidenced facts record advisories only the absent families', () => {
    const facts: SupplyChainFacts = { lockfile: { lockfileVersion: '9.0', packageCount: 1, violations: [] } };
    const f = supplyChainGate.run(ctx(facts));
    // lockfile present + clean → no lockfile finding; the other three advisory.
    expect(f.map((x) => x.ruleId).sort()).toEqual([
      'gauntlet/supply-chain/ci/not-evidenced',
      'gauntlet/supply-chain/provenance/not-evidenced',
      'gauntlet/supply-chain/sbom/not-evidenced',
    ]);
  });

  it('a fully-evidenced clean chain emits ZERO findings', () => {
    expect(supplyChainGate.run(ctx(CLEAN))).toHaveLength(0);
  });
});
