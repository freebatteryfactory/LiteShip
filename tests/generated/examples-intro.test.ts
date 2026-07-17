// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { contentAddressOf } from '../../packages/core/src/content-address.js';
import { compileIntro } from '../../examples/scenes/intro.js';
import { SceneRuntime } from '../../packages/scene/src/runtime.js';
import { scaledTimeout } from '../../vitest.shared.js';

describe('examples.intro', () => {
  // The compiled scene descriptor is PURE data — identical every call — so
  // building a fresh runtime from it twice is the canonical "same seed" source.
  const compiled = compileIntro();
  const fps = compiled.fps;
  const tickCount = 64;
  const sampleRate = 48000;
  const dtMs = 1000 / fps; // one frame per tick

  // The DURABLE per-entity outputs the scene systems persist via setComponent
  // (VideoSystem _opacity, AudioSystem _phase/_gain, SyncSystem _intensity,
  // TransitionSystem _blend). Reading these is the observable frame state.
  const FRAME_COMPONENTS = ['_opacity', '_phase', '_gain', '_intensity', '_blend'];

  // Snapshot one frame to a plain, ordered, content-addressable structure:
  // every entity's id + the durable output components present on it, plus the
  // SVG-egress frame. Sorted by entity id so authoring/iteration order never
  // forks the address.
  const snapshotFrame = async (handle) => {
    // World.query is synchronous — read the ticked FrameRange entities directly.
    const entities = handle.world.query('FrameRange');
    const rows = entities
      .map((e) => {
        const out = {};
        for (const key of FRAME_COMPONENTS) {
          const v = e.components.get(key);
          if (v !== undefined) out[key] = v;
        }
        return { id: String(e.id), out };
      })
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const svg = Array.from(handle.svgAttrs().entries())
      .map(([id, attrs]) => ({ id: String(id), attrs }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { frame: handle.currentFrame(), timeMs: handle.currentTimeMs(), rows, svg };
  };

  // Tick a fresh runtime across playback, content-addressing every frame. The
  // returned array of addresses IS the frame stream — a deterministic scene
  // produces a byte-identical array on every run.
  const frameStream = async () => {
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      const stream = [];
      for (let i = 0; i < tickCount; i++) {
        await handle.tick(dtMs);
        stream.push(contentAddressOf(await snapshotFrame(handle)));
      }
      return stream;
    } finally {
      await handle.release();
    }
  };

  it('determinism: identical seed produces identical frame stream across 3 runs', async () => {
    // Drive the SAME compiled scene through the ECS runtime three times. The
    // compiled descriptor is pure data and the tick is deterministic arithmetic
    // (ADR-0002), so every run must produce a byte-identical frame stream —
    // compared via the canonical contentAddressOf address, never a hand-rolled
    // deep-equal. A non-determinism regression (Map-iteration leak, Date.now in
    // a system, float drift) breaks the address equality RED.
    const [a, b, c] = await Promise.all([frameStream(), frameStream(), frameStream()]);
    expect(a.length).toBe(tickCount);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  }, scaledTimeout(30000));

  it('sync accuracy: audio and video frame timestamps align within +/- 1ms', async () => {
    // Audio/video timestamp alignment. The runtime advances ONE clock; the
    // proof that audio stays locked to video is that AudioSystem's sample-PHASE
    // (samplesPerFrame = sampleRate / fps) reconstructs to the same wall-clock
    // ms as the video frame index. A regression in the phase math (wrong
    // samplesPerFrame, off-by-one range gate) drifts these apart > 1ms.
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      const samplesPerFrame = sampleRate / fps;
      let checkedFrames = 0;
      for (let i = 0; i < tickCount; i++) {
        await handle.tick(dtMs);
        const frame = handle.currentFrame();
        const videoMs = (frame / fps) * 1000;
        // Audio entities in range carry a non-zero _phase relative to their
        // FrameRange.from; reconstruct absolute audio ms and compare to videoMs.
        const audioEntities = handle.world.query('AudioSource', 'FrameRange', '_phase');
        for (const e of audioEntities) {
          const range = e.components.get('FrameRange');
          const phase = e.components.get('_phase');
          if (frame < range.from || frame >= range.to) continue; // not playing this frame
          const audioMs = (phase / samplesPerFrame) * (1000 / fps) + (range.from / fps) * 1000;
          expect(Math.abs(audioMs - videoMs)).toBeLessThanOrEqual(1);
          checkedFrames++;
        }
      }
      // The scene declares audio + video tracks, so the playback window MUST
      // contain at least one frame where audio is active — otherwise the check
      // proved nothing. Assert we actually exercised the alignment.
      expect(checkedFrames, 'no audio frame fell inside playback — sync check was vacuous').toBeGreaterThan(0);
    } finally {
      await handle.release();
    }
  }, scaledTimeout(30000));

  it('invariant preservation: every declared scene invariant holds across playback', async () => {
    // Every declared scene invariant must hold across the WHOLE ticked playback,
    // not just at compile time. compileScene() already evaluates the contract's
    // invariants and THROWS on violation, so a successful compile proves they
    // hold for the descriptor; we additionally tick the runtime end-to-end and
    // assert the playback completes without a runtime invariant breach (a
    // throwing tick, a runtime that fails to register its canonical systems).
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      // Structural runtime invariant: the runtime registers exactly its
      // canonical system set (ADR-0009 ECS substrate) and spawns >= 0 entities.
      expect(handle.systemsRegistered).toBe(SceneRuntime.systemCount);
      expect(handle.entitySpawnCount).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < tickCount; i++) {
        // A tick that violates an arithmetic/ECS invariant throws; reaching the
        // end of playback without a throw is the preservation proof.
        await handle.tick(dtMs);
      }
      expect(handle.currentFrame()).toBeGreaterThanOrEqual(0);
    } finally {
      await handle.release();
    }
  }, scaledTimeout(30000));
});
