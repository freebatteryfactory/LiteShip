/**
 * @liteship beat contract family — declaration-only types spanning the
 * beat-projection pipeline (CUT A5). One home, two stages, two unit spaces:
 *
 *   1. {@link BeatMarkerSet}  — raw asset/sample-space projection produced by
 *      `@liteship/assets` (`BeatMarkerProjection` / `detectBeats`). This is the
 *      contract carried by the `asset:beats` capability.
 *   2. {@link BeatComponent}  — scene/world timeline-space marker consumed by
 *      `@liteship/scene` (`bindBeats` / `scene.beat-binding`).
 *   3. {@link BeatSpawn}      — the ECS spawn descriptor wrapping a resolved
 *      {@link BeatComponent}.
 *
 * The sample-index → millisecond resolution between stages 1 and 2 is a
 * scene-owned transform (`resolveBeatProjectionToSceneBeats`), described by
 * {@link BeatProjectionResolutionInput}. These types carry no runtime
 * behavior — `@liteship/assets` and `@liteship/scene` alias their public names to
 * them so the shape lives in exactly one place.
 */

/**
 * Raw beat-marker projection — asset/sample space.
 *
 * Produced by `@liteship/assets`. `beats` are strictly-increasing **sample
 * indices** (not milliseconds); convert with the source audio's sample rate.
 * This is the shape the `asset:beats` capability carries.
 */
export interface BeatMarkerSet {
  /** Detected tempo estimate, in beats per minute. */
  readonly bpm: number;
  /** Beat positions as strictly-increasing sample indices. */
  readonly beats: readonly number[];
}

/**
 * Scene/world beat marker — timeline space.
 *
 * Consumed by `@liteship/scene`; what `SyncSystem` queries via `world.query('Beat')`.
 */
export interface BeatComponent {
  /** Discriminant tag — Beat-typed ECS component. */
  readonly _tag: 'beat';
  /** Beat time in **milliseconds** from scene start. */
  readonly timeMs: number;
  /** Normalized beat strength. */
  readonly strength: number;
  /** Optional pointer back to the audio source track that anchored this beat. */
  readonly anchorTrackId?: string;
}

/** ECS spawn descriptor — one per resolved {@link BeatComponent}. */
export interface BeatSpawn {
  readonly components: BeatComponent;
}

/**
 * Input contract for the projection → scene-beats resolver
 * (`resolveBeatProjectionToSceneBeats`, owned by `@liteship/scene`).
 *
 * The resolver is the official bridge between the two stages: it converts
 * each sample index to milliseconds (`timeMs = index / sampleRate * 1000`),
 * preserves order and count, and stamps a deterministic strength.
 */
export interface BeatProjectionResolutionInput {
  /** Raw asset-space projection to resolve. */
  readonly projection: BeatMarkerSet;
  /** Sample rate of the source audio, in Hz — converts indices to milliseconds. */
  readonly sampleRate: number;
  /** Optional anchor track id stamped onto every resolved marker. */
  readonly anchorTrackId?: string;
  /** Strength assigned to every resolved marker; defaults to 1. */
  readonly defaultStrength?: number;
}
