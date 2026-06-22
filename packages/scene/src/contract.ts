/**
 * Scene contract — typed declaration shape for a sceneComposition capsule.
 * Track helpers in `track.ts` produce values of these shapes.
 *
 * Track interfaces are generic over the mark type `M`: authoring-time
 * contracts default to {@link FrameMark} (`number | BeatHandle | FrameMarkSum`,
 * Spec 1 §5.1 — `from: Beat(0), to: Beat(8)`), while `compileScene`
 * normalizes everything to `number` before invariants run — see
 * {@link ResolvedSceneContract}.
 *
 * @module
 */

import type { Site } from '@czap/core';
import type {
  TrackId as _TrackId,
  TrackKind as _TrackKind,
  FrameMark as _FrameMark,
  TrackEnvelope,
  EaseTag,
} from '@czap/_spine';
import type { BeatBinding } from './capsules/beat-binding.js';

/** Closed set of track kinds. */
export type TrackKind = _TrackKind;

/**
 * Phantom-kinded track identifier — `K` discriminates between video,
 * audio, transition, and effect. Cross-kind assignment fails at compile
 * time, so e.g. `syncTo.beat(videoId)` is a type error.
 */
export type TrackId<K extends TrackKind> = _TrackId<K>;

/**
 * Timeline mark accepted by track `from` / `to` fields: a raw frame
 * index, a `Beat(n)` handle resolved against scene BPM/fps at compile
 * time, or a deferred frame+beat sum (see `sugar/beat.ts`).
 */
export type FrameMark = _FrameMark;

/** Video track — renders a quantizer-driven source for its frame range. */
export interface VideoTrack<M extends FrameMark = FrameMark> {
  readonly _tag: 'video';
  readonly id: TrackId<'video'>;
  readonly from: M;
  readonly to: M;
  /**
   * Opaque source reference, carried verbatim onto the `VideoSource`
   * ECS component — the scene engine never interprets it (VideoSystem
   * only checks presence). Hand it whatever YOUR renderer reads:
   * typically a quantizer-driven source descriptor, an asset id, or a
   * canvas/element reference.
   *
   * @example
   * Track.video('hero', { from: 0, to: 120, source: { _t: 'quantizer', id: 'hero-boundary' } })
   */
  readonly source: unknown;
  readonly layer?: number;
  /** Optional opacity automation — e.g. `fade.in(Beat(1))`. Compiled to an `Envelope` component VideoSystem reads each tick. */
  readonly envelope?: TrackEnvelope;
}

/** Audio track — plays an asset with optional mix metadata. */
export interface AudioTrack<M extends FrameMark = FrameMark> {
  readonly _tag: 'audio';
  readonly id: TrackId<'audio'>;
  readonly from: M;
  readonly to: M;
  readonly source: string;
  readonly mix?: {
    /**
     * Linear gain multiplier — 1 is unity (asset plays at its authored
     * level), 0 is silence. Mixers multiply this by the envelope-driven
     * `_gain` factor each tick (see `systems/audio.ts`).
     * @defaultValue 1
     */
    readonly volume?: number;
    /** Stereo position, -1 (left) .. 1 (right). @defaultValue 0 */
    readonly pan?: number;
    readonly sync?: { readonly bpm?: number };
  };
  /** Optional gain automation — e.g. `fade.out(Beat(2))`. Compiled to an `Envelope` component AudioSystem reads each tick (written as `_gain`). */
  readonly envelope?: TrackEnvelope;
}

/** Transition track — blends two video tracks across a frame window. */
export interface TransitionTrack<M extends FrameMark = FrameMark> {
  readonly _tag: 'transition';
  readonly id: TrackId<'transition'>;
  readonly from: M;
  readonly to: M;
  readonly transitionKind: 'crossfade' | 'swipe.left' | 'swipe.right' | 'zoom.in' | 'zoom.out' | 'cut';
  readonly between: readonly [TrackId<'video'>, TrackId<'video'>];
  /** Optional named easing applied to the blend curve — e.g. `ease: 'cubic'` or `ease: { stepped: 8 }`. Closed catalog (Spec 1 §5.4). */
  readonly ease?: EaseTag;
}

