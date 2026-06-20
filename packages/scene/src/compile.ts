/**
 * Scene compiler — translates a {@link SceneContract} into a pure
 * {@link CompiledScene} descriptor: track spawns + per-track component
 * seeds, plus name/duration/fps/bpm carried across so the runtime can
 * derive frame indices.
 *
 * Beat-mark resolution happens HERE (Spec 1 §5.4: "scene BPM converts
 * Beat(n) → Millis at compile time"): every track `from` / `to` written
 * as a {@link FrameMark} is normalized to a numeric frame index via the
 * scene's BPM + fps BEFORE invariants are evaluated, so checks doing
 * arithmetic on track ranges always see plain numbers. Envelope spans
 * and ease tags are likewise resolved into pure-data `Envelope` /
 * `Ease` components so the per-tick systems stay arithmetic-only
 * (ADR-0002) and the descriptor stays content-addressable (ADR-0003).
 *
 * World construction is intentionally deferred to {@link SceneRuntime}
 * (see `./runtime.ts`). Previously this function wrapped a
 * `World.make()` in `Effect.scoped(...)` and returned the world AFTER
 * the scope closed — i.e. a dead world — and attached a
 * `registeredSystems: string[]` metadata field via an `as unknown`
 * cast WITHOUT ever calling `world.addSystem`. That theatre is gone:
 * compileScene is now a pure descriptor producer, and the runtime
 * registers the 7 canonical systems.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import { ValidationError } from '@czap/error';
import type { ResolvedSceneContract, SceneContract, Track, TrackId, TrackKind } from './contract.js';
import type { BeatBinding } from './capsules/beat-binding.js';
import { resolveFrameMark } from './sugar/beat.js';
import { resolveEnvelope } from './sugar/envelope.js';

/**
 * One compiled track — the components the runtime should spawn for it.
 * The `trackId` is preserved from the contract so downstream code can
 * cross-reference (e.g. transition `between` refs).
 */
export interface TrackSpawn {
  /** The phantom-kinded id of the source track. */
  readonly trackId: TrackId<TrackKind>;
  /** Component seed map passed to `world.spawn(...)` when {@link SceneRuntime} builds the ECS world. */
  readonly components: Readonly<Record<string, unknown>>;
}

/**
 * The descriptor produced by {@link compileScene}. Pure data —
 * no Effects, no scope, no world. Hand it to {@link SceneRuntime.build}
 * to obtain a live tickable handle.
 */
export interface CompiledScene {
  readonly name: string;
  readonly duration: number;
  readonly fps: number;
  readonly bpm: number;
  readonly trackSpawns: readonly TrackSpawn[];
  /**
   * Pre-computed beat markers (Task 9 wired these via the
   * `scene.beat-binding` sceneComposition capsule). Each entry becomes
   * a `Beat`-tagged ECS entity at runtime build time so SyncSystem can
   * query the world for beats instead of reading closure state.
   *
   * Empty for vanilla compile — scenes that need beat-driven sync
   * declare them via {@link SceneContract.beats} or pull from a
   * referenced BeatMarkerProjection asset.
   */
  readonly beats: readonly BeatBinding.Component[];
}

/**
 * Compile a {@link SceneContract} into a pure {@link CompiledScene}
 * descriptor. No world is constructed here — see {@link SceneRuntime}.
 *
 * The contract is normalized FIRST: every `Beat()` / frame-mark on a
 * track's `from` / `to` resolves to a numeric frame index using the
 * scene's `bpm` + `fps` (see `sugar/beat.ts`). Invariants run against
 * that {@link ResolvedSceneContract}, so checks like
 * `t.to <= (duration / 1000) * fps` always operate on numbers — never
 * on unresolved beat handles.
 *
 * Every declared {@link SceneInvariant} is evaluated against the
 * normalized contract before any compilation work happens. A check that
 * returns `false` — or throws — counts as a violation. ALL violations
 * are collected, then reported together in a single
 * {@link ValidationError} (module `'compileScene'`) listing each
 * violated invariant's name and message, so one compile run surfaces
 * every problem instead of stopping at the first.
 *
 * If the scene declares a `beats?` field, those beat markers are
 * propagated unchanged onto the compiled descriptor. The runtime
 * spawns one Beat-tagged entity per marker before registering systems
 * (see SceneRuntime.build) so SyncSystem can query them on the first
 * tick. Asset-derived beats (BeatMarkerProjection) are wired by feeding
 * the projection's output into `scene.beats` ahead of compile.
 *
 * Built-in structural checks run alongside the declared invariants:
 * fps must be positive and finite, every resolved range must run
 * forward (`from <= to`), and transition `between` refs must name
 * declared video tracks (unknown ids get a did-you-mean suggestion).
 * A track extending past an explicitly declared `duration` is reported
 * as a `track-past-duration` Diagnostics warning — truncation is legal
 * when intended — rather than failing the compile.
 *
 * @throws ValidationError when structural checks or declared scene
 * invariants fail — all problems are collected into one error.
 */
