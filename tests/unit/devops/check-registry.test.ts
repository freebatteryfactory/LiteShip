// @vitest-environment node
/**
 * The check-registry GOVERNANCE meta-test — the real-repo enforcement arm of the
 * three check-governance FactGates (`check-registry-complete` / `check-negative-control`
 * / `check-waiver-freshness`).
 *
 * The gates themselves are LEAN: they decide over an injected {@link CheckGovernanceFacts}
 * FactPack. The production host and this test both use the same fact builder;
 * omitting the pack invalidates the execution plan before any gate runs. This
 * meta-test folds
 * `@liteship/command`'s `CHECK_REGISTRY` / `SCRIPT_EXEMPTIONS`, the root `package.json`
 * scripts, the on-disk negative-control paths, `@liteship/gauntlet`'s `LITESHIP_WAIVERS`,
 * and the traceability ledger against an injected wall-clock date — and runs the SAME
 * gates over them, asserting the real repo is clean. It also proves the gates have TEETH
 * (a synthetic violation is caught) and self-prove (blocking authority), and PINS the
 * gauntlet-phases projection to the reviewed release-label order.
 *
 * It ENFORCES the negative-control PARTITION (INV-CHECK-NEGATIVE-CONTROL): over the
 * blocking checks, every one declares a `negativeControl` whose path EXISTS. There
 * is no blocker-exemption ledger: a synthetic missing or dangling control reds.
 *
 * @module
 */
// PROVES: INV-CHECK-NEGATIVE-CONTROL

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECK_REGISTRY, SCRIPT_EXEMPTIONS } from '@liteship/command';
// The STRICT builder, reached by module path on purpose: the `@liteship/command/host`
// barrel deliberately publishes only the admission-carrying `checkGovernanceFactsFor`,
// so a consumer cannot call the strict half unguarded. These laws are about the strict
// half itself and hold the repository root, which does carry every governance record.
import { buildCheckGovernanceFacts } from '../../../packages/command/src/host/check-governance.js';
import { EXECUTION_PREREQUISITES } from '../../../scripts/lib/execution-prerequisites.js';
import {
  verifyGate,
  earnedAuthority,
  memoryContext,
  checkRegistryCompleteGate,
  checkNegativeControlGate,
  checkWaiverFreshnessGate,
  WAIVER_FRESHNESS_STORES,
  type CheckGovernanceFacts,
  type GateContext,
  type Gate,
} from '@liteship/gauntlet';
import { gauntletPhaseLabels } from '../../../packages/cli/src/gauntlet-phases.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

/**
 * A FIXED wall-clock date (the two-clock law — a calendar comparison, never a live
 * clock), chosen so the committed waivers (both stores expire in 2027) are fresh. A
 * deterministic date keeps this test reproducible; a committed waiver expiring BEFORE
 * it would (correctly) red — the freshness enforcement with teeth.
 */
const NOW = new Date('2026-07-20T00:00:00Z');

/** The root `package.json` script names. */
function rootScripts(): readonly string[] {
  const pkg = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  return Object.keys(pkg.scripts);
}

/** A GateContext carrying the injected check-governance facts (no fs, no clock — the gate is pure). */
function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

const FACTS = buildCheckGovernanceFacts(REPO, NOW);

describe('the check-registry PARTITION is total + disjoint against the root scripts', () => {
  const scripts = FACTS.partition.scripts;
  const registeredScripts = new Set(FACTS.partition.registered.map((entry) => entry.script));
  const exempted = new Set(FACTS.partition.exempted);

  it('every root script is registered XOR exempt (nothing uncovered)', () => {
    const uncovered = scripts.filter((script) => !registeredScripts.has(script) && !exempted.has(script));
    expect(uncovered, `unregistered + unexempt root scripts: ${uncovered.join(', ')}`).toEqual([]);
  });

  it('no root script is both registered and exempt (disjoint)', () => {
    const overlap = scripts.filter((script) => registeredScripts.has(script) && exempted.has(script));
    expect(overlap, `scripts in BOTH the registry and the exemptions: ${overlap.join(', ')}`).toEqual([]);
  });

  it('every registered command resolves to an existing root script', () => {
    const unresolved = FACTS.partition.registered.filter((entry) => !entry.scriptExists);
    expect(unresolved.map((entry) => `${entry.id}→${entry.script}`)).toEqual([]);
  });

  it('the partition covers the root scripts exactly without a hand-authored count mirror', () => {
    const projected = new Set([...registeredScripts, ...exempted]);
    expect(projected).toEqual(new Set(scripts));
    expect(FACTS.partition.registered.length + SCRIPT_EXEMPTIONS.length).toBe(scripts.length);
  });

  it('classifies the affected selector as CI plumbing rather than a second test authority', () => {
    const affected = SCRIPT_EXEMPTIONS.find((entry) => entry.script === 'test:affected');
    expect(affected).toEqual({
      script: 'test:affected',
      reason: 'Test plumbing: conservative package-DAG selector for the pull-request affected lane.',
    });
    expect(CHECK_REGISTRY.some((entry) => entry.command === 'pnpm run test:affected')).toBe(false);
  });
});

