// @vitest-environment jsdom

import { afterEach, describe, expect, test } from 'vitest';
import { DIRECTIVE_NAMES } from '../../../packages/astro/src/runtime/directive-bound.js';
import {
  collectDirectiveRoots,
  directiveRootSelectors,
  reinitializeDirectives,
  teardownDirectives,
} from '../../../packages/astro/src/runtime/slots.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('catalog-driven Astro directive lifecycle', () => {
  test('every directive contributes canonical, legacy, and bound root selectors', () => {
    for (const name of DIRECTIVE_NAMES) {
      expect(directiveRootSelectors(name)).toEqual(
        expect.arrayContaining([
          `[data-liteship-directive~="${name}"]`,
          `[client\\:${name}]`,
          `[data-liteship-directive-bound~="${name}"]`,
        ]),
      );
    }
  });

  test('collects every catalog spelling once and lifecycle broadcasts once per root', () => {
    const expected = new Set<HTMLElement>();
    for (const name of DIRECTIVE_NAMES) {
      for (const [kind, attribute, value] of [
        ['canonical', 'data-liteship-directive', name],
        ['legacy', `client:${name}`, ''],
        ['bound', 'data-liteship-directive-bound', name],
      ] as const) {
        const root = document.createElement('div');
        root.id = `${name}-${kind}`;
        root.setAttribute(attribute, value);
        document.body.appendChild(root);
        expected.add(root);
      }
    }

    // Multiple matching selectors on one live root must not multiply events.
    const overlap = document.createElement('div');
    overlap.setAttribute('data-liteship-directive', 'adaptive');
    overlap.setAttribute('client:adaptive', '');
    overlap.setAttribute('data-liteship-directive-bound', 'adaptive');
    document.body.appendChild(overlap);
    expected.add(overlap);

    const reinit = new Map<HTMLElement, number>();
    const teardown = new Map<HTMLElement, number>();
    for (const root of expected) {
      root.addEventListener('liteship:reinit', () => reinit.set(root, (reinit.get(root) ?? 0) + 1));
      root.addEventListener('liteship:teardown', () => teardown.set(root, (teardown.get(root) ?? 0) + 1));
    }

    expect(new Set(collectDirectiveRoots(document))).toEqual(expected);
    reinitializeDirectives();
    teardownDirectives();

    expect([...expected].every((root) => reinit.get(root) === 1)).toBe(true);
    expect([...expected].every((root) => teardown.get(root) === 1)).toBe(true);
  });
});
