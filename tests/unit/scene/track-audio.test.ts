import { describe, it, expect } from 'vitest';
import { Track } from '@liteship/scene';

describe('Track.audio', () => {
  it('builds an AudioTrack with default mix at unity linear gain', () => {
    const t = Track.audio('bed', { from: 0, to: 120, source: 'intro-bed' });
    expect(t._tag).toBe('audio');
    expect(t.source).toBe('intro-bed');
    // volume is linear gain: 1 = unity, so an undeclared mix is audible.
    expect(t.mix).toEqual({ volume: 1, pan: 0 });
  });

  it('merges user mix settings with defaults', () => {
    const t = Track.audio('bed', { from: 0, to: 120, source: 'x', mix: { volume: 0.5 } });
    expect(t.mix).toEqual({ volume: 0.5, pan: 0 });
  });
});
