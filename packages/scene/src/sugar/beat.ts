/**
 * Beat() — typed beat-count handle that the scene compiler resolves to
 * a frame index using the scene's BPM + fps. Authors write
 * `from: Beat(4)` and never touch millisecond arithmetic; `compileScene`
 * normalizes every {@link FrameMark} to a numeric frame index before
 * invariants run (see `../compile.ts`).
 *
 * Canonical type declarations live in `@liteship/_spine` (ADR-0010); this
 * module mirrors them and keeps the runtime constructors.
 *
 * @module
 */

import type {
  BeatHandle as _BeatHandle,
  FrameMark as _FrameMark,
  FrameMarkSum as _FrameMarkSum,
} from '@liteship/_spine';

/** Beat handle produced by `Beat(count)`. Mirror of the `@liteship/_spine` declaration. */
export type BeatHandle = _BeatHandle;

/**
 * Timeline mark accepted by track `from` / `to` and `Scene.include`
 * offsets — a raw frame index, a beat handle, or a deferred frame+beat
 * sum. Mirror of the `@liteship/_spine` declaration.
 */
export type FrameMark = _FrameMark;

/**
 * Deferred frame+beat sum produced by {@link addFrameMarks} when marks
 * of mixed units combine. Mirror of the `@liteship/_spine` declaration.
 */
export type FrameMarkSum = _FrameMarkSum;

/** Build a beat handle with the given count (may be fractional). */
export function Beat(count: number): BeatHandle {
  return { _tag: 'beat', count };
}

/** Resolve a BeatHandle to a frame index using scene BPM and fps. */
export function resolveBeat(handle: BeatHandle, ctx: { bpm: number; fps: number }): number {
  const seconds = (handle.count * 60) / ctx.bpm;
  return seconds * ctx.fps;
}

/**
 * Resolve any {@link FrameMark} to a numeric frame index. Numbers pass
 * through unchanged; beat handles resolve via {@link resolveBeat};
 * deferred sums resolve as `frames + resolveBeat(beats)`.
 */
export function resolveFrameMark(mark: FrameMark, ctx: { bpm: number; fps: number }): number {
  if (typeof mark === 'number') return mark;
  if (mark._tag === 'beat') return resolveBeat(mark, ctx);
  return mark.frames + resolveBeat(Beat(mark.beats), ctx);
}

/**
 * Add two {@link FrameMark}s without resolving them — frame-space and
 * beat-space portions accumulate independently so resolution can stay
 * deferred to `compileScene` (which knows the scene's BPM/fps). The
 * result is renormalized to the narrowest representation: a plain
 * number when no beats are involved, a {@link BeatHandle} when no raw
 * frames are involved, and a {@link FrameMarkSum} only for mixed units.
 */
export function addFrameMarks(a: FrameMark, b: FrameMark): FrameMark {
  const frames = framesPart(a) + framesPart(b);
  const beats = beatsPart(a) + beatsPart(b);
  if (beats === 0) return frames;
  if (frames === 0) return Beat(beats);
  return { _tag: 'mark-sum', frames, beats };
}

/** Frame-space portion of a mark. */
function framesPart(mark: FrameMark): number {
  if (typeof mark === 'number') return mark;
  return mark._tag === 'mark-sum' ? mark.frames : 0;
}

/** Beat-space portion of a mark. */
function beatsPart(mark: FrameMark): number {
  if (typeof mark === 'number') return 0;
  return mark._tag === 'mark-sum' ? mark.beats : mark.count;
}
