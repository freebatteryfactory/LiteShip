/**
 * Beat-projection bridge — the official transform from a raw asset-space
 * `BeatMarkerSet` (bpm + sample indices) into scene-space
 * {@link BeatComponent}[] (millisecond markers) ready to drop onto
 * `SceneContract.beats` ahead of {@link compileScene}.
 *
 * This is the pipe between two pipeline stages that used to be crossed by
 * hand at every call site:
 *
 *   `@czap/assets`  decoded audio → BeatMarkerSet (sample indices)
 *   `@czap/scene`   ← THIS BRIDGE →  BeatComponent[] (timeMs)
 *   `@czap/scene`   BeatComponent[] → BeatSpawn[] → ECS Beat entities
 *
 * Scene-owned because the output is scene-domain data; it depends only on the
 * shared `@czap/_spine` contract, never on `@czap/assets`, so it introduces no
 * `scene → assets` edge. Pure: it neither mutates its input nor performs I/O.
 *
 * @module
 */

import type { BeatComponent, BeatProjectionResolutionInput } from '@czap/_spine';
import { ValidationError } from '@czap/error';

/**
 * Resolve a raw beat-marker projection into scene-ready beat components.
 *
 * Each sample index becomes a millisecond timestamp via
 * `timeMs = sampleIndex / sampleRate * 1000`. Order and count are preserved
 * (one component per input beat), every marker is tagged `kind: 'beat'`, and
 * `strength` is stamped deterministically (defaults to 1). When `anchorTrackId`
 * is supplied it is carried onto every marker; otherwise the field is omitted.
 *
 * @throws RangeError if `sampleRate` is not a positive, finite number — a
 * zero/negative/NaN rate cannot define a timeline, so we fail loudly rather
 * than emit `Infinity`/`NaN` beat times.
 */
export function resolveBeatProjectionToSceneBeats(input: BeatProjectionResolutionInput): readonly BeatComponent[] {
  const { projection, sampleRate, anchorTrackId, defaultStrength = 1 } = input;

  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw ValidationError(
      'resolveBeatProjectionToSceneBeats',
      `sampleRate must be a positive, finite number — got ${String(sampleRate)}. Pass the sample rate of the decoded audio asset that produced this BeatMarkerSet (typically 44100 or 48000), e.g. resolveBeatProjectionToSceneBeats({ projection, sampleRate: asset.sampleRate }).`,
    );
  }

  return projection.beats.map((sampleIndex) => {
    const marker: BeatComponent = {
      kind: 'beat',
      timeMs: (sampleIndex / sampleRate) * 1000,
      strength: defaultStrength,
      ...(anchorTrackId !== undefined ? { anchorTrackId } : {}),
    };
    return marker;
  });
}
