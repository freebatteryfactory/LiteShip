// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest';
import { DIRECTIVE_ATTRIBUTE_REGISTRY } from '../../../packages/astro/src/runtime/slots.js';

type RegistryDirectiveName = keyof typeof DIRECTIVE_ATTRIBUTE_REGISTRY;

function markBound(element: HTMLElement, name: string): void {
  const names = new Set((element.getAttribute('data-liteship-directive-bound') ?? '').split(/\s+/).filter(Boolean));
  names.add(name);
  element.setAttribute('data-liteship-directive-bound', [...names].join(' '));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Astro directive boot scanner', () => {
  test('boots plain stream elements once and skips already hydrated islands', async () => {
    const initStreamDirective = vi.fn();
    const streamDirective = vi.fn((load: () => Promise<unknown>, _opts: Record<string, unknown>, el: HTMLElement) => {
      markBound(el, 'stream');
      initStreamDirective(load, el);
    });
    const loaders = {
      stream: () => Promise.resolve({ default: streamDirective }),
    };

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    document.body.innerHTML = `
      <div id="plain" data-liteship-stream-url="/api/plain"></div>
      <div id="island" data-liteship-stream-url="/api/island"></div>
    `;

    const plain = document.getElementById('plain')!;
    const island = document.getElementById('island')!;

    streamDirective(() => Promise.resolve(), {}, island);
    expect(island.getAttribute('data-liteship-directive-bound')).toBe('stream');

    await scanAndBootDirectives(['stream'], document, loaders);

    expect(initStreamDirective).toHaveBeenCalledTimes(2);
    expect(initStreamDirective.mock.calls.map(([, element]) => element)).toEqual([island, plain]);
    expect(plain.getAttribute('data-liteship-directive-bound')).toBe('stream');

    await scanAndBootDirectives(['stream'], document, loaders);
    expect(initStreamDirective).toHaveBeenCalledTimes(2);
  });

  test('boots every implicit plain-element attribute from the slots registry', async () => {
    const calls = {
      stream: vi.fn(),
      llm: vi.fn(),
      gpu: vi.fn(),
      wasm: vi.fn(),
      graph: vi.fn(),
      motion: vi.fn(),
    };
    const entry = (name: keyof typeof calls) =>
      vi.fn((load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => {
        markBound(el, name);
        calls[name](load, opts, el);
      });
    const loaders = {
      stream: () => Promise.resolve({ default: entry('stream') }),
      llm: () => Promise.resolve({ default: entry('llm') }),
      gpu: () => Promise.resolve({ default: entry('gpu') }),
      wasm: () => Promise.resolve({ default: entry('wasm') }),
      graph: () => Promise.resolve({ default: entry('graph') }),
      motion: () => Promise.resolve({ default: entry('motion') }),
    };

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');
    const implicitEntries = Object.entries(DIRECTIVE_ATTRIBUTE_REGISTRY).flatMap(([name, entries]) =>
      entries
        .filter((entry) => entry.implicitBoot)
        .map((entry) => ({ name: name as RegistryDirectiveName, attribute: entry.attribute })),
    );

    expect(implicitEntries.map((entry) => entry.name).filter((name) => !(name in calls))).toEqual([]);

    for (const { name, attribute } of implicitEntries) {
      const element = document.createElement('div');
      element.id = `implicit-${name}`;
      element.setAttribute(attribute, attribute === 'data-liteship-wasm' ? 'true' : `/${String(name)}`);
      document.body.appendChild(element);
    }

    await scanAndBootDirectives(
      implicitEntries.map((entry) => entry.name),
      document,
      loaders,
    );

    for (const { name } of implicitEntries) {
      const call = calls[name as keyof typeof calls];
      const element = document.getElementById(`implicit-${name}`);
      expect(call, `missing test mock for implicit directive ${String(name)}`).toBeDefined();
      expect(call).toHaveBeenCalledTimes(1);
      expect(call.mock.calls[0]?.some((arg) => arg === element)).toBe(true);
      expect(element?.getAttribute('data-liteship-directive-bound')).toBe(name);
    }
  });

  test('warns once when a bare boundary payload has no explicit directive marker', async () => {
    const { Diagnostics } = await import('@liteship/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    const bare = document.createElement('div');
    bare.setAttribute('data-liteship-boundary', '{}');
    document.body.appendChild(bare);

    await scanAndBootDirectives([]);
    await scanAndBootDirectives([]);

    const warnings = events.filter(
      (event) => event.code === 'astro/directive-boot/directive-attribute-requires-marker',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      source: 'liteship/astro.directive-boot',
      detail: { attribute: 'data-liteship-boundary' },
    });
    expect(warnings[0]?.message).toContain('Fix:');

    const marked = document.createElement('div');
    marked.setAttribute('data-liteship-boundary', '{}');
    marked.setAttribute('data-liteship-directive', 'adaptive');
    document.body.replaceChildren(marked);

    Diagnostics.clearOnce();
    events.length = 0;
    await scanAndBootDirectives([]);

    expect(events.some((event) => event.code === 'astro/directive-boot/directive-attribute-requires-marker')).toBe(
      false,
    );
  });

  test('warns for a bare boundary payload even beside a non-consuming implicit peer (gpu)', async () => {
    const { Diagnostics } = await import('@liteship/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    // data-liteship-boundary (an adaptive/worker payload) beside a gpu shader attr, but NO
    // adaptive/worker marker. gpu does not evaluate the boundary, so it stays inert --
    // the marker warning must still fire, not be suppressed by the non-consuming peer.
    const el = document.createElement('div');
    el.setAttribute('data-liteship-boundary', '{}');
    el.setAttribute('data-liteship-shader-src', '/shader.frag');
    document.body.appendChild(el);

    await scanAndBootDirectives([]);

    const warnings = events.filter(
      (event) => event.code === 'astro/directive-boot/directive-attribute-requires-marker',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.detail).toEqual({ attribute: 'data-liteship-boundary' });
  });

  test('bootDirectiveEntry initializes once; a second call for the same directive is a no-op', async () => {
    // Guards the double-boot: the scanner can activate an implicit-attribute element
    // before Astro hydrates the same node as an island. Both paths route through
    // bootDirectiveEntry, and the runtime initializers are not idempotent (a second
    // call opens a duplicate EventSource / worker / shader session).
    const { bootDirectiveEntry, boundNames } = await import('../../../packages/astro/src/runtime/directive-bound.js');

    const el = document.createElement('div');
    let inits = 0;
    const init = (): void => {
      inits += 1;
    };

    bootDirectiveEntry('stream', () => Promise.resolve(), {}, el, init);
    bootDirectiveEntry('stream', () => Promise.resolve(), {}, el, init);

    expect(inits).toBe(1);
    expect(boundNames(el).has('stream')).toBe(true);
  });

  test('scanAndBootDirectives warns once when one element carries two enabled directive markers', async () => {
    // Collision is marker-based and detected at scan time, so it fires even for a
    // directive whose own tier gate would no-op it before boot. Inject no-op
    // directive entries through the scanner's `loaders` seam so the warning is
    // isolated from real directive side effects — no client-directive module mocking.
    const noop = (): void => {};
    const loaders = {
      adaptive: () => Promise.resolve({ default: noop }),
      gpu: () => Promise.resolve({ default: noop }),
    };

    const { Diagnostics } = await import('@liteship/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    const el = document.createElement('div');
    el.setAttribute('data-liteship-directive', 'adaptive gpu');
    document.body.appendChild(el);

    await scanAndBootDirectives(['adaptive', 'gpu'], document, loaders);

    const collisions = events.filter((event) => event.code === 'astro/directive-boot/directive-collision');
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.detail).toEqual({ conflicting: ['adaptive', 'gpu'] });
    expect(collisions[0]?.message).toContain('Fix:');
  });
});
