/**
 * The composition debt ledger's SHRINK-ONLY law (PR #192 review, confirmed):
 * `LITESHIP_UPDATE_COMPOSITION_BASELINE=1` regeneration must never be a
 * sanctioned gate weakening. Bootstrap enumerates the first sweep's uncovered
 * set; every later regeneration is the INTERSECTION of the existing ledger
 * with the current uncovered set — a NEW uncovered edge cannot enroll through
 * regeneration and stays a blocking finding until the edge is covered.
 */
import { describe, expect, it } from 'vitest';
import { shrinkOnlyCompositionBaseline } from '../../../../packages/cli/src/internal/repo-ir-gauntlet.js';

const A = 'packages/x/src/a.ts -> packages/y/src/b.ts via fn';
const B = 'packages/x/src/c.ts -> packages/y/src/d.ts via gn';
const NEW = 'packages/x/src/e.ts -> packages/y/src/f.ts via hn';

describe('shrinkOnlyCompositionBaseline', () => {
  it('bootstrap (no existing ledger) enumerates the whole uncovered set, sorted', () => {
    expect(shrinkOnlyCompositionBaseline(undefined, [B, A])).toEqual([A, B]);
  });

  it('a NEW uncovered edge can NEVER enroll through regeneration (the anti-weakening law)', () => {
    // The weakening class: regen replacing the ledger with the full current
    // uncovered set would downgrade the new edge to advisory in the same run.
    expect(shrinkOnlyCompositionBaseline([A, B], [A, B, NEW])).toEqual([A, B]);
  });

  it('a covered entry leaves the ledger on regeneration (the shrink)', () => {
    expect(shrinkOnlyCompositionBaseline([A, B], [B])).toEqual([B]);
  });

  it('shrink and refusal compose: covered entries drop while new edges still cannot enter', () => {
    expect(shrinkOnlyCompositionBaseline([A, B], [B, NEW])).toEqual([B]);
  });
});
