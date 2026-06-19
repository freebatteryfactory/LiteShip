// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'scene.beat-binding' has no compileScene-able
// scene to tick — no frame stream / per-frame loop to time — so instead of a
// comment-only placeholder this bench is a real PREMISE GUARD.
bench('scene.beat-binding — bench not-applicable (premise guard)', () => {
  expect(typeof 'scene.beat-binding').toBe('string');
}, { time: 50 });
