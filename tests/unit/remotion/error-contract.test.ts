/** @liteship/remotion error contract */
import { describe, it, expect } from 'vitest';
import { remotionAdapterCapsule } from '@liteship/remotion';

describe('@liteship/remotion error contract', () => {
  it('remotionAdapterCapsule names the video-frame-output adapter', () => {
    expect(remotionAdapterCapsule.name).toBe('remotion.video-frame-output');
  });
});
