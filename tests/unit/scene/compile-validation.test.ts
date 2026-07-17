/**
 * compileScene built-in structural validation and the scene error
 * contract: broken scenes throw one collected ValidationError that
 * names each problem and its fix; truncation (a track past an explicitly
 * declared duration) warns through Diagnostics instead of failing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Track, compileScene, SceneRuntime, SyncSystem, resolveBeatProjectionToSceneBeats } from '@czap/scene';
import type { SceneContract } from '@czap/scene';
import { Diagnostics } from '@czap/core';
import { hasTag } from '@czap/error';
import type { ValidationError } from '@czap/error';

afterEach(() => {
  Diagnostics.reset();
});

const compileError = (scene: SceneContract): ValidationError => {
  let caught: unknown;
  try {
    compileScene(scene);
  } catch (error) {
    caught = error;
  }
  expect(hasTag(caught, 'ValidationError')).toBe(true);
  return caught as ValidationError;
};

describe('compileScene structural validation', () => {
  it('a dangling transition between ref throws with a did-you-mean suggestion', () => {
    const err = compileError({
      name: 'dangling',
      fps: 60,
      bpm: 120,
      tracks: [
        Track.video('intro', { from: 0, to: 60, source: {} }),
        Track.video('outro', { from: 60, to: 120, source: {} }),
        Track.transition('xfade', {
          from: 50,
          to: 70,
          kind: 'crossfade',
          between: [Track.videoId('intro'), Track.videoId('outr')],
        }),
      ],
    });
    expect(err.module).toBe('compileScene');
    expect(err.detail).toContain(
      'transition "xfade" blends between "intro" and "outr", but no video track with id "outr" exists (did you mean "outro"?)',
    );
    expect(err.detail).toContain("fix the id passed to Track.transition's between");
  });

  it('a reversed range throws naming the track and both marks', () => {
    const err = compileError({
      name: 'reversed',
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 60, to: 0, source: {} })],
    });
    expect(err.detail).toContain('track "hero" resolves to from 60 > to 0');
    expect(err.detail).toContain('swap the marks or fix the Beat() arithmetic');
  });

  it('a non-positive fps throws with the remedy', () => {
    const err = compileError({
      name: 'no-fps',
      fps: 0,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    });
    expect(err.detail).toContain('scene fps must be a positive, finite number — got 0');
    expect(err.detail).toContain('e.g. 30 or 60');
  });

  it('structural problems and declared invariant violations land in ONE error', () => {
    const err = compileError({
      name: 'both',
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 60, to: 0, source: {} })],
      invariants: [{ name: 'never-holds', check: () => false, message: 'declared violation' }],
    });
    expect(err.detail).toContain('1 structural problem');
    expect(err.detail).toContain('track "hero" resolves to from 60 > to 0');
    expect(err.detail).toContain('violated 1 invariant');
    expect(err.detail).toContain('never-holds');
  });

  it('a track past an explicitly declared duration warns (track-past-duration) but compiles', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const compiled = compileScene({
      name: 'truncated',
      duration: 500, // 30 frames at 60fps
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    });
    expect(compiled.trackSpawns.length).toBe(1);

    const warn = events.find((e) => e.code === 'track-past-duration');
    expect(warn?.message).toContain('track "hero" extends to frame 60');
    expect(warn?.message).toContain('declared duration 500ms ends at frame 30');
    expect(warn?.message).toContain('omit duration to derive it from the tracks');
  });

  it('a derived duration never warns about truncation', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    compileScene({
      name: 'derived',
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    });

    expect(events.find((e) => e.code === 'track-past-duration')).toBeUndefined();
  });
});

describe('scene runtime/bridge error contract', () => {
  it('tick() after release() teaches why and the literal next step', async () => {
    const compiled = compileScene({
      name: 'released',
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    });
    const handle = await SceneRuntime.build(compiled);
    await handle.release();
    await expect(handle.tick(16.67)).rejects.toThrow(
      "SceneRuntime: tick() was called after release(). release() closes the world's scope, so entities and systems are gone — call SceneRuntime.build(compiledScene) again to get a fresh handle.",
    );
  });

  it('resolveBeatProjectionToSceneBeats names the sample-rate source and the literal call to make', () => {
    expect(() =>
      resolveBeatProjectionToSceneBeats({ projection: { bpm: 120, beats: [0] }, sampleRate: Number.NaN }),
    ).toThrow(
      'resolveBeatProjectionToSceneBeats: sampleRate must be a positive, finite number — got NaN. Pass the sample rate of the decoded audio asset that produced this BeatMarkerSet (typically 44100 or 48000), e.g. resolveBeatProjectionToSceneBeats({ projection, sampleRate: asset.sampleRate }).',
    );
  });

  it('SyncSystem warns once when executed without a world', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    SyncSystem(0, 60).execute([], undefined);
    SyncSystem(1, 60).execute([], undefined);

    const warns = events.filter((e) => e.code === 'worldless-degrade');
    expect(warns.length).toBe(1); // warnOnce dedupes
    expect(warns[0]?.message).toContain('no world supplied, so no Beat entities are visible');
    expect(warns[0]?.message).toContain('pass the world as the second execute argument');
  });
});
