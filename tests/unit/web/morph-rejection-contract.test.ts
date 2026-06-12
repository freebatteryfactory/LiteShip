// @vitest-environment jsdom
/**
 * MorphRejection error contract — closed `type` union plus a `hint` that
 * names both ways out of a preserve violation.
 */

import { beforeAll, describe, expect, test } from 'vitest';
import { Hints } from '@czap/web';
import { rejectIfMissing } from '../../../packages/web/src/morph/hints.js';

// jsdom lacks CSS.escape — polyfill for tests (mirrors tests/component/morph-diff.test.ts).
beforeAll(() => {
  if (typeof globalThis.CSS === 'undefined') {
    (globalThis as { CSS?: unknown }).CSS = {};
  }
  if (typeof CSS.escape !== 'function') {
    CSS.escape = (s: string) => s.replace(/([^\w-])/g, '\\$1');
  }
});

describe('rejectIfMissing rejection contract', () => {
  test('a preserve violation carries the closed type and a hint with both remedies', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span data-czap-id="kept">kept</span>';

    const rejection = rejectIfMissing(Hints.preserveIds('kept', 'cart'), element);

    expect(rejection).not.toBeNull();
    expect(rejection!.type).toBe('preserve_violation');
    expect(rejection!.missingIds).toEqual(['cart']);
    expect(rejection!.reason).toBe(
      'Morph rejected: elements [cart] were required by a preserve hint but are missing from the new HTML.',
    );
    expect(rejection!.hint).toMatch(/data-czap-id elements \[cart\]/);
    expect(rejection!.hint).toMatch(/server HTML/);
    expect(rejection!.hint).toMatch(/drop them from the preserve hint/);
  });

  test('no rejection when all preserve ids are present', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span data-czap-id="cart">cart</span>';

    expect(rejectIfMissing(Hints.preserveIds('cart'), element)).toBeNull();
  });
});
