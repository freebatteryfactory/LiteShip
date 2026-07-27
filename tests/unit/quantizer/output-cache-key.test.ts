/**
 * Output-cache key law: derived quantizer cache ids are true fnv1a ContentAddresses,
 * not composite colon-suffix strings forged via mkContentAddress.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineBoundary } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

const REPO = resolve(import.meta.dirname, '../../..');
const QUANTIZER_SRC = readFileSync(resolve(REPO, 'packages/quantizer/src/quantizer.ts'), 'utf8');
const FNV1A_RE = /^fnv1a:[0-9a-f]{8}$/;

function viewport() {
  return defineBoundary({
    input: 'viewport-width',
    at: [
      [0, 'compact'],
      [768, 'medium'],
      [1280, 'expanded'],
    ] as const,
  });
}

describe('quantizer output cache key law', () => {
  test('quantizer.ts does not forge ContentAddress from composite colon-suffix strings', () => {
    expect(QUANTIZER_SRC).not.toMatch(/mkContentAddress\(`\$\{/);
    expect(QUANTIZER_SRC).not.toMatch(/ContentAddress\(`\$\{/);
    expect(QUANTIZER_SRC).toMatch(/outputCacheAddress/);
    expect(QUANTIZER_SRC).toMatch(/fnv1aBytes\(\s*CanonicalCbor\.encode/);
  });

  test('config id matches fnv1a:XXXXXXXX', () => {
    const config = defineQuantizer(viewport(), {
      outputs: {
        css: {
          compact: { '--gap': '0.5rem' },
          medium: { '--gap': '1rem' },
          expanded: { '--gap': '2rem' },
        },
      },
    });
    expect(config.id).toMatch(FNV1A_RE);
  });

  test('distinct outputs produce distinct config ids (cache key inputs diverge)', () => {
    const b = viewport();
    const a = defineQuantizer(b, {
      outputs: { css: { compact: { '--a': 1 }, medium: { '--a': 2 }, expanded: { '--a': 3 } } },
    });
    const c = defineQuantizer(b, {
      outputs: { css: { compact: { '--b': 1 }, medium: { '--b': 2 }, expanded: { '--b': 3 } } },
    });
    expect(a.id).toMatch(FNV1A_RE);
    expect(c.id).toMatch(FNV1A_RE);
    expect(a.id).not.toBe(c.id);
  });

  test('evaluate with spring produces legal config id (spring path exercises output cache)', () => {
    const config = defineQuantizer(viewport(), {
      spring: { stiffness: 200, damping: 20 },
      outputs: {
        css: {
          compact: { '--gap': '0.5rem' },
          medium: { '--gap': '1rem' },
          expanded: { '--gap': '2rem' },
        },
      },
    });
    expect(config.id).toMatch(FNV1A_RE);
    const lq = createQuantizer(config);
    const outputs = lq.currentOutputs.read();
    expect(outputs.css).toBeDefined();
  });
});
