// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest';
import { DIRECTIVE_ATTRIBUTE_REGISTRY } from '../../../packages/astro/src/runtime/slots.js';

type RegistryDirectiveName = keyof typeof DIRECTIVE_ATTRIBUTE_REGISTRY;

function markBound(element: HTMLElement, name: string): void {
  const names = new Set((element.getAttribute('data-czap-directive-bound') ?? '').split(/\s+/).filter(Boolean));
  names.add(name);
  element.setAttribute('data-czap-directive-bound', [...names].join(' '));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock('../../../packages/astro/src/runtime/graph-directive.js');
  vi.doUnmock('../../../packages/astro/src/runtime/gpu.js');
  vi.doUnmock('../../../packages/astro/src/runtime/llm.js');
  vi.doUnmock('../../../packages/astro/src/runtime/stream.js');
  vi.doUnmock('../../../packages/astro/src/runtime/wasm.js');
  vi.doUnmock('../../../packages/astro/src/client-directives/satellite.js');
  vi.doUnmock('../../../packages/astro/src/client-directives/gpu.js');
});

describe('Astro directive boot scanner', () => {
  test('boots plain stream elements once and skips already hydrated islands', async () => {
    const initStreamDirective = vi.fn();
    const streamDirective = vi.fn((load: () => Promise<unknown>, _opts: Record<string, unknown>, el: HTMLElement) => {
      markBound(el, 'stream');
      initStreamDirective(load, el);
    });
    vi.doMock('../../../packages/astro/src/runtime/stream.js', () => ({ initStreamDirective, streamDirective }));

    const { default: exportedStreamDirective } =
      await import('../../../packages/astro/src/client-directives/stream.js');
    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    document.body.innerHTML = `
      <div id="plain" data-czap-stream-url="/api/plain"></div>
      <div id="island" data-czap-stream-url="/api/island"></div>
    `;

    const plain = document.getElementById('plain')!;
    const island = document.getElementById('island')!;

    exportedStreamDirective(() => Promise.resolve(), {}, island);
    expect(island.getAttribute('data-czap-directive-bound')).toBe('stream');

    await scanAndBootDirectives(['stream']);

    expect(initStreamDirective).toHaveBeenCalledTimes(2);
    expect(initStreamDirective.mock.calls.map(([, element]) => element)).toEqual([island, plain]);
    expect(plain.getAttribute('data-czap-directive-bound')).toBe('stream');

    await scanAndBootDirectives(['stream']);
    expect(initStreamDirective).toHaveBeenCalledTimes(2);
  });

  test('boots every implicit plain-element attribute from the slots registry', async () => {
    const calls = {
      stream: vi.fn(),
      llm: vi.fn(),
      gpu: vi.fn(),
      wasm: vi.fn(),
      graph: vi.fn(),
    };
    const entry = (name: keyof typeof calls) =>
      vi.fn((load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => {
        markBound(el, name);
        calls[name](load, opts, el);
      });
    vi.doMock('../../../packages/astro/src/runtime/stream.js', () => ({
      initStreamDirective: calls.stream,
      streamDirective: entry('stream'),
    }));
    vi.doMock('../../../packages/astro/src/runtime/llm.js', () => ({
      initLLMDirective: calls.llm,
      llmDirective: entry('llm'),
    }));
    vi.doMock('../../../packages/astro/src/runtime/gpu.js', () => ({
      initGPUDirective: calls.gpu,
      gpuDirective: entry('gpu'),
    }));
    vi.doMock('../../../packages/astro/src/runtime/wasm.js', () => ({
      loadWasmRuntime: calls.wasm,
      wasmDirective: entry('wasm'),
    }));
    vi.doMock('../../../packages/astro/src/runtime/graph-directive.js', () => ({
      initGraphDirective: calls.graph,
      graphDirective: entry('graph'),
    }));

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
      element.setAttribute(attribute, attribute === 'data-czap-wasm' ? 'true' : `/${String(name)}`);
      document.body.appendChild(element);
    }

    await scanAndBootDirectives(implicitEntries.map((entry) => entry.name));

    for (const { name } of implicitEntries) {
      const call = calls[name as keyof typeof calls];
      const element = document.getElementById(`implicit-${name}`);
      expect(call, `missing test mock for implicit directive ${String(name)}`).toBeDefined();
      expect(call).toHaveBeenCalledTimes(1);
      expect(call.mock.calls[0]?.some((arg) => arg === element)).toBe(true);
      expect(element?.getAttribute('data-czap-directive-bound')).toBe(name);
    }
  });

  test('warns once when a bare boundary payload has no explicit directive marker', async () => {
    const { Diagnostics } = await import('@czap/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    const bare = document.createElement('div');
    bare.setAttribute('data-czap-boundary', '{}');
    document.body.appendChild(bare);

    await scanAndBootDirectives([]);
    await scanAndBootDirectives([]);

    const warnings = events.filter((event) => event.code === 'directive-attribute-requires-marker:data-czap-boundary');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      source: 'czap/astro.directive-boot',
      detail: { attribute: 'data-czap-boundary' },
    });
    expect(warnings[0]?.message).toContain('Fix:');

    const marked = document.createElement('div');
    marked.setAttribute('data-czap-boundary', '{}');
    marked.setAttribute('data-czap-directive', 'satellite');
    document.body.replaceChildren(marked);

    Diagnostics.clearOnce();
    events.length = 0;
    await scanAndBootDirectives([]);

    expect(events.some((event) => event.code === 'directive-attribute-requires-marker:data-czap-boundary')).toBe(false);
  });

  test('warns for a bare boundary payload even beside a non-consuming implicit peer (gpu)', async () => {
    const { Diagnostics } = await import('@czap/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    // data-czap-boundary (a satellite/worker payload) beside a gpu shader attr, but NO
    // satellite/worker marker. gpu does not evaluate the boundary, so it stays inert --
    // the marker warning must still fire, not be suppressed by the non-consuming peer.
    const el = document.createElement('div');
    el.setAttribute('data-czap-boundary', '{}');
    el.setAttribute('data-czap-shader-src', '/shader.frag');
    document.body.appendChild(el);

    await scanAndBootDirectives([]);

    const warnings = events.filter((event) => event.code === 'directive-attribute-requires-marker:data-czap-boundary');
    expect(warnings).toHaveLength(1);
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
    // directive whose own tier gate would no-op it before boot. Mock the entrypoints
    // so the warning is isolated from real directive side effects.
    vi.doMock('../../../packages/astro/src/client-directives/satellite.js', () => ({ default: vi.fn() }));
    vi.doMock('../../../packages/astro/src/client-directives/gpu.js', () => ({ default: vi.fn() }));

    const { Diagnostics } = await import('@czap/core');
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);

    const { scanAndBootDirectives } = await import('../../../packages/astro/src/runtime/directive-boot.js');

    const el = document.createElement('div');
    el.setAttribute('data-czap-directive', 'satellite gpu');
    document.body.appendChild(el);

    await scanAndBootDirectives(['satellite', 'gpu']);

    const collisions = events.filter((event) => event.code === 'directive-collision:gpu+satellite');
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.message).toContain('Fix:');
  });
});
