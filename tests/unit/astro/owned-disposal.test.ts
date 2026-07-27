// @vitest-environment node
/** Executable law for event-driven hosts of the one async disposal protocol. */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { disposeOwnedResourceFromEvent } from '../../../packages/astro/src/runtime/owned-disposal.js';

afterEach(() => {
  Diagnostics.reset();
});

describe('disposeOwnedResourceFromEvent', () => {
  test('runs synchronous teardown in the event turn and reports a later rejection', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const sideEffects: string[] = [];
    const failure = new Error('host cleanup failed');
    const dispose = vi.fn(() => {
      sideEffects.push('released');
      return Promise.reject(failure);
    });

    disposeOwnedResourceFromEvent({ dispose }, 'worker');

    expect(sideEffects).toEqual(['released']);
    expect(dispose).toHaveBeenCalledOnce();
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'error',
        source: 'liteship/astro.worker',
        code: 'astro/runtime/owned-resource-dispose-failed',
        detail: 'host cleanup failed',
      }),
    );
  });

  test('does not manufacture a diagnostic for a successful release', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    disposeOwnedResourceFromEvent({ dispose: () => Promise.resolve() }, 'stream');
    await Promise.resolve();

    expect(events).toEqual([]);
  });
});
