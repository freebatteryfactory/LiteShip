/**
 * Defaults on the worker host surfaces:
 *
 * - CompositorWorker.addQuantizer accepts a Boundary.make result directly,
 *   deriving the registration (name defaults to boundary.input) instead of
 *   demanding a hand-assembled { id, states, thresholds } with a hand-typed
 *   ContentAddress.
 * - WorkerHost.startRender only requires durationMs: width/height default to
 *   the attached canvas's dimensions (captured at attachCanvas time) and fps
 *   defaults to 60.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Boundary } from '@czap/core';
import { CompositorWorker, WorkerHost } from '@czap/worker';
import { MockWorker } from '../../helpers/mock-worker.js';
import { mockCanvas } from '../../helpers/mock-dom.js';

let restoreWorker: () => void;

beforeEach(() => {
  restoreWorker = MockWorker.install();

  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:mock-url';
  URL.revokeObjectURL = () => {};
  (globalThis as { __origURLCreate?: typeof URL.createObjectURL }).__origURLCreate = origCreate;
  (globalThis as { __origURLRevoke?: typeof URL.revokeObjectURL }).__origURLRevoke = origRevoke;
});

afterEach(() => {
  restoreWorker();
  const g = globalThis as {
    __origURLCreate?: typeof URL.createObjectURL;
    __origURLRevoke?: typeof URL.revokeObjectURL;
  };
  if (g.__origURLCreate) {
    URL.createObjectURL = g.__origURLCreate;
    URL.revokeObjectURL = g.__origURLRevoke!;
  }
});

describe('CompositorWorker.addQuantizer boundary-first form', () => {
  test('registers under boundary.input with derived states', () => {
    const cw = CompositorWorker.create();
    const brightness = Boundary.make({
      input: 'brightness',
      at: [
        [0, 'dim'],
        [0.5, 'bright'],
      ],
    });

    cw.addQuantizer(brightness);

    expect(cw.runtime.hasQuantizer('brightness')).toBe(true);
    cw.dispose();
  });

  test('explicit-name form still registers under the given name', () => {
    const cw = CompositorWorker.create();
    const brightness = Boundary.make({
      input: 'brightness',
      at: [
        [0, 'dim'],
        [0.5, 'bright'],
      ],
    });

    cw.addQuantizer('custom-name', brightness);

    expect(cw.runtime.hasQuantizer('custom-name')).toBe(true);
    expect(cw.runtime.hasQuantizer('brightness')).toBe(false);
    cw.dispose();
  });
});

describe('WorkerHost.startRender defaults', () => {
  test('width/height default to the attached canvas dimensions, fps to 60', () => {
    const host = WorkerHost.create();
    host.attachCanvas(mockCanvas(1280, 720));

    host.startRender({ durationMs: 1234 });

    const renderWorker = MockWorker.instances[1]!;
    const startRender = renderWorker.postedMessages
      .map((m) => m.data as { type: string; config?: unknown })
      .find((m) => m.type === 'start-render');
    expect(startRender?.config).toEqual({ durationMs: 1234, fps: 60, width: 1280, height: 720 });
    host.dispose();
  });

  test('explicit fields win over the defaults', () => {
    const host = WorkerHost.create();
    host.attachCanvas(mockCanvas(1280, 720));

    host.startRender({ durationMs: 1000, fps: 30, width: 320, height: 240 });

    const renderWorker = MockWorker.instances[1]!;
    const startRender = renderWorker.postedMessages
      .map((m) => m.data as { type: string; config?: unknown })
      .find((m) => m.type === 'start-render');
    expect(startRender?.config).toEqual({ durationMs: 1000, fps: 30, width: 320, height: 240 });
    host.dispose();
  });
});