export function compileScene(scene: SceneContract): CompiledScene {
  const ctx = { bpm: scene.bpm, fps: scene.fps };
  const tracks = scene.tracks.map((track) => resolveTrackMarks(track, ctx));
  // Documented defaults (see SceneContract): duration derives from the
  // resolved track extents — which is why marks resolve FIRST — and the
  // frame budget from one frame at the scene's fps.
  const resolved: ResolvedSceneContract = {
    ...scene,
    tracks,
    duration: scene.duration ?? (tracks.reduce((max, t) => Math.max(max, t.to), 0) / scene.fps) * 1000,
    invariants: scene.invariants ?? [],
    budgets: scene.budgets ?? { p95FrameMs: 1000 / scene.fps },
    site: scene.site ?? ['node', 'browser'],
  };

  // Built-in structural checks — run after mark resolution so ranges and
  // refs are plain numbers/ids, collected alongside declared-invariant
  // violations so one compile run surfaces every problem.
  const structural: string[] = [];
  if (!Number.isFinite(resolved.fps) || resolved.fps <= 0) {
    structural.push(
      `scene fps must be a positive, finite number — got ${resolved.fps}; set fps to the intended output frame rate (e.g. 30 or 60)`,
    );
  }
  const videoIds = resolved.tracks.filter((t) => t.kind === 'video').map((t) => t.id as string);
  for (const track of resolved.tracks) {
    if (track.from > track.to) {
      structural.push(
        `track "${track.id}" resolves to from ${track.from} > to ${track.to} — swap the marks or fix the Beat() arithmetic so the range runs forward`,
      );
    }
    if (track.kind === 'transition') {
      for (const ref of track.between) {
        if (!videoIds.includes(ref)) {
          structural.push(
            `transition "${track.id}" blends between "${track.between[0]}" and "${track.between[1]}", but no video track with id "${ref}" exists${didYouMean(ref, videoIds)} — declare the video track first, or fix the id passed to Track.transition's between`,
          );
        }
      }
    }
  }

  // A track extending past an EXPLICITLY declared duration is truncation —
  // legitimate when intended, so it warns instead of failing the compile
  // (duration longer than the last track is trailing time, never flagged;
  // a derived duration cannot be overrun by construction).
  if (scene.duration !== undefined && Number.isFinite(resolved.fps) && resolved.fps > 0) {
    const durationFrames = (resolved.duration / 1000) * resolved.fps;
    for (const track of resolved.tracks) {
      if (track.to > durationFrames) {
        Diagnostics.warnOnce({
          source: 'czap/scene.compile',
          code: 'track-past-duration',
          message: `scene "${resolved.name}": track "${track.id}" extends to frame ${track.to} but the declared duration ${resolved.duration}ms ends at frame ${durationFrames} — the track will be truncated. Extend duration, shorten the track, or omit duration to derive it from the tracks.`,
        });
      }
    }
  }

  const violations: string[] = [];
  for (const invariant of resolved.invariants) {
    let holds = false;
    let thrown: string | undefined;
    try {
      holds = invariant.check(resolved);
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error);
    }
    if (!holds) {
      violations.push(
        thrown === undefined
          ? `"${invariant.name}" — ${invariant.message}`
          : `"${invariant.name}" — ${invariant.message} (check threw: ${thrown})`,
      );
    }
  }
  if (structural.length > 0 || violations.length > 0) {
    const parts: string[] = [];
    if (structural.length > 0) {
      parts.push(
        `has ${structural.length} structural problem${structural.length === 1 ? '' : 's'}: ${structural.join('; ')}`,
      );
    }
    if (violations.length > 0) {
      parts.push(
        `violated ${violations.length} invariant${violations.length === 1 ? '' : 's'}: ${violations.join('; ')}`,
      );
    }
    throw ValidationError(
      'compileScene',
      `scene "${resolved.name}" ${parts.join('; and ')}. Fix each listed problem (or the failing check), then compile again.`,
    );
  }

  const trackSpawns: TrackSpawn[] = resolved.tracks.map((track) => ({
    trackId: track.id,
    components: componentsFromTrack(track, ctx),
  }));

  // Defensive copy: callers may freeze, mutate, or reuse the input
  // beats array; the compiled descriptor owns its own sequence.
  const beats: readonly BeatBinding.Component[] =
    resolved.beats !== undefined ? resolved.beats.map((b) => ({ ...b })) : [];

  return {
    name: resolved.name,
    duration: resolved.duration,
    fps: resolved.fps,
    bpm: resolved.bpm,
    trackSpawns,
    beats,
  };
}

