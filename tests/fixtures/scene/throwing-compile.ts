/** Fixture: exports a sceneComposition capsule + contract, but the
 * compileScene function throws — exercises scene-compile's try/catch
 * fallback path. */
import { defineCapsule, schema } from '@liteship/core';
import type { SceneContract } from '@liteship/scene';

export const broken = defineCapsule({
  _kind: 'sceneComposition',
  name: 'fixture.broken',
  input: schema.unknown,
  output: schema.unknown,
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
