/**
 * Validating smart-constructor LAW for the `AssetRefId` brand.
 *
 * `mkAssetRefId` is parse-don't-validate: it returns the id when it is a
 * non-empty token with no whitespace (the id is a registry `Map` KEY and is
 * serialized into asset references) and throws `ValidationError` otherwise.
 * Registration existence is enforced separately by `AssetRegistry`'s `ref`.
 *
 * Imported via the package src path: the brand module is an internal seam, not
 * part of the package's public `.` surface.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import { mkAssetRefId, isAssetRefId } from '../../../packages/assets/src/brands.js';

function expectValidationError(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(hasTag(caught, 'ValidationError')).toBe(true);
}

describe('AssetRefId (mkAssetRefId)', () => {
  test('accepts every real kebab-case asset id', () => {
    for (const id of ['intro-bed', 'fixture-list-exported', 'test-img', 'default-audio-asset', 'a']) {
      expect(mkAssetRefId(id)).toBe(id);
    }
  });

  test('rejects empty and whitespace-bearing ids', () => {
    for (const bad of ['', ' ', 'has space', 'tab\tid', 'new\nline']) {
      expectValidationError(() => mkAssetRefId(bad));
    }
  });

  test('LAW: any non-empty whitespace-free string is a valid AssetRefId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !/\s/.test(s)),
        (s) => {
          expect(mkAssetRefId(s)).toBe(s);
          expect(isAssetRefId(s)).toBe(true);
        },
      ),
    );
  });
});
