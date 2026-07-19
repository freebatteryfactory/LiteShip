import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, S } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';
import * as Harness from '@liteship/core/harness';

/**
 * Lane-aware sceneComposition harness contract (LAWS, not implementation
 * strings):
 *
 *  - With NO resolved scene driver, the capsule has no tickable scene, so all
 *    four checks become TYPED not-applicable exemptions — NEVER an it.skip. The
 *    file still parses and (when a binding is importable) pins the exemption
 *    premise with a real guard.
 *  - With a resolved scene driver, the 3 pure checks (determinism, sync,
 *    invariant-preservation) are emitted as REAL `it(...)` blocks in the UNIT
 *    lane (.test.ts), and the per-frame budget is emitted as a REAL `bench(...)`
 *    in the BENCH lane (.bench.ts). The unit file drives SceneRuntime + the
 *    canonical contentAddressOf; it never contains a `bench(`. No `it.skip`
 *    appears in either lane under any branch.
 */
describe('generateSceneComposition (lane-aware)', () => {
  beforeEach(() => resetCapsuleCatalog());

  const sceneCap = (name: string, budgets: Record<string, unknown> = { p95Ms: 16 }) =>
    defineCapsule({
      _kind: 'sceneComposition',
      name,
      input: S.unknown,
      output: S.unknown,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets,
      site: ['node', 'browser'],
    });

  const driver = {
    compileName: 'compileDemo',
    compileImport: '../../examples/scenes/demo.js',
    capsuleName: 'demo',
    capsuleImport: '../../examples/scenes/demo.js',
    runtimeImport: '../../packages/scene/src/runtime.js',
    contentAddressImport: '../../packages/core/src/content-address.js',
    hasAudio: true,
    hasVideo: true,
  } as const;

  it('NEVER emits an it.skip — neither lane, with or without a driver', () => {
    const noDriver = Harness.generateSceneComposition(sceneCap('demo.noDriver'), {
      bindingImport: '../../packages/scene/src/capsules/demo.js',
      bindingName: 'demoCapsule',
    });
    const withDriver = Harness.generateSceneComposition(sceneCap('demo.intro'), {
      sceneDriver: driver,
    });
    for (const out of [noDriver, withDriver]) {
      expect(out.testFile).not.toMatch(/\b(it|test|describe)\.skip\(/);
      expect(out.benchFile).not.toMatch(/\b(it|test|describe)\.skip\(/);
    }
  });

  it('with a driver: 3 real unit it() blocks driving the ECS runtime + canonical address', () => {
    const { testFile } = Harness.generateSceneComposition(sceneCap('demo.intro'), {
      sceneDriver: driver,
    });
    // Three real unit-lane checks, emitted as it(...) — not it.skip, not a stub.
    expect(testFile).toContain("it('determinism");
    expect(testFile).toContain("it('sync accuracy");
    expect(testFile).toContain("it('invariant preservation");
    // Drives the REAL runtime + reuses the canonical content-address kernel.
    expect(testFile).toContain('SceneRuntime.build');
    expect(testFile).toContain('contentAddressOf');
    expect(testFile).toContain("from '" + driver.compileImport + "'");
    // Unit lane carries no bench — that is the bench lane's job.
    expect(testFile).not.toContain('bench(');
  });

  it('with a driver: the per-frame budget is a REAL bench in the bench lane', () => {
    const { benchFile } = Harness.generateSceneComposition(sceneCap('demo.intro'), {
      sceneDriver: driver,
    });
    expect(benchFile).toContain('bench(');
    expect(benchFile).toContain('demo.intro — per-frame tick');
    // Budget read from the capsule binding at runtime — the source of truth,
    // not a static literal.
    expect(benchFile).toContain('budgets?.p95Ms');
    expect(benchFile).toContain('SceneRuntime.build');
  });

  it('sync-accuracy is a typed not-applicable exemption when the scene lacks audio', () => {
    const audioless = { ...driver, hasAudio: false };
    const { testFile } = Harness.generateSceneComposition(sceneCap('demo.silent'), {
      sceneDriver: audioless,
    });
    // determinism + invariant still real; sync recorded as a documented exemption.
    expect(testFile).toContain("it('determinism");
    expect(testFile).toContain("it('invariant preservation");
    expect(testFile).not.toContain("it('sync accuracy");
    expect(testFile).toContain('sync-accuracy');
    expect(testFile.toLowerCase()).toContain('not-applicable');
    expect(testFile).not.toMatch(/\b(it|test|describe)\.skip\(/);
  });

  it('no driver: a real premise-guard test pins the exemption (no empty suite)', () => {
    const { testFile, benchFile } = Harness.generateSceneComposition(sceneCap('demo.preRuntime'), {
      bindingImport: '../../packages/scene/src/capsules/demo.js',
      bindingName: 'demoCapsule',
      sceneDriverNotApplicableReason: 'pre-runtime transform — no tracks',
    });
    // A real it() guard so the file is a valid, passing suite — not an empty
    // file that would error the runner — and the exemption can't go stale.
    expect(testFile).toContain('describe(');
    expect(testFile).toContain("it('exemption premise holds");
    expect(testFile).toContain('demoCapsule');
    expect(testFile.toLowerCase()).toContain('not-applicable');
    expect(testFile).not.toMatch(/\b(it|test|describe)\.skip\(/);
    // Bench lane records the typed exemption with a machine-readable marker +
    // a real premise-guard `bench()` body (never a comment-only stub, never a
    // bench.skip) so a gate can tell it from a lazy placeholder.
    expect(benchFile).toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile.toLowerCase()).toContain('not-applicable');
    expect(benchFile).toContain('bench(');
    expect(benchFile).not.toContain('bench.skip');
    // The premise guard has TEETH: it imports the binding and asserts the
    // STRUCTURAL absence (no tracks / fps) — NOT a vacuous typeof-string vanity.
    expect(benchFile).toContain('demoCapsule');
    expect(benchFile).toContain("expect(cap._kind).toBe('sceneComposition')");
    expect(benchFile).toContain('expect(cap.tracks).toBeUndefined()');
    expect(benchFile).toContain('expect(cap.fps).toBeUndefined()');
    expect(benchFile).not.toContain(".toBe('string')");
  });

  it('exposes the lane model: SCENE_CHECKS tags each check with its lane', () => {
    const ids = Harness.SCENE_CHECKS.map((c) => c.id);
    expect(ids).toContain('determinism');
    expect(ids).toContain('sync-accuracy');
    expect(ids).toContain('invariant-preservation');
    expect(ids).toContain('per-frame-budget');
    const laneOf = (id: string) => Harness.SCENE_CHECKS.find((c) => c.id === id)?.lane;
    // The pure checks run in the unit lane; the budget runs in the bench lane.
    expect(laneOf('determinism')).toBe('unit');
    expect(laneOf('sync-accuracy')).toBe('unit');
    expect(laneOf('invariant-preservation')).toBe('unit');
    expect(laneOf('per-frame-budget')).toBe('bench');
  });
});
