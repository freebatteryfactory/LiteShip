// @vitest-environment jsdom

/**
 * The single ordered `astro:after-swap` pipeline (F-1).
 *
 * Order is DATA, not listener-registration luck: the pipeline walks an explicit
 * `[rescanSlots, bootDirectives, reinitDirectives]` array. These tests pin both
 * the declared order AND that one after-swap runs every step in that sequence.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  installSwapPipeline,
  runSwapPipeline,
  SWAP_STEPS,
} from '../../../packages/astro/src/runtime/swap-pipeline.js';
import { getSlotRegistry } from '../../../packages/astro/src/runtime/slots.js';

type PipelineWindow = Window & {
  __LITESHIP_SLOT_REGISTRY__?: unknown;
  __LITESHIP_SLOTS__?: unknown;
  __LITESHIP_SWAP_PIPELINE__?: boolean;
};

function reset(): void {
  const w = window as PipelineWindow;
  delete w.__LITESHIP_SLOT_REGISTRY__;
  delete w.__LITESHIP_SLOTS__;
  delete w.__LITESHIP_SWAP_PIPELINE__;
  document.body.innerHTML = '';
}

afterEach(() => {
  reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('swap pipeline', () => {
  test('declares the steps in the load-bearing order, as data', () => {
    expect(SWAP_STEPS.map((step) => step.name)).toEqual(['rescanSlots', 'bootDirectives', 'reinitDirectives']);
  });

  test('runSwapPipeline rescans slots BEFORE reinitializing directives', () => {
    document.body.innerHTML = `
      <section data-liteship-slot="/next" data-liteship-mode="partial"></section>
      <div id="widget" data-liteship-boundary='{"id":"hero","input":"viewport.width","thresholds":[0],"states":["compact"]}'></div>
    `;

    const order: string[] = [];
    // The slot rescan (step 1) writes the registry; record when the registry first
    // sees /next. The reinit (step 3) dispatches liteship:reinit; record that too.
    document.getElementById('widget')?.addEventListener('liteship:reinit', () => {
      order.push(`reinit:slotKnown=${getSlotRegistry().get('/next' as never) !== undefined}`);
    });

    runSwapPipeline(['adaptive']);

    // By the time reinit fired, the slot rescan had already registered /next — i.e.
    // step 1 ran strictly before step 3.
    expect(order).toEqual(['reinit:slotKnown=true']);
    expect(getSlotRegistry().get('/next' as never)?.mode).toBe('partial');
  });

  test('installSwapPipeline wires exactly one after-swap listener and runs the steps on swap', () => {
    document.body.innerHTML = `<div id="widget" data-liteship-boundary='{"id":"h","input":"viewport.width","thresholds":[0],"states":["c"]}'></div>`;
    const addSpy = vi.spyOn(document, 'addEventListener');

    installSwapPipeline(['adaptive']);
    installSwapPipeline(['adaptive']); // idempotent — no second listener

    expect(addSpy.mock.calls.filter(([type]) => type === 'astro:after-swap')).toHaveLength(1);

    let reinits = 0;
    document.getElementById('widget')?.addEventListener('liteship:reinit', () => {
      reinits += 1;
    });

    document.dispatchEvent(new Event('astro:after-swap'));
    expect(reinits).toBe(1);
  });
});
