// GENERATED — do not edit by hand
// All four sceneComposition checks for 'scene.beat-binding' are not-applicable for the
// documented reason below — deliberately no skipped-test placeholder (which
// would ship unwired work green) and no silent omission. The exemption is PINNED by a
// real premise guard so it cannot silently go stale. Reason:
//   'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
import { describe, it, expect } from 'vitest';
import { beatBindingCapsule } from '../../packages/scene/src/capsules/beat-binding.js';

describe('scene.beat-binding', () => {
  // Non-emitted / EXEMPTED checks (documented):
  //  - determinism (unit lane): EXEMPTED — not-applicable. 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
  //  - sync-accuracy (unit lane): EXEMPTED — not-applicable. 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
  //  - invariant-preservation (unit lane): EXEMPTED — not-applicable. 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.
  //  - per-frame-budget (bench lane): EXEMPTED — not-applicable. 'scene.beat-binding' is a sceneComposition-tagged capsule with no registered scene driver — it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.

  it('exemption premise holds: sceneComposition capsule exposes no tickable scene', () => {
    const cap = beatBindingCapsule as { _kind?: unknown; tracks?: unknown; fps?: unknown };
    // It IS a sceneComposition capsule (so the four checks nominally apply)...
    expect(cap._kind).toBe('sceneComposition');
    // ...but it carries NO scene-runtime contract surface (no tracks / fps), so
    // there is no frame stream / playback / audio-video pair / per-frame loop to
    // drive. That absence is exactly what makes the four checks not-applicable.
    // If this capsule ever gains a driveable scene, this guard fails RED and the
    // exemption must be replaced by a wired driver.
    expect(cap.tracks).toBeUndefined();
    expect(cap.fps).toBeUndefined();
  });
});
