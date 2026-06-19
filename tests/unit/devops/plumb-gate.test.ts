/**
 * Meta-test for the plumb-completeness gate (scripts/plumb-gate.ts).
 *
 * The gate is the regression guard the gauntlet never had: a built-not-plumbed
 * subsystem (the scene/stage class — a whole package a consumer never runs) or a
 * newly-unwired capsule can no longer ship green unclassified. This test pins
 * the ledger's hygiene so the gate itself can't rot.
 */
import { describe, expect, it } from 'vitest';
import { runPlumbGate } from '../../../scripts/plumb-gate.js';
import { PACKAGE_PLUMB, PLUMB_FLOOR } from '../../../scripts/plumb-registry.js';

describe('plumb gate', () => {
  it('passes on the current tree (no drift, every package classified)', () => {
    const result = runPlumbGate();
    expect(result.unclassified).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('every deferred package carries a tracking issue (no silent deferral)', () => {
    for (const [name, entry] of Object.entries(PACKAGE_PLUMB)) {
      if (entry.status === 'deferred') {
        expect(entry.issue, `${name} is deferred but has no issue`).toBeTruthy();
      }
      expect(entry.reason.length, `${name} needs a reason`).toBeGreaterThan(0);
    }
  });

  it('the floor holds only capsule entries (orphan noise is not gated here)', () => {
    for (const entry of PLUMB_FLOOR) {
      expect(entry.startsWith('capsule:'), `unexpected floor entry: ${entry}`).toBe(true);
    }
  });

  it('scene and stage are tracked as deferred until the 0.4.0 bridge/encoder land', () => {
    // Guard the headline finding: these subsystems are test-only today and must
    // stay visible on the ledger (flip to `runtime` only when actually plumbed).
    expect(PACKAGE_PLUMB['@czap/scene']?.status).toBe('deferred');
    expect(PACKAGE_PLUMB['@czap/stage']?.status).toBe('deferred');
  });
});