/**
 * Build a `(did you mean "x"?)` suffix for an unknown track ref by
 * Levenshtein distance over the known ids — suggestions only for near
 * misses (distance <= 2), the typo case worth teaching.
 */
function didYouMean(ref: string, knownIds: readonly string[]): string {
  let best: string | undefined;
  let bestDistance = 3;
  for (const id of knownIds) {
    const d = editDistance(ref, id);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best === undefined ? '' : ` (did you mean "${best}"?)`;
}

/** Plain dynamic-programming Levenshtein distance — id lists are tiny. */
function editDistance(a: string, b: string): number {
  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

/**
 * Resolve a track's `from` / `to` marks to numeric frame indices using
 * the scene's BPM + fps. Pure — returns a new track; every other field
 * (including declared envelopes, which resolve later into components)
 * is carried through untouched.
 */
function resolveTrackMarks(track: Track, ctx: { bpm: number; fps: number }): Track<number> {
  return {
    ...track,
    from: resolveFrameMark(track.from, ctx),
    to: resolveFrameMark(track.to, ctx),
  };
}

function componentsFromTrack(track: Track<number>, ctx: { bpm: number; fps: number }): Record<string, unknown> {
  switch (track.kind) {
    case 'video':
      return {
        VideoSource: track.source,
        FrameRange: { from: track.from, to: track.to },
        TrackLayer: track.layer ?? 0,
        ...(track.envelope !== undefined ? { Envelope: resolveEnvelope(track.envelope, ctx) } : {}),
      };
    case 'audio':
      return {
        AudioSource: track.source,
        FrameRange: { from: track.from, to: track.to },
        // Volume is linear gain; unity (1) keeps an undeclared mix audible.
        Volume: track.mix?.volume ?? 1,
        Pan: track.mix?.pan ?? 0,
        ...(track.mix?.sync?.bpm !== undefined ? { SyncBeatMarker: { bpm: track.mix.sync.bpm } } : {}),
        ...(track.envelope !== undefined ? { Envelope: resolveEnvelope(track.envelope, ctx) } : {}),
      };
    case 'transition':
      return {
        TransitionKind: track.transitionKind,
        FrameRange: { from: track.from, to: track.to },
        Between: track.between,
        ...(track.ease !== undefined ? { Ease: track.ease } : {}),
      };
    case 'effect':
      // An effect may declare BOTH syncTo and envelope. Both components
      // are emitted; the runtime composes them (SyncSystem multiplies
      // its beat-decay base by the envelope factor — see
      // `systems/sync.ts`) so neither contribution clobbers the other.
      return {
        EffectKind: track.effectKind,
        TargetEntity: track.target,
        FrameRange: { from: track.from, to: track.to },
        ...(track.syncTo !== undefined ? { SyncAnchor: track.syncTo } : {}),
        ...(track.envelope !== undefined ? { Envelope: resolveEnvelope(track.envelope, ctx) } : {}),
      };
  }
}