describe('execution prerequisites are real repository operations', () => {
  it('every pnpm-run prerequisite resolves to an existing root script', () => {
    const scripts = new Set(rootScripts());
    const missing = Object.values(EXECUTION_PREREQUISITES)
      .map((entry) => ({ entry, match: /^pnpm run ([\w:-]+)$/u.exec(entry.command) }))
      .filter(({ match }) => match !== null && !scripts.has(match[1]!))
      .map(({ entry }) => `${entry.id}→${entry.command}`);
    expect(missing).toEqual([]);
  });
});

describe('the check registry is the only verification authority', () => {
  it('does not retain the legacy parallel verify-all launcher or route a root script through it', () => {
    const legacy = resolve(REPO, 'scripts/verify-all.sh');
    const manifest = readFileSync(resolve(REPO, 'package.json'), 'utf8');
    expect(existsSync(legacy)).toBe(false);
    expect(manifest).not.toContain('verify-all.sh');
    expect(manifest).not.toContain('ALL GATES PASSED');
  });
});

describe('the check-governance meta-gates are GREEN over the real repo', () => {
  it.each([
    {
      id: 'check/assurance-density',
      command: 'pnpm run assurance:gate',
      control: 'tests/unit/devops/assurance-inventory.test.ts',
    },
    {
      id: 'check/test-constitution',
      command: 'pnpm run test:constitution',
      control: 'tests/unit/devops/test-constitution.test.ts',
    },
  ])('$id is a cheap, blocking, cross-platform authority with a direct planted red', ({ id, command, control }) => {
    const check = CHECK_REGISTRY.find((entry) => entry.id === id);
    expect(check).toMatchObject({
      command,
      authority: 'blocking',
      cache: 'content-addressed',
      profiles: ['quick', 'full', 'release'],
      platforms: ['linux', 'darwin', 'win32'],
      negativeControl: control,
    });
    expect(existsSync(resolve(REPO, control))).toBe(true);
  });

  it('check-registry-complete finds nothing (the partition holds)', () => {
    expect(checkRegistryCompleteGate.run(factContext(FACTS))).toEqual([]);
  });

  it('check-negative-control finds nothing (every declared negativeControl exists)', () => {
    expect(checkNegativeControlGate.run(factContext(FACTS))).toEqual([]);
  });

  it('check-waiver-freshness finds nothing (no expired waiver in either store)', () => {
    expect(checkWaiverFreshnessGate.run(factContext(FACTS))).toEqual([]);
  });

  it('at least one negativeControl is actually wired (the gate is not vacuously green)', () => {
    const declared = FACTS.negativeControls.filter((entry) => entry.negativeControl !== null);
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.every((entry) => entry.exists)).toBe(true);
  });

  it('at least one waiver is actually evaluated in each store (the gate is not vacuously green)', () => {
    expect(FACTS.waivers.some((entry) => entry.store === 'gauntlet')).toBe(true);
    expect(FACTS.waivers.some((entry) => entry.store === 'ledger')).toBe(true);
  });
});

describe('negative controls are total over the blocking checks', () => {
  const blocking = CHECK_REGISTRY.filter((check) => check.authority === 'blocking');

  it('every blocking check declares an existing negative control', () => {
    const missing: string[] = [];
    const dangling: string[] = [];
    for (const check of blocking) {
      const declares = check.negativeControl !== undefined;
      if (!declares) missing.push(check.id);
      if (declares && !existsSync(resolve(REPO, check.negativeControl!))) dangling.push(check.id);
    }
    expect(missing, `blocking checks without a negative control: ${missing.join(', ')}`).toEqual([]);
    expect(
      dangling,
      `blocking checks whose declared negativeControl path does not exist: ${dangling.join(', ')}`,
    ).toEqual([]);
  });

  it('the gate agrees the real-repo partition is clean (zero findings)', () => {
    expect(checkNegativeControlGate.run(factContext(FACTS))).toEqual([]);
  });

  it('the totality has TEETH — the gate reds on a synthetic unclassified blocking check', () => {
    const withHole: CheckGovernanceFacts = {
      ...FACTS,
      negativeControls: [
        ...FACTS.negativeControls,
        {
          id: 'check/__unclassified__',
          blocking: true,
          negativeControl: null,
          exists: false,
        },
      ],
    };
    const found = checkNegativeControlGate.run(factContext(withHole));
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((f) => f.title.includes('no negative control'))).toBe(true);
  });

  it('every currently declared blocking check carries a control without a hand-authored count mirror', () => {
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking.every((check) => check.negativeControl.length > 0)).toBe(true);
  });
});

