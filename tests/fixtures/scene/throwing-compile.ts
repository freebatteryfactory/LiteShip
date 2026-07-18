/** Fixture: exports a sceneComposition capsule + contract, but the
 * compileScene function throws — exercises scene-compile's try/catch
 * fallback path. */
import { defineCapsule, S } from '@czap/core';
import type { SceneContract } from '@czap/scene';

export const broken = defineCapsule({
  _kind: 'sceneComposition',
  name: 'fixture.broken',
  input: S.unknown,
  output: S.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [],
  budgets: { p95Ms: 1 },
  site: ['node'],
});

export const contract: SceneContract = {
  name: 'broken-fixture',
  duration: 100,
  fps: 60,
  bpm: 120,
  tracks: [],
  invariants: [],
  budgets: { p95FrameMs: 16 },
  site: ['node'],
};

export function compileBroken(): never {
  throw new Error('boom from compile fixture');
}
