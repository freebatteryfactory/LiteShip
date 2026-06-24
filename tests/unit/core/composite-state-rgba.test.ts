/**
 * `compositeStateToRgba` — the ONE deterministic frame painter both headless
 * ffmpeg backends (the `@czap/command` `scene render` backend AND the
 * `@czap/stage` encoder) share. This pins the LAWS the smoking-gun fix depends on:
 *
 *   (1) DETERMINISTIC — the same CompositeState yields byte-identical RGBA.
 *   (2) VARIES with state — distinct discrete/css state yields distinct pixels
 *       (so the graph's per-frame poses genuinely reach the video — not a black
 *       stub).
 *   (3) NOT BLACK for non-empty state — the RGB channels carry the state's color.
 *   (4) ORDER-INDEPENDENT — the color is a content function of the state, not of
 *       the map's insertion order.
 *   (5) shaped correctly — width*height*4 bytes, alpha fully opaque.
 */

import { describe, it, expect } from 'vitest';
import { compositeStateToRgba } from '@czap/core';
import type { CompositeState } from '@czap/core';

function state(discrete: Record<string, string>, css: Record<string, number | string>): CompositeState {
  return { discrete, blend: {}, outputs: { css, glsl: {}, wgsl: {}, aria: {} } };
}

const W = 4;
const H = 3;

describe('compositeStateToRgba — the shared deterministic frame painter', () => {
  it('(1) is deterministic: identical state → byte-identical RGBA', () => {
    const s = state({ viewport: 'mobile' }, { '--czap-card': '14px' });
    const a = compositeStateToRgba(s, W, H);
    const b = compositeStateToRgba(s, W, H);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('(2) varies with discrete state: distinct poses → distinct pixels', () => {
    const mobile = compositeStateToRgba(state({ viewport: 'mobile' }, {}), W, H);
    const desktop = compositeStateToRgba(state({ viewport: 'desktop' }, {}), W, H);
    // The two frames must NOT be byte-identical — the video varies with the pose.
    expect(Array.from(mobile)).not.toEqual(Array.from(desktop));
  });

  it('(2b) varies with css outputs: a different compiled value → different pixels', () => {
    const a = compositeStateToRgba(state({}, { '--czap-card': '14px' }), W, H);
    const b = compositeStateToRgba(state({}, { '--czap-card': '18px' }), W, H);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('(3) non-empty state is NOT an all-black frame (the old stub bug)', () => {
    const px = compositeStateToRgba(state({ viewport: 'desktop' }, { '--czap-x': '1' }), W, H);
    let rgbSum = 0;
    for (let i = 0; i < px.length; i += 4) rgbSum += px[i]! + px[i + 1]! + px[i + 2]!;
    // The black stub emitted r=g=b=0 for every pixel; a real painter does not.
    expect(rgbSum).toBeGreaterThan(0);
  });

  it('(4) is order-independent: the color is a content function of the state', () => {
    const forward = compositeStateToRgba(state({ a: '1', b: '2' }, { x: '1', y: '2' }), W, H);
    const reversed = compositeStateToRgba(state({ b: '2', a: '1' }, { y: '2', x: '1' }), W, H);
    expect(Array.from(forward)).toEqual(Array.from(reversed));
  });

  it('(5) is shaped width*height*4 with fully-opaque alpha', () => {
    const px = compositeStateToRgba(state({ k: 'v' }, {}), W, H);
    expect(px.length).toBe(W * H * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
    // Every pixel is the same solid fill (one color per frame).
    for (let i = 4; i < px.length; i += 4) {
      expect(px[i]).toBe(px[0]);
      expect(px[i + 1]).toBe(px[1]);
      expect(px[i + 2]).toBe(px[2]);
    }
  });
});
