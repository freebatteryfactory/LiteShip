/**
 * @czap/scene type spine -- phantom-kinded TrackId brand plus the
 * timeline-mark and authoring-sugar contract types (BeatHandle,
 * FrameMark, envelopes, ease tags) consumed by track from/to fields.
 *
 * TrackId is parameterized by the kind of track it identifies. This bars
 * cross-kind references at compile time -- e.g. syncTo.beat(videoTrackId)
 * becomes a type error because TrackId<'video'> is not assignable to
 * TrackId<'audio'>.
 *
 * Spec 1 §5.3 promised typed cross-references between track declarations
 * and sync helpers; phantom-kind branding delivers it. Spec 1 §5.1/§5.4
 * promised Beat()-addressable track ranges, envelope automation, and a
 * closed named-easing catalog; the FrameMark/envelope/ease types below
 * are the canonical declarations the scene package mirrors.
 */

declare const TrackIdBrand: unique symbol;

/** Closed set of track kinds. */
export type TrackKind = 'video' | 'audio' | 'transition' | 'effect';

/**
 * Branded track identifier, keyed by track kind.
 *
 * The phantom parameter `K` is encoded in the brand symbol's value so
 * `TrackId<'video'>` and `TrackId<'audio'>` are distinct nominal types.
 * Cross-kind assignment fails at compile time.
 */
export type TrackId<K extends TrackKind> = string & {
  readonly [TrackIdBrand]: K;
};

/**
 * Beat handle produced by `Beat(count)` — a musical position the scene
 * compiler resolves to a frame index using the scene's BPM + fps.
 * Spec 1 §5.4: "scene BPM converts Beat(n) → Millis at compile time".
 */
export interface BeatHandle {
  /** Discriminant tag. */
  readonly _t: 'beat';
  /** Number of beats (may be fractional). */
  readonly count: number;
}

/**
 * Deferred sum of frame-space and beat-space offsets. Produced by
 * `addFrameMarks` when a beat mark and a numeric frame mark are
 * combined (e.g. `Scene.include(sub, { offset: Beat(8) })` over a
 * sub-scene authored in raw frames). Resolved by `compileScene` as
 * `frames + resolveBeat(Beat(beats), { bpm, fps })`.
 */
export interface FrameMarkSum {
  /** Discriminant tag. */
  readonly _t: 'mark-sum';
  /** Frame-space portion of the mark. */
  readonly frames: number;
  /** Beat-space portion of the mark, resolved against scene BPM/fps at compile time. */
  readonly beats: number;
}

/**
 * Timeline mark accepted by track `from` / `to` fields and
 * `Scene.include` offsets: a raw frame index, a `Beat(n)` handle, or a
 * deferred frame+beat sum. `compileScene` normalizes every mark to a
 * numeric frame index (via the scene's BPM + fps) before invariants run.
 */
export type FrameMark = number | BeatHandle | FrameMarkSum;

/** Fade envelope (linear over a beat span). Authored via `fade.in` / `fade.out`. */
export interface FadeEnvelope {
  /** Discriminant tag. */
  readonly _t: 'envelope';
  /** Curve kind — linear-in or linear-out. */
  readonly curve: 'linear-in' | 'linear-out';
  /** Duration of the fade in beats. */
  readonly span: BeatHandle;
}

/** Pulse envelope (periodic, amplitude-scaled). Authored via `pulse.every`. */
export interface PulseEnvelope {
  /** Discriminant tag. */
  readonly _t: 'envelope';
  /** Curve kind — pulse. */
  readonly curve: 'pulse';
  /** Period of the pulse in beats. */
  readonly period: BeatHandle;
  /** Peak amplitude (0–1 range, may exceed 1 for overdrive). */
  readonly amplitude: number;
}

/** Track envelope union — the optional automation curve a track may declare. */
export type TrackEnvelope = FadeEnvelope | PulseEnvelope;

/**
 * Compile-time-resolved envelope — the `Envelope` ECS component shape
 * emitted by `compileScene`. Beat spans are pre-resolved to frame
 * counts so the per-tick read stays arithmetic-only (ADR-0002).
 */
export type ResolvedEnvelope =
  | {
      /** Curve kind — linear-in or linear-out. */
      readonly curve: 'linear-in' | 'linear-out';
      /** Fade span in frames. */
      readonly spanFrames: number;
    }
  | {
      /** Curve kind — pulse. */
      readonly curve: 'pulse';
      /** Pulse period in frames. */
      readonly periodFrames: number;
      /** Peak amplitude above the 1.0 baseline. */
      readonly amplitude: number;
    };

/** Closed set of parameterless named easings (Spec 1 §5.4 catalog). */
export type EaseName = 'cubic' | 'spring' | 'bounce';

/**
 * Serializable ease reference stored on a TransitionTrack and emitted
 * as the `Ease` ECS component. Names — not functions — keep the
 * compiled scene pure data (content-addressable, dense-store-safe).
 * `{ stepped: n }` carries the step count for the `ease.stepped(n)` factory.
 */
export type EaseTag = EaseName | { readonly stepped: number };
