// @vitest-environment node
/**
 * The check-registry GOVERNANCE meta-test — the real-repo enforcement arm of the
 * three check-governance FactGates (`check-registry-complete` / `check-negative-control`
 * / `check-waiver-freshness`).
 *
 * The gates themselves are LEAN: they decide over an injected {@link CheckGovernanceFacts}
 * FactPack and, on the lean production path where no host injects it, fold an EMPTY
 * verdict. This meta-test is the HOST that builds the REAL facts — folding
 * `@liteship/command`'s `CHECK_REGISTRY` / `SCRIPT_EXEMPTIONS`, the root `package.json`
 * scripts, the on-disk negative-control paths, `@liteship/gauntlet`'s `LITESHIP_WAIVERS`,
 * and the traceability ledger against an injected wall-clock date — and runs the SAME
 * gates over them, asserting the real repo is clean. It also proves the gates have TEETH
 * (a synthetic violation is caught) and self-prove (blocking authority), and PINS the
 * gauntlet-phases projection to the exact pre-change 43-label order.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECK_REGISTRY, SCRIPT_EXEMPTIONS } from '@liteship/command';
import {
  LITESHIP_WAIVERS,
  verifyGate,
  earnedAuthority,
  memoryContext,
  checkRegistryCompleteGate,
  checkNegativeControlGate,
  checkWaiverFreshnessGate,
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

/** Extract the root `package.json` script a check's `command` invokes (`pnpm run X` / `pnpm X` / `ENV=1 pnpm run X`). */
function scriptOf(command: string): string {
  const match = command.match(/(?:^|\s)pnpm(?:\s+run)?\s+([a-z][\w:-]*)/);
  return match?.[1] ?? '';
}

/** The root `package.json` script names. */
function rootScripts(): readonly string[] {
  const pkg = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  return Object.keys(pkg.scripts);
}

/** Fold the real registry / scripts / fs / waivers / ledger into the injected FactPack. */
function buildGovernanceFacts(now: Date): CheckGovernanceFacts {
  const scripts = rootScripts();
  const scriptSet = new Set(scripts);
  const registered = CHECK_REGISTRY.map((check) => {
    const script = scriptOf(check.command);
    return { id: check.id, script, scriptExists: scriptSet.has(script) };
  });
  const exempted = SCRIPT_EXEMPTIONS.map((entry) => entry.script);

  const negativeControls = CHECK_REGISTRY.filter((check) => check.authority === 'blocking').map((check) => {
    const negativeControl = check.negativeControl ?? null;
    return {
      id: check.id,
      blocking: true,
      negativeControl,
      exists: negativeControl !== null && existsSync(resolve(REPO, negativeControl)),
    };
  });

  const gauntletWaivers = LITESHIP_WAIVERS.map((waiver) => ({
    store: 'gauntlet' as const,
    id: `${waiver.ruleId}@${waiver.file ?? ''}:${waiver.line ?? ''}`,
    expires: waiver.expires,
    expired: new Date(waiver.expires).getTime() < now.getTime(),
  }));

  const ledgerText = readFileSync(resolve(REPO, 'traceability/testing-ledger.yaml'), 'utf8');
  // YAML permits either quote style (or none) around a scalar — accept `"…"`, `'…'`, or bare
  // so a ledger re-serialization that flips the quote style can't silently drop the waiver.
  const ledgerWaivers = [...ledgerText.matchAll(/^\s*expiry:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/gm)].map((match, index) => ({
    store: 'ledger' as const,
    id: `ledger-waiver-${index}`,
    expires: match[1]!,
    expired: new Date(match[1]!).getTime() < now.getTime(),
  }));

  return {
    partition: { scripts, registered, exempted },
    negativeControls,
    waivers: [...gauntletWaivers, ...ledgerWaivers],
  };
}

/** A GateContext carrying the injected check-governance facts (no fs, no clock — the gate is pure). */
function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

const FACTS = buildGovernanceFacts(NOW);

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

  it('the partition covers the root scripts EXACTLY (40 checks + 46 exemptions = 86 scripts)', () => {
    expect(CHECK_REGISTRY.length).toBe(40);
    expect(SCRIPT_EXEMPTIONS.length).toBe(46);
    expect(scripts.length).toBe(86);
    expect(new Set([...registeredScripts, ...exempted]).size).toBe(scripts.length);
  });
});

describe('the check-governance meta-gates are GREEN over the real repo', () => {
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
        { id: 'check/__synthetic__', blocking: true, negativeControl: 'packages/gauntlet/src/gates/__missing__.ts', exists: false },
      ],
    };
    expect(checkNegativeControlGate.run(factContext(withDangling)).length).toBeGreaterThan(0);
  });

  it('check-waiver-freshness flags a synthetic expired waiver', () => {
    const withExpired: CheckGovernanceFacts = {
      ...FACTS,
      waivers: [...FACTS.waivers, { store: 'ledger', id: '__synthetic__', expires: '2000-01-01', expired: true }],
    };
    expect(checkWaiverFreshnessGate.run(factContext(withExpired)).length).toBeGreaterThan(0);
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
 * The 43 gauntlet phase labels, in execution order — captured from the executor's
 * dry-run BEFORE `gauntletPhases` became a projection of `CHECK_REGISTRY`. The
 * projection must reproduce this list byte-for-byte (identical labels, identical order):
 * a divergence here means the projection or the registry drifted the release sequence.
 */
const PINNED_GAUNTLET_LABELS: readonly string[] = [
  'rig-check',
  'build',
  'capsule:compile',
  'typecheck',
  'lint',
  'lint:structural',
  'docs:check',
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

describe('the gauntlet-phases projection reproduces the pre-change order', () => {
  it('projects EXACTLY the pinned 43 labels in the pinned order', () => {
    expect(gauntletPhaseLabels()).toEqual(PINNED_GAUNTLET_LABELS);
  });

  it('has 43 phases (the release-profile projection of CHECK_REGISTRY + the executor-only phases)', () => {
    expect(gauntletPhaseLabels()).toHaveLength(43);
  });
});
