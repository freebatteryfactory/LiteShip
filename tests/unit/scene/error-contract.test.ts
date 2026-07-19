/** @liteship/scene error contract */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@liteship/error';
import { resolveBeatProjectionToSceneBeats } from '@liteship/scene';

describe('@liteship/scene error contract', () => {
  it('resolveBeatProjectionToSceneBeats rejects invalid sampleRate with next-step guidance', () => {
    try {
      resolveBeatProjectionToSceneBeats({ projection: { beats: [0] }, sampleRate: 0 });
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/sampleRate/);
      expect(String(error)).toMatch(/44100|48000/);
    }
  });
});
