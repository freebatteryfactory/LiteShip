/** @czap/remotion error contract */
import { describe, it, expect } from 'vitest';
import { remotionAdapterCapsule } from '@czap/remotion';

describe('@czap/remotion error contract', () => {
  it('remotionAdapterCapsule names the video-frame-output adapter', () => {
    expect(remotionAdapterCapsule.name).toBe('remotion.video-frame-output');
  });
});
