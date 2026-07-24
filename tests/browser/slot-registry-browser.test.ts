import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { SlotRegistry } from '../../packages/web/src/slot/registry.js';
import { captureDiagnostics } from '../helpers/diagnostics.js';

describe('browser SlotRegistry with real MutationObserver', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('section');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Diagnostics.reset();
  });

  test('scanDOM discovers all data-liteship-slot elements in a subtree', () => {
    root.innerHTML = `
      <div data-liteship-slot="/header"></div>
      <div data-liteship-slot="/content">
        <div data-liteship-slot="/content/sidebar"></div>
      </div>
    `;

    const registry = SlotRegistry.create();
    SlotRegistry.scanDOM(registry, root);

    expect(registry.has('/header' as never)).toBe(true);
    expect(registry.has('/content' as never)).toBe(true);
    expect(registry.has('/content/sidebar' as never)).toBe(true);
  });

  test('scanDOM ignores elements with invalid slot paths', () => {
    root.innerHTML = `
      <div data-liteship-slot="/valid"></div>
      <div data-liteship-slot="no-leading-slash"></div>
      <div data-liteship-slot="/has spaces"></div>
    `;

    captureDiagnostics(({ events }) => {
      const registry = SlotRegistry.create();
      SlotRegistry.scanDOM(registry, root);

      expect(registry.has('/valid' as never)).toBe(true);
      expect(registry.has('no-leading-slash' as never)).toBe(false);
      expect(registry.has('/has spaces' as never)).toBe(false);
      expect(events).toEqual([
        expect.objectContaining({
          level: 'warn',
          source: 'liteship/web.SlotRegistry',
          code: 'invalid-slot-path',
        }),
        expect.objectContaining({
          level: 'warn',
          source: 'liteship/web.SlotRegistry',
          code: 'invalid-slot-path',
        }),
      ]);
    });
  });

  test('scanDOM reads data-mode and data-liteship-mode attributes', () => {
    root.innerHTML = `
      <div data-liteship-slot="/a" data-mode="replace"></div>
      <div data-liteship-slot="/b" data-liteship-mode="full"></div>
      <div data-liteship-slot="/c"></div>
    `;

    const registry = SlotRegistry.create();
    SlotRegistry.scanDOM(registry, root);

    expect(registry.get('/a' as never)?.mode).toBe('replace');
    expect(registry.get('/b' as never)?.mode).toBe('full');
    expect(registry.get('/c' as never)?.mode).toBe('partial');
  });

  test('register dispatches liteship:slot-mounted event on the element', () => {
    const registry = SlotRegistry.create();
    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/test');
    root.appendChild(el);

    const events: unknown[] = [];
    el.addEventListener('liteship:slot-mounted', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

    registry.register({
      path: '/test' as never,
      element: el,
      mode: 'partial',
      mounted: true,
    });

    expect(events).toEqual([{ path: '/test', mode: 'partial' }]);
  });

  test('unregister dispatches liteship:slot-unmounted event on document', () => {
    const registry = SlotRegistry.create();
    const el = document.createElement('div');
    root.appendChild(el);

    const events: unknown[] = [];
    document.addEventListener('liteship:slot-unmounted', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

    registry.register({
      path: '/removable' as never,
      element: el,
      mode: 'partial',
      mounted: true,
    });
    registry.unregister('/removable' as never);

    expect(registry.has('/removable' as never)).toBe(false);
    expect(events).toEqual([{ path: '/removable', mode: 'partial' }]);
  });

  test('findByPrefix returns all slots matching a prefix', () => {
    const registry = SlotRegistry.create();
    SlotRegistry.scanDOM(registry, root);

    root.innerHTML = `
      <div data-liteship-slot="/nav"></div>
      <div data-liteship-slot="/nav/links"></div>
      <div data-liteship-slot="/nav/logo"></div>
      <div data-liteship-slot="/footer"></div>
    `;
    SlotRegistry.scanDOM(registry, root);

    const navSlots = registry.findByPrefix('/nav' as never);
    expect(navSlots).toHaveLength(3);

    const footerSlots = registry.findByPrefix('/footer' as never);
    expect(footerSlots).toHaveLength(1);
  });

  test('entries returns a snapshot of all registered slots', () => {
    root.innerHTML = `
      <div data-liteship-slot="/a"></div>
      <div data-liteship-slot="/b"></div>
    `;

    const registry = SlotRegistry.create();
    SlotRegistry.scanDOM(registry, root);

    const entries = registry.entries();
    expect(entries.size).toBe(2);
    expect(entries.has('/a' as never)).toBe(true);
    expect(entries.has('/b' as never)).toBe(true);
  });

  test('findElement locates a real DOM element by slot path', () => {
    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/find-me');
    el.id = 'target-el';
    document.body.appendChild(el);

    const found = SlotRegistry.findElement('/find-me' as never);
    expect(found).toBe(el);
    expect(found?.id).toBe('target-el');
  });

  test('findElement returns null for non-existent slot paths', () => {
    const found = SlotRegistry.findElement('/does-not-exist' as never);
    expect(found).toBeNull();
  });

  test('getPath extracts the slot path from a DOM element', () => {
    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/hero');

    expect(SlotRegistry.getPath(el)).toBe('/hero');
  });

  test('getPath returns null for invalid or missing slot paths', () => {
    const noSlot = document.createElement('div');
    expect(SlotRegistry.getPath(noSlot)).toBeNull();

    const badSlot = document.createElement('div');
    badSlot.setAttribute('data-liteship-slot', 'invalid');
    expect(SlotRegistry.getPath(badSlot)).toBeNull();
  });

  test('observe auto-registers dynamically added slot elements via MutationObserver', async () => {
    const registry = SlotRegistry.create();

    const dispose = SlotRegistry.observe(registry, root);

    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/dynamic');
    root.appendChild(el);

    // MutationObserver fires asynchronously; wait for microtask
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/dynamic' as never)).toBe(true);

    dispose();
  });

  test('observe auto-unregisters removed slot elements', async () => {
    const registry = SlotRegistry.create();

    const dispose = SlotRegistry.observe(registry, root);

    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/transient');
    root.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/transient' as never)).toBe(true);

    el.remove();
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/transient' as never)).toBe(false);

    dispose();
  });

  test('observe picks up nested slot elements added as part of a subtree', async () => {
    const registry = SlotRegistry.create();

    const dispose = SlotRegistry.observe(registry, root);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
            <div data-liteship-slot="/nested/a"></div>
            <div data-liteship-slot="/nested/b"></div>
          `;
    root.appendChild(wrapper);

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/nested/a' as never)).toBe(true);
    expect(registry.has('/nested/b' as never)).toBe(true);

    dispose();
  });

  test('observe handles attribute changes on data-liteship-slot', async () => {
    const registry = SlotRegistry.create();

    const dispose = SlotRegistry.observe(registry, root);

    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/original');
    root.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/original' as never)).toBe(true);

    el.setAttribute('data-liteship-slot', '/renamed');
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(registry.has('/original' as never)).toBe(false);
    expect(registry.has('/renamed' as never)).toBe(true);

    dispose();
  });

  test('observer disconnects when its disposer runs', async () => {
    const registry = SlotRegistry.create();

    const dispose = SlotRegistry.observe(registry, root);
    dispose();

    // After disposal, adding elements should NOT auto-register
    const el = document.createElement('div');
    el.setAttribute('data-liteship-slot', '/after-scope');
    root.appendChild(el);

    await new Promise<void>((r) => setTimeout(r, 10));
    expect(registry.has('/after-scope' as never)).toBe(false);
  });
});
