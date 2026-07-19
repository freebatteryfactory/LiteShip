import { describe, it, expect } from 'vitest';
import type { SceneContract, VideoTrack } from '@liteship/scene';
import { Track } from '@liteship/scene';

describe('SceneContract', () => {
  it('accepts a minimal scene with one video track', () => {
    const track: VideoTrack = { _tag: 'video', id: 'hero', from: 0, to: 60, source: { _t: 'quantizer' } };
    const contract: SceneContract = {
      name: 'demo', duration: 60, fps: 60, bpm: 120,
      tracks: [track], invariants: [], budgets: { p95FrameMs: 16 }, site: ['node'],
    };
    expect(contract.tracks.length).toBe(1);
    expect(contract.tracks[0]?._tag).toBe('video');
  });

  it('typed cross-reference on transition.between', () => {
    const track: Track.Any = {
      _tag: 'transition',
      id: Track.transitionId('t'),
      from: 0,
      to: 30,
      between: [Track.videoId('a'), Track.videoId('b')],
      transitionKind: 'crossfade',
    };
    expect(track._tag).toBe('transition');
  });
});
