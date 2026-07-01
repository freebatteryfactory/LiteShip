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
});
