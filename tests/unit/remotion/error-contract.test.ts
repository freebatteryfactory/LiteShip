/** @liteship/remotion error contract */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { stateAtFrame } from '@liteship/remotion';

describe('@liteship/remotion error contract', () => {
  let buffer: ReturnType<typeof Diagnostics.createBufferSink>;

  beforeEach(() => {
    Diagnostics.reset();
    buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);
  });

  afterEach(() => Diagnostics.reset());

  it('an empty frame stream degrades to an empty state with one actionable diagnostic', () => {
    expect(stateAtFrame([], 4)).toEqual({
      discrete: {},
      blend: {},
      outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
    });
    stateAtFrame([], 9);

    const events = buffer.events.filter((event) => event.code === 'no-frames');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        source: 'liteship/remotion',
        code: 'no-frames',
        message: expect.stringMatching(/precomputeFrames.*calculateMetadata/s),
      }),
    );
  });
});
