// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
import { bench, expect } from 'vitest';
import { beatBindingCapsule } from '../../packages/scene/src/capsules/beat-binding.js';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'scene.beat-binding' has no compileScene-able
// scene to tick — no frame stream / per-frame loop to time. This is a real
// PREMISE GUARD with TEETH: it asserts the STRUCTURAL absence that makes a
// per-frame bench not-applicable. If this capsule ever gains a driveable scene
// (tracks / fps), the guard fails RED, forcing a real per-frame bench.
bench('scene.beat-binding — bench not-applicable (premise guard)', () => {
  const cap = beatBindingCapsule as { _kind?: unknown; tracks?: unknown; fps?: unknown };
  expect(cap._kind).toBe('sceneComposition');
  expect(cap.tracks).toBeUndefined();
  expect(cap.fps).toBeUndefined();
}, { time: 50 });
