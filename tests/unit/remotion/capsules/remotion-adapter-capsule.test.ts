import { describe, it, expect } from 'vitest';
import { remotionAdapterCapsule } from '@liteship/remotion';

const frame = (index: number) => ({
  frame: index,
  timestamp: index * 1000,
  progress: index / 2,
  state: null,
});

function invokeWithUntrustedOutput(check: (...args: never[]) => boolean, input: unknown, output: unknown): boolean {
  return Reflect.apply(check, undefined, [input, output]);
}

describe('remotionAdapterCapsule', () => {
  it('declares a siteAdapter bridging Remotion composition API to liteship VideoFrameOutput', () => {
    expect(remotionAdapterCapsule._kind).toBe('siteAdapter');
    expect(remotionAdapterCapsule.name).toBe('remotion.video-frame-output');
  });

  it('declares node + browser sites', () => {
    expect(remotionAdapterCapsule.site).toEqual(['node', 'browser']);
  });

  it('records attribution for Remotion license boundary', () => {
    expect(remotionAdapterCapsule.attribution?.license).toBe('Remotion-Company-License');
  });

  it('has at least one invariant', () => {
    expect(remotionAdapterCapsule.invariants.length).toBeGreaterThan(0);
  });

  it('frame-indices-are-contiguous validates the actual index sequence', () => {
    const inv = remotionAdapterCapsule.invariants.find((i) => i.name === 'frame-indices-are-contiguous');
    expect(inv).toBeDefined();
    // Contiguous: ok.
    expect(inv!.check({ totalFrames: 3 }, [frame(0), frame(1), frame(2)])).toBe(true);
    // Non-contiguous: fail.
    expect(inv!.check({ totalFrames: 3 }, [frame(0), frame(2), frame(1)])).toBe(false);
    // Non-array: fail.
    expect(invokeWithUntrustedOutput(inv!.check, { totalFrames: 3 }, { not: 'an array' })).toBe(false);
    // Empty array is trivially contiguous.
    expect(inv!.check({ totalFrames: 0 }, [])).toBe(true);
  });

  it('frame-count-matches-totalFrames rejects short and overlong streams', () => {
    const inv = remotionAdapterCapsule.invariants.find(
      (candidate) => candidate.name === 'frame-count-matches-totalFrames',
    );
    expect(inv).toBeDefined();

    expect(inv!.check({ totalFrames: 3 }, [frame(0), frame(1), frame(2)])).toBe(true);
    expect(inv!.check({ totalFrames: 3 }, [frame(0), frame(1)])).toBe(false);
    expect(inv!.check({ totalFrames: 1 }, [frame(0), frame(1)])).toBe(false);
    expect(invokeWithUntrustedOutput(inv!.check, { totalFrames: 1 }, { not: 'an array' })).toBe(false);
  });
});