/** Effect track — applies an intensity curve to a target video track, optionally synced to audio. */
export interface EffectTrack<M extends FrameMark = FrameMark> {
  readonly _tag: 'effect';
  readonly id: TrackId<'effect'>;
  readonly from: M;
  readonly to: M;
  readonly effectKind: 'pulse' | 'glow' | 'shake' | 'zoom' | 'desaturate';
  readonly target: TrackId<'video'>;
  readonly syncTo?: { readonly anchor: TrackId<'audio'>; readonly mode: 'beat' | 'onset' | 'peak' };
  /** Optional intensity automation — e.g. `pulse.every(Beat(0.5), { amplitude: 0.3 })`. Compiled to an `Envelope` component EffectSystem reads each tick. */
  readonly envelope?: TrackEnvelope;
}

/** Track union — closed set of four helper-produced shapes. */
export type Track<M extends FrameMark = FrameMark> =
  | VideoTrack<M>
  | AudioTrack<M>
  | TransitionTrack<M>
  | EffectTrack<M>;

/**
 * Scene invariant — evaluated against the contract at compile time.
 * `compileScene` runs every declared check; a check returning `false`
 * (or throwing) is a violation, and all violations are reported in one
 * `ValidationError` carrying each invariant's name and message.
 *
 * The check receives the {@link ResolvedSceneContract} — track `from` /
 * `to` are plain frame numbers because `compileScene` resolves every
 * `Beat()` mark BEFORE invariants run. Arithmetic such as
 * `t.to <= frames` is therefore always sound; never read marks off the
 * raw authoring contract inside a check.
 */
export interface SceneInvariant {
  readonly name: string;
  readonly check: (scene: ResolvedSceneContract) => boolean;
  readonly message: string;
}

/**
 * Pre-resolved beat marker on a {@link SceneContract}. Aliased to
 * `BeatBinding.Component` from `./capsules/beat-binding.ts` — single
 * source of truth so adding a field (e.g. `pitch`) doesn't require
 * keeping two structurally-identical declarations in sync.
 */
export type SceneBeat = BeatBinding.Component;

/**
 * Top-level scene contract — typed declaration shape for an entire
 * composition. Only `name`, `fps`, `bpm`, and `tracks` are required;
 * `compileScene` fills the documented defaults for the rest, so a
 * hello-world scene never declares layer-4 audit/ship concepts.
 */
export interface SceneContract<M extends FrameMark = FrameMark> {
  readonly name: string;
  /**
   * Scene duration in milliseconds.
   * @defaultValue derived from the tracks — max resolved `to` / fps * 1000
   */
  readonly duration?: number;
  readonly fps: number;
  readonly bpm: number;
  /** Optional render width in pixels. Render hosts fall back to 1280 when absent. */
  readonly width?: number;
  /** Optional render height in pixels. Render hosts fall back to 720 when absent. */
  readonly height?: number;
  readonly tracks: readonly Track<M>[];
  /** Compile-time checks. @defaultValue [] (no declared checks) */
  readonly invariants?: readonly SceneInvariant[];
  /** Performance budgets. @defaultValue { p95FrameMs: 1000 / fps } (one frame budget) */
  readonly budgets?: { readonly p95FrameMs: number; readonly memoryMb?: number };
  /** Deployment sites the scene targets. @defaultValue ['node', 'browser'] */
  readonly site?: readonly Site[];
  /**
   * Optional pre-resolved beat markers. When present, the scene
   * compiler propagates them onto the {@link CompiledScene} and the
   * runtime spawns one Beat entity per marker before systems are
   * registered. SyncSystem queries the world for `Beat` components
   * each tick to compute beat-decay intensity.
   */
  readonly beats?: readonly SceneBeat[];
}

/**
 * A scene contract whose timeline marks have all been resolved to
 * numeric frame indices — what `compileScene` hands to every declared
 * {@link SceneInvariant} (and what `componentsFromTrack` reads when
 * emitting `FrameRange` components). The optional authoring fields are
 * required here: `compileScene` fills their documented defaults before
 * invariants run, so checks like `t.to <= (s.duration / 1000) * s.fps`
 * never see `undefined`.
 */
export type ResolvedSceneContract = SceneContract<number> & {
  readonly duration: number;
  readonly invariants: readonly SceneInvariant[];
  readonly budgets: { readonly p95FrameMs: number; readonly memoryMb?: number };
  readonly site: readonly Site[];
};
