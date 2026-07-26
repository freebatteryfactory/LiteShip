// @vitest-environment jsdom
/** Generated DOM morph identity laws over the public pure kernel. @module */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { morphPure } from '@liteship/web/lite';

const semanticId = fc.integer({ min: 0, max: 1_000_000 }).map((value) => `node-${value}`);

function markup(ids: readonly string[]): string {
  return ids.map((id) => `<p data-liteship-id="${id}">${id}</p>`).join('');
}

describe('morph semantic identity model', () => {
  test('reordering preserves exactly the nodes with equal semantic identities', () => {
    fc.assert(
      fc.property(fc.uniqueArray(semanticId, { minLength: 1, maxLength: 24 }), (ids) => {
        const root = document.createElement('div');
        root.innerHTML = markup(ids);
        const originals = new Map(
          [...root.children].map((element) => [element.getAttribute('data-liteship-id')!, element] as const),
        );
        const reversed = [...ids].reverse();

        morphPure(root, markup(reversed));

        expect([...root.children].map((element) => element.getAttribute('data-liteship-id'))).toEqual(reversed);
        for (const element of root.children) {
          expect(element).toBe(originals.get(element.getAttribute('data-liteship-id')!));
        }
      }),
      { seed: 0x1d1d5, numRuns: 100 },
    );
  });

  test('different identities replace while an explicit idMap preserves identity', () => {
    fc.assert(
      fc.property(semanticId, semanticId, (oldId, incomingId) => {
        fc.pre(oldId !== incomingId);

        const replacedRoot = document.createElement('div');
        replacedRoot.innerHTML = markup([oldId]);
        const replacedBefore = replacedRoot.firstElementChild;
        morphPure(replacedRoot, markup([incomingId]));
        expect(replacedRoot.firstElementChild).not.toBe(replacedBefore);

        const remappedRoot = document.createElement('div');
        remappedRoot.innerHTML = markup([oldId]);
        const remappedBefore = remappedRoot.firstElementChild;
        morphPure(remappedRoot, markup([incomingId]), undefined, {
          idMap: new Map([[incomingId, oldId]]),
        });
        expect(remappedRoot.firstElementChild).toBe(remappedBefore);
        expect(remappedRoot.firstElementChild?.getAttribute('data-liteship-id')).toBe(oldId);
      }),
      { seed: 0x1d5a9, numRuns: 100 },
    );
  });

  test('opaque islands retain node identity and contents while generated siblings continue morphing', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (oldValue, nextValue) => {
        const root = document.createElement('div');
        root.innerHTML =
          `<section data-liteship-id="island" data-liteship-morph-opaque>` +
          `<p>${oldValue}</p></section><span data-liteship-id="mutable">${oldValue}</span>`;
        const island = root.firstElementChild;
        const islandHTML = island?.innerHTML;

        morphPure(
          root,
          `<section data-liteship-id="island" data-liteship-morph-opaque>` +
            `<p>${nextValue}</p></section><span data-liteship-id="mutable">${nextValue}</span>`,
        );

        expect(root.firstElementChild).toBe(island);
        expect(root.firstElementChild?.innerHTML).toBe(islandHTML);
        expect(root.querySelector('[data-liteship-id="mutable"]')?.textContent).toBe(String(nextValue));
      }),
      { seed: 0x0fa9e, numRuns: 100 },
    );
  });
});
