/**
 * Tier 6 — gauntlet phase-subset selection for parallel CI lanes.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { gauntletPhases, selectGauntletPhases } from '../../../packages/cli/src/gauntlet-phases.js';

describe('gauntlet phase subset selection', () => {
  it('returns all phases when no selector is provided', () => {
    expect(selectGauntletPhases()).toEqual(gauntletPhases);
  });

  it('filters to --only labels in canonical order', () => {
    const selected = selectGauntletPhases({ only: ['bench', 'bench:gate'] });
    expect(selected.map((phase) => phase.label)).toEqual(['bench', 'bench:gate']);
  });

  it('expands ci-parallel-preflight without build/capsule:compile when skip-build', () => {
    const selected = selectGauntletPhases({ profile: 'ci-parallel-preflight', skipBuild: true });
    expect(selected.map((phase) => phase.label)).toEqual([
      'typecheck',
      'lint',
      'lint:structural',
      'docs:check:fast',
      'docs:check',
      'assurance:gate',
      'test:constitution',
      'invariants',
      'check:gates',
      'audit:floor',
    ]);
  });

  it('expands local-safe profile in canonical gauntlet order (0.9 tier accept bar)', () => {
    const selected = selectGauntletPhases({ profile: 'local-safe' });
    expect(selected.map((phase) => phase.label)).toEqual([
      'build',
      'capsule:compile',
      'typecheck',
      'lint',
      'lint:structural',
      'invariants',
      'check:gates',
      'audit:floor',
      'test (unit + component + property + integration)',
      'standards:gate',
      'capability:gate',
      'spine-relation:gate',
      'transition:gate',
    ]);
  });

  it('omits --skip labels', () => {
    const selected = selectGauntletPhases({ skip: ['build', 'flex:verify'] });
    expect(selected.map((phase) => phase.label)).not.toContain('build');
    expect(selected.map((phase) => phase.label)).not.toContain('flex:verify');
    expect(selected.length).toBe(gauntletPhases.length - 2);
  });

  it('throws on unknown only labels', () => {
    expect(() => selectGauntletPhases({ only: ['not-a-phase'] })).toThrow(/Unknown gauntlet phase/);
  });

  it('throws on unknown profile names', () => {
    expect(() => selectGauntletPhases({ profile: 'not-a-profile' })).toThrow(/Unknown gauntlet profile/);
  });
});