describe('the check-governance meta-gates have TEETH over injected facts', () => {
  it('check-registry-complete flags a synthetic uncovered root script', () => {
    const withOrphan: CheckGovernanceFacts = {
      ...FACTS,
      partition: { ...FACTS.partition, scripts: [...FACTS.partition.scripts, '__synthetic_orphan__'] },
    };
    expect(checkRegistryCompleteGate.run(factContext(withOrphan)).length).toBeGreaterThan(0);
  });

  it('check-negative-control flags a synthetic blocking check with a missing control', () => {
    const withDangling: CheckGovernanceFacts = {
      ...FACTS,
      negativeControls: [
        ...FACTS.negativeControls,
        {
          id: 'check/__synthetic__',
          blocking: true,
          negativeControl: 'packages/gauntlet/src/gates/__missing__.ts',
          exists: false,
        },
      ],
    };
    expect(checkNegativeControlGate.run(factContext(withDangling)).length).toBeGreaterThan(0);
  });

  it('check-waiver-freshness flags a synthetic expired waiver', () => {
    const withExpired: CheckGovernanceFacts = {
      ...FACTS,
      waivers: [
        ...FACTS.waivers,
        {
          store: 'gauntlet',
          id: 'gauntlet/synthetic@a.ts:1',
          owner: 'test-owner',
          justification: 'Synthetic gauntlet location proof.',
          expiry: '2000-01-01',
          expired: true,
        },
        {
          store: 'ledger',
          id: '__synthetic__',
          owner: 'test-owner',
          justification: 'Synthetic expired-waiver negative control.',
          expiry: '2000-01-01',
          expired: true,
        },
      ],
    };
    const findings = checkWaiverFreshnessGate.run(factContext(withExpired));
    expect(findings.map((entry) => entry.location?.file).sort()).toEqual([
      'packages/gauntlet/src/waivers.ts',
      'traceability/testing-ledger.yaml',
    ]);
    expect(findings.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('gauntlet waivers registry'),
        expect.stringContaining('traceability ledger'),
      ]),
    );
  });
});

describe('waiver freshness facts are signed, stable, and calendar-bounded', () => {
  const VALID_WAIVER = Object.freeze({
    store: 'ledger' as const,
    id: 'INV-SYNTHETIC',
    owner: 'test-owner',
    justification: 'Synthetic freshness-kernel proof row.',
    expiry: '2027-06-20',
    expired: false,
  });
  const LEGACY_ACCEPTED_WAIVER = Object.freeze({ ...VALID_WAIVER, expires: VALID_WAIVER.expiry });

  function withWaivers(waivers: readonly unknown[]): CheckGovernanceFacts {
    return { ...FACTS, waivers: waivers as CheckGovernanceFacts['waivers'] };
  }

  it('projects stable store identities and owner-signed metadata from EVERY enrolled store', () => {
    expect(FACTS.waivers.length).toBeGreaterThan(0);
    // Derived from the enrolled-store table rather than a hand-listed pair, so a
    // newly enrolled store that produces no facts reds here instead of riding
    // along silently — which is exactly what a two-name assertion allowed.
    expect(new Set(FACTS.waivers.map((entry) => entry.store))).toEqual(new Set(Object.keys(WAIVER_FRESHNESS_STORES)));
    expect(FACTS.waivers.find((entry) => entry.store === 'ledger')?.id).toBe('INV-VECTOR-CLOCK-MONOTONIC');
    expect(
      FACTS.waivers.every(
        (entry) =>
          entry.id.length > 0 &&
          entry.owner.trim().length > 0 &&
          entry.justification.trim().length > 0 &&
          /^\d{4}-\d{2}-\d{2}$/u.test(entry.expiry),
      ),
    ).toBe(true);
    const identities = FACTS.waivers.map((entry) => `${entry.store}\u0000${entry.id}`);
    expect(new Set(identities).size).toBe(identities.length);
  });

  it('uses the injected calendar date: fresh before and throughout expiry, expired only after it', () => {
    const before = buildCheckGovernanceFacts(REPO, new Date('2027-06-19T23:59:59.999Z')).waivers.filter(
      (entry) => entry.store === 'gauntlet',
    );
    const at = buildCheckGovernanceFacts(REPO, new Date('2027-06-20T23:59:59.999Z')).waivers.filter(
      (entry) => entry.store === 'gauntlet',
    );
    const after = buildCheckGovernanceFacts(REPO, new Date('2027-06-21T00:00:00.000Z')).waivers.filter(
      (entry) => entry.store === 'gauntlet',
    );

    expect(before.length).toBeGreaterThan(0);
    expect(before.every((entry) => !entry.expired)).toBe(true);
    expect(at.every((entry) => !entry.expired)).toBe(true);
    expect(after.every((entry) => entry.expired)).toBe(true);
  });

  it.each([
    ['missing owner', { ...LEGACY_ACCEPTED_WAIVER, owner: undefined }],
    ['blank justification', { ...LEGACY_ACCEPTED_WAIVER, justification: '   ' }],
    ['non-canonical date width', { ...LEGACY_ACCEPTED_WAIVER, expiry: '2027-6-20' }],
    ['impossible calendar date', { ...LEGACY_ACCEPTED_WAIVER, expiry: '2027-02-29' }],
  ])('refuses %s before the gate can decide', (_label, malformed) => {
    expect(() => checkWaiverFreshnessGate.run(factContext(withWaivers([malformed])))).toThrow(/waivers\[0\]/u);
  });

  it('refuses a duplicate store+id identity before the gate can decide', () => {
    expect(() =>
      checkWaiverFreshnessGate.run(factContext(withWaivers([LEGACY_ACCEPTED_WAIVER, { ...LEGACY_ACCEPTED_WAIVER }]))),
    ).toThrow(/duplicate waiver identity/u);
  });
});

