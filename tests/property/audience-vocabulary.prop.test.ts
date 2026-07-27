// @vitest-environment node

import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { analyzeAudienceVocabulary, type VocabularyAudience } from '../support/audience-vocabulary.js';

const target = fc.constantFrom('CSS', 'GLSL', 'WGSL', 'ARIA', 'HTML', 'video', 'AI manifest', 'named target');
const padding = fc.stringMatching(/^[ A-Za-z0-9,()-]{0,30}$/);

function violations(audience: VocabularyAudience, text: string) {
  return analyzeAudienceVocabulary([{ id: 'generated', audience, text }]);
}

describe('audience vocabulary properties', () => {
  test('unqualified product cast always reds in beginner and operational prose', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<VocabularyAudience>('beginner', 'operational'),
        padding,
        fc.constantFrom('cast', 'casts', 'casting'),
        padding,
        (audience, before, word, after) => {
          const result = violations(audience, `${before} product ${word} without a target ${after}`);
          expect(result).toHaveLength(1);
        },
      ),
      { seed: 0x0ca57, numRuns: 120 },
    );
  });

  test('noun and bare expert uses red even when arbitrary harmless prose surrounds them', () => {
    fc.assert(
      fc.property(
        padding,
        padding,
        fc.constantFrom('The cast emits a result.', 'Every cast target is cached.', 'The compiler can cast once.'),
        (before, after, phrase) => {
          expect(violations('expert', `${before} ${phrase} ${after}`)).toHaveLength(1);
        },
      ),
      { seed: 0xba2eca57, numRuns: 120 },
    );
  });

  test('target-bearing expert verbs remain admitted across named targets', () => {
    fc.assert(
      fc.property(
        target,
        fc.constantFrom(
          (value: string) => `The definition casts to ${value}.`,
          (value: string) => `Cast the graph into the ${value} target.`,
          (value: string) => `The adapter may cast the projection onto the ${value} surface.`,
        ),
        (namedTarget, phrase) => {
          expect(violations('expert', phrase(namedTarget))).toEqual([]);
        },
      ),
      { seed: 0x7a26e7, numRuns: 120 },
    );
  });

  test('nearby English words and explicit non-product meanings never trigger substring bans', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Broadcast the forecast.',
          'The theatrical cast took a bow.',
          'A TypeScript type cast can hide a bug.',
          'Use `castContext` from packages/core/src/authoring/ai-cast.ts.',
        ),
        (text) => {
          expect(violations('beginner', text)).toEqual([]);
        },
      ),
      { seed: 0xfa15e, numRuns: 80 },
    );
  });
});
