/**
 * Dev inspector overlay — keyboard toggle and lazy loader.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installInspectorLoader } from '../../packages/astro/src/runtime/inspector-loader.js';
import { isInspectorOverlayVisible } from '../../packages/astro/src/runtime/inspector.js';

describe('astro dev inspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.querySelector('czap-inspector')?.remove();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
  });

  afterEach(() => {
    document.querySelector('czap-inspector')?.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('Alt+Shift+C toggles the overlay after lazy import', async () => {
    installInspectorLoader();
    expect(isInspectorOverlayVisible()).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'C', code: 'KeyC', altKey: true, shiftKey: true, bubbles: true }),
    );

    await vi.waitFor(() => {
      expect(document.querySelector('czap-inspector')).not.toBeNull();
    });
    expect(isInspectorOverlayVisible()).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'C', code: 'KeyC', altKey: true, shiftKey: true, bubbles: true }),
    );
    expect(isInspectorOverlayVisible()).toBe(false);
  });
});