describe('the check-governance meta-gates self-prove → blocking authority', () => {
  const gates: readonly Gate[] = [checkRegistryCompleteGate, checkNegativeControlGate, checkWaiverFreshnessGate];
  for (const gate of gates) {
    it(`${gate.id} catches its red, passes its green, kills its mutant → blocking`, () => {
      const proof = verifyGate(gate);
      expect(proof.redCaught).toBe(true);
      expect(proof.greenClean).toBe(true);
      expect(proof.mutationKilled).toBe(true);
      expect(proof.selfProven).toBe(true);
      expect(earnedAuthority(proof)).toBe('blocking');
    });
  }
});

// ── The gauntlet-phases projection is PINNED to the exact pre-change order ─────

/**
 * The gauntlet phase labels, in execution order — reviewed against the executor's
 * dry-run BEFORE `gauntletPhases` became a projection of `CHECK_REGISTRY`. The
 * projection must reproduce this list byte-for-byte (identical labels, identical order):
 * a divergence here means the projection or the registry drifted the release sequence.
 */
const PINNED_GAUNTLET_LABELS: readonly string[] = [
  'environment-check',
  'build',
  'capsule:compile',
  'typecheck',
  'typecheck:qualify',
  'lint',
  'lint:structural',
  'lockfile:gate',
  'security:minimum',
  'security:audit',
  'prebuild:gate',
  'workflow-output:gate',
  'workspace-deps:gate',
  'governed-exceptions:gate',
  'docs:check:fast',
  'docs:check',
  'assurance:gate',
  'test:constitution',
  'invariants',
  'check:gates',
  'audit:floor',
  'test (unit + component + property + integration)',
  'test:vite',
  'test:astro',
  'test:cloudflare',
  'test:cloudflare-dev',
  'test:tailwind',
  'test:e2e',
  'test:e2e:stress',
  'test:e2e:stream-stress',
  'test:flake',
  'test:redteam',
  'bench',
  'bench:gate',
  'bench:contracts',
  'bench:trend',
  'bench:reality',
  'package:smoke',
  'coverage:wipe-subprocess',
  'coverage:node:tracked',
  'coverage:browser',
  'merge-subprocess-v8',
  'coverage:merge',
  'report:runtime-seams',
  'audit',
  'report:adaptive-scan',
  'feedback:verify',
  'runtime:gate',
  'standards:gate',
  'capability:gate',
  'spine-relation:gate',
  'transition:gate',
  'plumb:gate',
  'capsule:verify',
  'flex:verify',
];

describe('the gauntlet-phases projection preserves the reviewed release order', () => {
  it('projects exactly the pinned labels in the pinned order', () => {
    expect(gauntletPhaseLabels()).toEqual(PINNED_GAUNTLET_LABELS);
  });

  it('has exactly the reviewed phase count without a second numeric mirror', () => {
    expect(gauntletPhaseLabels()).toHaveLength(PINNED_GAUNTLET_LABELS.length);
  });
});
