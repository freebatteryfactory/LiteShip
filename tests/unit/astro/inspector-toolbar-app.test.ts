// @vitest-environment jsdom
/**
 * The dev-toolbar app entrypoint (`addDevToolbarApp` target). `init()` runs as a
 * normal ES module in the MAIN page realm, so it is exercised here directly: a
 * fake toolbar `eventTarget` captures the `onToggled` callback, and toggling
 * open/closed must mount a fresh inspector panel and tear the prior one down.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import app from '../../../packages/astro/src/runtime/inspector-toolbar-app.js';

type ToggleHandler = (event: { state: boolean }) => void;

function fakeToolbar(): { eventTarget: { onToggled: (cb: ToggleHandler) => void }; toggle: (state: boolean) => void } {
  let handler: ToggleHandler | null = null;
  return {
    eventTarget: {
      onToggled: (cb) => {
        handler = cb;
      },
    },
    toggle: (state) => handler?.({ state }),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('inspector dev-toolbar app', () => {
  test('mounts a fresh panel on open and tears it down on close', () => {
    document.body.innerHTML = '<div data-liteship-boundary=\'{"id":"hero","input":"viewport.width","thresholds":[0,768],"states":["compact","wide"]}\'></div>';
    const canvas = document.createElement('div');
    const bar = fakeToolbar();

    app.init(canvas as never, bar.eventTarget as never, undefined as never);

    // Opening renders the inspector panel into the supplied ShadowRoot/canvas.
    bar.toggle(true);
    expect(canvas.children.length).toBeGreaterThan(0);

    // Closing tears the mount down and clears the canvas (no leaked observers).
    bar.toggle(false);
    expect(canvas.children.length).toBe(0);
  });

  test('re-opening replaces the prior mount (reflects the page as it is now)', () => {
    const canvas = document.createElement('div');
    const bar = fakeToolbar();
    app.init(canvas as never, bar.eventTarget as never, undefined as never);

    bar.toggle(true);
    bar.toggle(true); // re-open without an intervening close: still a single fresh mount
    expect(canvas.children.length).toBeGreaterThan(0);

    bar.toggle(false);
    expect(canvas.children.length).toBe(0);
  });

  test('is a default-exported DevToolbarApp with an init function', () => {
    expect(typeof app.init).toBe('function');
  });
});
