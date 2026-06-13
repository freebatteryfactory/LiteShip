/**
 * LLM render pipeline — generated UI catalog branch.
 */

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { DEMO_COMPONENT_CATALOG } from '@czap/genui';
import { createLLMRenderPipeline } from '../../../packages/astro/src/runtime/llm-render-pipeline.js';

describe('LLMRenderPipeline.tryRenderGeneratedUI', () => {
  it('parses _genui chunks and invokes host render + emit hooks', () => {
    const pipeline = createLLMRenderPipeline({ mode: 'replace', getDeviceTier: () => 'animations' });
    const events: Array<{ kind: 'render' | 'emit'; renderHash: string }> = [];
    const target = document.createElement('div');

    const host = {
      renderText: () => true,
      renderFrame: () => true,
      emitToken: () => {},
      emitFrame: () => {},
      renderGeneratedUI: (node, renderId) => {
        events.push({ kind: 'render', renderHash: String(renderId) });
        target.textContent = String(node.props.text ?? '');
        return true;
      },
      emitGeneratedUI: (_node, renderId) => {
        events.push({ kind: 'emit', renderHash: String(renderId) });
      },
    };

    const payload = JSON.stringify({ _genui: true, name: 'Text', props: { text: 'catalog path' } });
    expect(pipeline.tryRenderGeneratedUI(payload, host, DEMO_COMPONENT_CATALOG)).toBe(true);
    expect(target.textContent).toBe('catalog path');
    expect(events).toHaveLength(2);
    expect(events[0]!.renderHash).toBe(events[1]!.renderHash);
  });

  it('returns false for legacy token text', () => {
    const pipeline = createLLMRenderPipeline({ mode: 'replace', getDeviceTier: () => 'animations' });
    const host = {
      renderText: () => true,
      renderFrame: () => true,
      emitToken: () => {},
      emitFrame: () => {},
    };
    expect(pipeline.tryRenderGeneratedUI('hello world', host, DEMO_COMPONENT_CATALOG)).toBe(false);
  });
});
