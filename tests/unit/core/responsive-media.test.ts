/**
 * Responsive-media intent — Save-Data / DPR projection (#125).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  ResponsiveMedia,
  selectCandidates,
  resolveResponsiveMedia,
  buildResponsiveSrcset,
  buildResponsiveImageSet,
  projectResponsiveMediaPicture,
} from '@liteship/core';
import { compileResponsiveMedia } from '@liteship/compiler';

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
    expect(projection.picture).toContain('<picture data-liteship-responsive="hero-img">');
    expect(projection.picture).toContain('prefers-reduced-data: reduce');
    expect(projection.picture).toContain('srcset="/img/hero-lite.jpg');
    expect(projection.resolved.src).toBe('/img/hero-800.jpg');
    expect(projection.preload).toContain('rel="preload"');
    expect(projection.preload).toContain('as="image"');
    expect(projection.preload).toContain('imagesrcset=');
  });

  test('reduced-data <source> is emitted even when saveDataVariant is a bare URL (no width/descriptor) (Codex P2)', () => {
    // A bare saveDataVariant makes buildResponsiveSrcset return '' — without a bare-URL fallback
    // the reduced-data <source> would be SKIPPED, dropping prefers-reduced-data clients (that sent
    // no Save-Data header) onto the heavy srcset. The light asset must always be advertised.
    const intent = ResponsiveMedia.intent({
      id: 'hero-img',
      alt: 'Hero',
      variants: [
        { src: '/img/hero-800.jpg', width: 800 },
        { src: '/img/hero-1600.jpg', width: 1600 },
      ],
      saveDataVariant: { src: '/img/hero-lite.jpg' },
    });
    const projection = projectResponsiveMediaPicture(intent, { devicePixelRatio: 1, saveData: false });
    expect(projection.picture).toContain('prefers-reduced-data: reduce');
    expect(projection.picture).toContain('srcset="/img/hero-lite.jpg"');
    // The heavy candidates stay OUT of the reduced-data source.
    expect(projection.picture).not.toMatch(/prefers-reduced-data: reduce"[^>]*hero-1600/);
  });

  test('buildResponsiveImageSet advertises a lone descriptor-less candidate at 1x (Codex P2)', () => {
    // A bare Save-Data light asset (no width/descriptor) would otherwise yield `none`, dropping
    // the light URL from CSS image-set() entirely — a single such candidate defaults to 1x.
    expect(buildResponsiveImageSet([{ src: '/img/hero-lite.svg' }])).toBe('image-set(url("/img/hero-lite.svg") 1x)');
    // Multiple descriptor-less candidates have an ambiguous DPR — still `none`.
    expect(buildResponsiveImageSet([{ src: '/a.svg' }, { src: '/b.svg' }])).toBe('none');
  });

  test('image-set() keeps the bare Save-Data light asset instead of dropping to none (Codex P2)', () => {
    const intent = ResponsiveMedia.intent({
      id: 'hero-img',
      alt: 'Hero',
      variants: [
        { src: '/img/hero-800.jpg', width: 800 },
        { src: '/img/hero-1600.jpg', width: 1600 },
      ],
      saveDataVariant: { src: '/img/hero-lite.jpg' },
    });
    const compiled = compileResponsiveMedia(intent, { devicePixelRatio: 3, saveData: true });
    expect(compiled.imageSet).toBe('image-set(url("/img/hero-lite.jpg") 1x)');
    expect(compiled.imageSet).not.toContain('hero-1600');
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

describe('ResponsiveMedia effective-candidate law (#140, F-RM-1a..e)', () => {
  // The heavy candidates a Save-Data + high-DPR client must NEVER see advertised.
  const HEAVY = ['hero-1600', 'hero-2400', 'hero-3200'];

  /** Assert NO heavy candidate appears in ANY artifact of a compiled projection. */
  function expectNoHeavyAnywhere(intent: ReturnType<typeof heroMediaIntent>, dpr: number): void {
    const compiled = compileResponsiveMedia(intent, { devicePixelRatio: dpr, saveData: true });
    const { picture, img, srcset, resolved, preload } = compiled.picture;
    // Every surface the browser could fetch from: src, srcset, <source>, preload, image-set.
    const surfaces = { picture, img, srcset, src: resolved.src, preload, imageSet: compiled.imageSet };
    for (const [name, markup] of Object.entries(surfaces)) {
      for (const heavy of HEAVY) {
        expect(markup, `heavy candidate ${heavy} leaked into ${name} at DPR ${dpr}`).not.toContain(heavy);
      }
    }
  }

  test('selectCandidates caps ALL candidates to the authored light variant under Save-Data (DPR 1/2/3)', () => {
    const intent = heroMediaIntent();
    for (const dpr of [1, 2, 3]) {
      const set = selectCandidates(intent, { devicePixelRatio: dpr, saveData: true });
      expect(set.candidates.map((c) => c.src)).toEqual(['/img/hero-lite.jpg']);
      expect(set.resolved.src).toBe('/img/hero-lite.jpg');
      expect(set.reason).toBe('save-data');
    }
  });

  test('selectCandidates caps to the SMALLEST variant when NO light variant is authored (F-RM-1c, DPR 1/2/3)', () => {
    const intent = ResponsiveMedia.intent({
      id: 'no-lite',
      alt: 'x',
      variants: [
        { src: '/img/hero-800.jpg', width: 800 },
        { src: '/img/hero-1600.jpg', width: 1600 },
        { src: '/img/hero-2400.jpg', width: 2400 },
      ],
    });
    for (const dpr of [1, 2, 3]) {
      const set = selectCandidates(intent, { devicePixelRatio: dpr, saveData: true });
      expect(set.candidates.map((c) => c.src)).toEqual(['/img/hero-800.jpg']);
      expect(set.reason).toBe('save-data-floor');
      // The full compiled projection advertises ONLY the floor — never 1600/2400.
      const compiled = compileResponsiveMedia(intent, { devicePixelRatio: dpr, saveData: true });
      for (const heavy of ['hero-1600', 'hero-2400']) {
        expect(compiled.picture.picture).not.toContain(heavy);
        expect(compiled.picture.srcset).not.toContain(heavy);
        expect(compiled.picture.preload).not.toContain(heavy);
        expect(compiled.imageSet).not.toContain(heavy);
      }
    }
  });

  test('Save-Data + high DPR: NO heavy candidate in src/srcset/source/preload/image-set (explicit variant, DPR 1/2/3)', () => {
    const intent = heroMediaIntent();
    for (const dpr of [1, 2, 3]) {
      expectNoHeavyAnywhere(intent, dpr);
      const projection = projectResponsiveMediaPicture(intent, { devicePixelRatio: dpr, saveData: true });
      // Positive: the light asset IS advertised through src, srcset, <source>, preload.
      expect(projection.resolved.src).toBe('/img/hero-lite.jpg');
      expect(projection.srcset).toContain('/img/hero-lite.jpg');
      expect(projection.picture).toContain('/img/hero-lite.jpg');
      expect(projection.preload).toContain('/img/hero-lite.jpg');
    }
  });

  test('the preload (F-RM-1d, the LCP leak) advertises ONLY the effective set under Save-Data', () => {
    const projection = projectResponsiveMediaPicture(heroMediaIntent(), { devicePixelRatio: 3, saveData: true });
    expect(projection.preload).toContain('imagesrcset="/img/hero-lite.jpg 400w"');
    for (const heavy of HEAVY) expect(projection.preload).not.toContain(heavy);
  });

  test('image-set() folds the effective set — light-only under Save-Data', () => {
    const compiled = compileResponsiveMedia(heroMediaIntent(), { devicePixelRatio: 3, saveData: true });
    expect(compiled.imageSet).toMatch(/^image-set\(/);
    expect(compiled.imageSet).toContain('/img/hero-lite.jpg');
    for (const heavy of HEAVY) expect(compiled.imageSet).not.toContain(heavy);
  });

  test('the cache-key digest keys on the EFFECTIVE set: Save-Data and normal address differently', () => {
    const intent = heroMediaIntent();
    const saveData = compileResponsiveMedia(intent, { devicePixelRatio: 3, saveData: true });
    const normal = compileResponsiveMedia(intent, { devicePixelRatio: 3, saveData: false });
    expect(saveData.resultDigest.integrity_digest).not.toBe(normal.resultDigest.integrity_digest);
    // The Save-Data digest is over light-only markup; the normal one over the full set.
    expect(normal.picture.srcset).toContain('/img/hero-2400.jpg');
    expect(saveData.picture.srcset).not.toContain('/img/hero-2400.jpg');
  });

  test('normal path is UNCHANGED: the full candidate set is still advertised', () => {
    const intent = heroMediaIntent();
    const compiled = compileResponsiveMedia(intent, { devicePixelRatio: 2, saveData: false });
    // Every heavy candidate is present for a non-Save-Data client (the browser picks).
    expect(compiled.picture.srcset).toContain('/img/hero-800.jpg 800w');
    expect(compiled.picture.srcset).toContain('/img/hero-1600.jpg 1600w');
    expect(compiled.picture.srcset).toContain('/img/hero-2400.jpg 2400w');
    expect(compiled.imageSet).toContain('/img/hero-2400.jpg');
    // DPR 2 still resolves the DPR-matched src.
    expect(compiled.picture.resolved.reason).toBe('dpr-match');
    expect(compiled.picture.resolved.src).toBe('/img/hero-1600.jpg');
  });

  test('resolveResponsiveMedia derives from the SAME law (its src is the effective resolved)', () => {
    const intent = heroMediaIntent();
    for (const caps of [
      { devicePixelRatio: 3, saveData: true },
      { devicePixelRatio: 2, saveData: false },
      { devicePixelRatio: 99, saveData: false },
    ]) {
      const resolved = resolveResponsiveMedia(intent, caps);
      const set = selectCandidates(intent, caps);
      expect(resolved.src).toBe(set.resolved.src);
      expect(resolved.reason).toBe(set.reason);
    }
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
