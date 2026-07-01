/**
 * EdgeTier -- edge-side tier detection from Client Hints headers.
 */

import { describe, test, expect } from 'vitest';
import { EdgeTier, ClientHints } from '@czap/edge';
import { CAP_AXES, capAxisAttr } from '@czap/detect';

describe('EdgeTier', () => {
  test('detectTier returns all three tier axes', () => {
    const result = EdgeTier.detectTier({});
    expect(result).toHaveProperty('capTier');
    expect(result).toHaveProperty('motionTier');
    expect(result).toHaveProperty('designTier');
  });

  test('detectTier with reduced motion yields none motion tier', () => {
    const result = EdgeTier.detectTier({
      'sec-ch-prefers-reduced-motion': 'reduce',
    });
    expect(result.motionTier).toBe('none');
  });

  test('detectTier with high-end headers yields elevated tiers', () => {
    const result = EdgeTier.detectTier({
      'sec-ch-device-memory': '8',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
      'sec-ch-viewport-width': '2560',
    });
    // High-end device should get at least animations tier
    expect(['animations', 'physics', 'compute']).toContain(result.motionTier);
  });

  test('tierDataAttributes generates valid HTML attributes', () => {
    const result = EdgeTier.detectTier({});
    const attrs = EdgeTier.tierDataAttributes(result);
    expect(attrs).toContain('data-czap-tier=');
    expect(attrs).toContain('data-czap-motion=');
    expect(attrs).toContain('data-czap-design=');
  });

  test('tierDataAttributes includes actual tier values', () => {
    const result = {
      capTier: 'reactive' as const,
      motionTier: 'animations' as const,
      designTier: 'enhanced' as const,
    };
    const attrs = EdgeTier.tierDataAttributes(result);
    expect(attrs).toBe('data-czap-tier="reactive" data-czap-motion="animations" data-czap-design="enhanced"');
  });

  test('tierDataAttributesMap is the spreadable form, one key per CAP_AXES axis (auto-includes new axes)', () => {
    const result = {
      capTier: 'reactive' as const,
      motionTier: 'animations' as const,
      designTier: 'enhanced' as const,
    };
    const map = EdgeTier.tierDataAttributesMap(result);
    // Exactly the canonical registry, keyed by the FULL attribute name — so a
    // consumer spreading `{...map}` gets every axis, and a future CAP_AXES
    // addition appears here automatically (never hand-written, never missed).
    expect(Object.keys(map).sort()).toEqual(CAP_AXES.map(capAxisAttr).sort());
    expect(map).toEqual({
      'data-czap-tier': 'reactive',
      'data-czap-motion': 'animations',
      'data-czap-design': 'enhanced',
    });
  });

  test('tierDataAttributes serializes EXACTLY tierDataAttributesMap (string and map cannot drift)', () => {
    const result = EdgeTier.detectTier({ 'sec-ch-ua-mobile': '?0', 'device-memory': '8' });
    const map = EdgeTier.tierDataAttributesMap(result);
    const rebuilt = Object.entries(map)
      .map(([attr, val]) => `${attr}="${val}"`)
      .join(' ');
    // The string form is derived from the map form; this pins that they can
    // never disagree (add an axis to one without the other and this reds).
    expect(EdgeTier.tierDataAttributes(result)).toBe(rebuilt);
  });

  test('tierFromParsed matches detectTier for the same headers', () => {
    const headers = {
      'sec-ch-prefers-reduced-motion': 'reduce',
      'sec-ch-device-memory': '8',
      'sec-ch-viewport-width': '1280',
    };
    const caps = ClientHints.parseClientHints(headers);
    expect(EdgeTier.tierFromParsed(caps)).toEqual(EdgeTier.detectTier(headers));
  });

  test('tierFromParsed matches detectTier for the same headers', () => {
    const headers = {
      'sec-ch-prefers-reduced-motion': 'reduce',
      'sec-ch-device-memory': '8',
      'sec-ch-viewport-width': '1280',
    };
    const caps = ClientHints.parseClientHints(headers);
    expect(EdgeTier.tierFromParsed(caps)).toEqual(EdgeTier.detectTier(headers));
  });
});
