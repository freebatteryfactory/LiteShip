/**
 * DOM LLM session host — generated UI catalog integration.
 */

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { DEMO_COMPONENT_CATALOG, renderHash } from '@liteship/genui';
import { createDOMLLMSessionHost } from '../../../packages/astro/src/runtime/llm-session.js';
import { createLLMRenderPipeline } from '../../../packages/astro/src/runtime/llm-render-pipeline.js';

describe('createDOMLLMSessionHost genui integration', () => {
  it('sets data-liteship-genui-render-hash after a successful catalog render', () => {
    const element = document.createElement('section');
    const target = document.createElement('div');
    element.appendChild(target);
    const host = createDOMLLMSessionHost(element, target, { genuiCatalog: DEMO_COMPONENT_CATALOG });

    const tree = { name: 'Text', props: { text: 'wired' } };
    const renderId = renderHash(tree, DEMO_COMPONENT_CATALOG);

    expect(host.renderGeneratedUI?.(tree, renderId)).toBe(true);
    expect(target.dataset.liteshipGenuiRenderHash).toBe(String(renderId));
    expect(target.textContent).toBe('wired');
  });

  it('does not set render hash when validation fails', () => {
    const element = document.createElement('section');
    const target = document.createElement('div');
    element.appendChild(target);
    const host = createDOMLLMSessionHost(element, target, { genuiCatalog: DEMO_COMPONENT_CATALOG });

    const tree = { name: 'Missing', props: {} };
    const renderId = renderHash(tree, DEMO_COMPONENT_CATALOG);

    expect(host.renderGeneratedUI?.(tree, renderId)).toBe(false);
    expect(target.dataset.liteshipGenuiRenderHash).toBeUndefined();
  });

  it('emits liteship:llm-genui with renderHash in detail', () => {
    const element = document.createElement('section');
    const target = document.createElement('div');
    element.appendChild(target);
    const host = createDOMLLMSessionHost(element, target, { genuiCatalog: DEMO_COMPONENT_CATALOG });

    const tree = { name: 'Text', props: { text: 'event' } };
    const renderId = renderHash(tree, DEMO_COMPONENT_CATALOG);
    const handler = vi.fn();
    element.addEventListener('liteship:llm-genui', handler);

    host.emitGeneratedUI?.(tree, renderId);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].detail.renderHash).toBe(renderId);
  });

  it('pipeline end-to-end sets render hash on the session target', () => {
    const element = document.createElement('section');
    const target = document.createElement('div');
    element.appendChild(target);
    const host = createDOMLLMSessionHost(element, target, { genuiCatalog: DEMO_COMPONENT_CATALOG });
    const pipeline = createLLMRenderPipeline({ mode: 'replace', getDeviceTier: () => 'animations' });

    const payload = JSON.stringify({ _genui: true, name: 'Text', props: { text: 'e2e' } });
    expect(pipeline.tryRenderGeneratedUI(payload, host, DEMO_COMPONENT_CATALOG)).toBe(true);
    expect(target.textContent).toBe('e2e');
    expect(target.dataset.liteshipGenuiRenderHash).toBeTruthy();
  });
});
