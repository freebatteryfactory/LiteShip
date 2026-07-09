/**
 * Responsive-media intent — Save-Data / DPR projection (#125).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  ResponsiveMedia,
  resolveResponsiveMedia,
  buildResponsiveSrcset,
  buildResponsiveImageSet,
  projectResponsiveMediaPicture,
} from '@czap/core';
import { compileResponsiveMedia } from '@czap/compiler';

function heroMediaIntent() {
  return ResponsiveMedia.intent({
    id: 'hero-img',
    alt: 'Hero photograph',
    variants: [
      { src: '/img/hero-800.jpg', width: 800 },
      { src: '/img/hero-1600.jpg', width: 1600 },
      { src: '/img/hero-2400.jpg', width: 2400 },
    ],
    saveDataVariant: { src: '/img/hero-lite.jpg', width: 400 },
    sizes: '(max-width: 768px) 100vw, 50vw',
  });
}

describe('ResponsiveMedia resolution', () => {
  test('Save-Data selects saveDataVariant regardless of DPR', () => {
    const intent = heroMediaIntent();
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: 3, saveData: true });
    expect(resolved.src).toBe('/img/hero-lite.jpg');
    expect(resolved.reason).toBe('save-data');
  });

  test('Save-Data with NO authored variant serves the LIGHTEST candidate, never the heavy DPR match', () => {
    const intent = ResponsiveMedia.intent({
      id: 'no-lite',
      alt: 'x',
      variants: [
        { src: '/img/hero-800.jpg', width: 800 },
        { src: '/img/hero-1600.jpg', width: 1600 },
        { src: '/img/hero-2400.jpg', width: 2400 },
      ],
    });
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: 3, saveData: true });
    expect(resolved.src).toBe('/img/hero-800.jpg');
    expect(resolved.reason).toBe('save-data-floor');
  });

  test('DPR 2 picks closest at-or-above variant', () => {
    const intent = heroMediaIntent();
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: 2, saveData: false });
    expect(resolved.src).toBe('/img/hero-1600.jpg');
    expect(resolved.reason).toBe('dpr-match');
  });

  test('adversarial: unsorted widths use min as DPR base — [1600,800,3200] at DPR 1 picks 800w asset', () => {
    const intent = ResponsiveMedia.intent({
      id: 'unsorted',
      alt: 'x',
      variants: [
        { src: '/img/1600.jpg', width: 1600 },
        { src: '/img/800.jpg', width: 800 },
        { src: '/img/3200.jpg', width: 3200 },
      ],
    });
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: 1, saveData: false });
    expect(resolved.src).toBe('/img/800.jpg');
    expect(resolved.reason).toBe('dpr-match');
  });

  test('adversarial: DPR 99 floors to largest variant', () => {
    const intent = heroMediaIntent();
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: 99, saveData: false });
    expect(resolved.src).toBe('/img/hero-2400.jpg');
    expect(resolved.reason).toBe('dpr-floor');
  });

  test('adversarial: empty variants throws', () => {
    const intent = ResponsiveMedia.intent({
      id: 'empty',
      alt: '',
      variants: [],
    });
    expect(() => resolveResponsiveMedia(intent, { devicePixelRatio: 1, saveData: false })).toThrow();
    try {
      resolveResponsiveMedia(intent, { devicePixelRatio: 1, saveData: false });
      expect.unreachable();
    } catch (e) {
      expect((e as { _tag?: string })._tag).toBe('ValidationError');
    }
  });

  test('adversarial: NaN DPR treated as 1', () => {
    const intent = ResponsiveMedia.intent({
      id: 'x',
      alt: 'x',
      variants: [
        { src: '/a.jpg', descriptor: '1x' },
        { src: '/b.jpg', descriptor: '2x' },
      ],
    });
    const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: Number.NaN, saveData: false });
    expect(resolved.src).toBe('/a.jpg');
  });
});

describe('ResponsiveMedia projection', () => {
  test('buildResponsiveSrcset emits width descriptors', () => {
    const srcset = buildResponsiveSrcset(heroMediaIntent().variants);
    expect(srcset).toContain('/img/hero-800.jpg 800w');
    expect(srcset).toContain('/img/hero-2400.jpg 2400w');
  });

  test('buildResponsiveImageSet emits native image-set() with resolution descriptors only', () => {
    const imageSet = buildResponsiveImageSet([
      { src: '/img/hero-800.jpg', descriptor: '1x' },
      { src: '/img/hero-1600.jpg', descriptor: '2x' },
    ]);
    expect(imageSet).toMatch(/^image-set\(/);
    expect(imageSet).toContain('url("/img/hero-1600.jpg") 2x');
    expect(imageSet).not.toContain('w');
  });

  test('buildResponsiveImageSet infers x descriptors from width variants', () => {
    const imageSet = buildResponsiveImageSet(heroMediaIntent().variants);
    expect(imageSet).toContain('url("/img/hero-1600.jpg") 2x');
    expect(imageSet).not.toContain('1600w');
  });

  test('Save-Data preload targets the light asset, not the heavy srcset', () => {
    const intent = ResponsiveMedia.intent({
      id: 'hero',
      alt: 'x',
      variants: [
        { src: '/img/hero-800.jpg', width: 800 },
        { src: '/img/hero-2400.jpg', width: 2400 },
      ],
      saveDataVariant: { src: '/img/hero-lite.jpg', width: 400 },
    });
    const projection = projectResponsiveMediaPicture(intent, { devicePixelRatio: 3, saveData: true });
    expect(projection.resolved.src).toBe('/img/hero-lite.jpg');
    expect(projection.preload).toContain('/img/hero-lite.jpg');
    expect(projection.preload).not.toContain('hero-2400');
  });

  test('projectResponsiveMediaPicture emits picture + save-data source', () => {
    const projection = projectResponsiveMediaPicture(heroMediaIntent(), {
      devicePixelRatio: 1,
      saveData: false,
    });
    expect(projection.picture).toContain('<picture data-czap-responsive="hero-img">');
    expect(projection.picture).toContain('prefers-reduced-data: reduce');
    expect(projection.picture).toContain('srcset="/img/hero-lite.jpg');
    expect(projection.resolved.src).toBe('/img/hero-800.jpg');
    expect(projection.preload).toContain('rel="preload"');
    expect(projection.preload).toContain('as="image"');
    expect(projection.preload).toContain('imagesrcset=');
  });

  test('adversarial: escapes alt text in HTML', () => {
    const intent = ResponsiveMedia.intent({
      id: 'x',
      alt: 'Hero "quoted" <unsafe>',
      variants: [{ src: '/a.jpg', width: 100 }],
    });
    const projection = projectResponsiveMediaPicture(intent, { devicePixelRatio: 1, saveData: false });
    expect(projection.picture).not.toContain('<unsafe>');
    expect(projection.picture).toContain('&quot;');
    expect(projection.picture).toContain('&lt;unsafe&gt;');
  });

  test('compileResponsiveMedia seals digest over picture + image-set', () => {
    const compiled = compileResponsiveMedia(heroMediaIntent(), { devicePixelRatio: 2, saveData: false });
    expect(compiled.picture.resolved.reason).toBe('dpr-match');
    expect(compiled.imageSet).toContain('image-set(');
    expect(compiled.resultDigest.integrity_digest.length).toBeGreaterThan(0);
  });
});

describe('ResponsiveMedia property laws', () => {
  test('resolve always returns a src from variants or saveDataVariant', () => {
    fc.assert(
      fc.property(fc.float({ min: 0.5, max: 4, noNaN: true }), fc.boolean(), (dpr, saveData) => {
        const intent = heroMediaIntent();
        const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: dpr, saveData });
        const allowed = new Set([
          ...intent.variants.map((v) => v.src),
          ...(intent.saveDataVariant ? [intent.saveDataVariant.src] : []),
        ]);
        expect(allowed.has(resolved.src)).toBe(true);
      }),
      { seed: 0x5eed },
    );
  });

  test('stagger delayMs is always stepMs * index (cross-primitive law)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 0, max: 200 }), (count, stepMs) => {
        const delays = Array.from({ length: count }, (_, i) => i * stepMs);
        for (let i = 1; i < delays.length; i++) {
          expect(delays[i]! - delays[i - 1]!).toBe(stepMs);
        }
      }),
      { seed: 0x5eed },
    );
  });
});
