/** Fixture: exports a sceneComposition capsule + contract + a compile function
 * that returns a plain descriptor value. scene-compile invokes the compile fn for
 * its side effect and produces the receipt from the contract. (Wave 8: replaces the
 * old effect-compile fixture — no Effect; the legacy Effect-return path is retired.) */
import { defineCapsule, schema } from '@liteship/core';
import type { SceneContract } from '@liteship/scene';

export const fx = defineCapsule({
  _kind: 'sceneComposition',
  name: 'fixture.value',
  input: schema.unknown,
  output: schema.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [],
  budgets: { p95Ms: 1 },
  site: ['node'],
});

export const contract: SceneContract = {
  name: 'value-fixture',
  duration: 100,
  fps: 60,
  bpm: 120,
  tracks: [],
  invariants: [],
  budgets: { p95FrameMs: 16 },
  site: ['node'],
};

export function compile(): number {
  return 42;
}
