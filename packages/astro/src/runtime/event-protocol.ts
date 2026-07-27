/**
 * Astro-runtime-owned LiteShip DOM event protocol declarations.
 *
 * This is a type-only semantic catalog. The fleet generator projects its names,
 * payloads, owners, docs, and producer receipts into `_spine` and Web.
 *
 * @module
 */

import type { UIFrame } from '@liteship/core';
import type { GeneratedUINode } from '@liteship/genui';

type UniformDetail = {
  readonly discrete?: Readonly<Record<string, string>>;
  readonly css?: Readonly<Record<string, string | number>>;
  readonly glsl?: Readonly<Record<string, number>>;
  readonly wgsl?: Readonly<Record<string, unknown>>;
  readonly aria?: Readonly<Record<string, string>>;
  readonly state?: string;
};

/** Astro-owned directive/runtime DOM events and their real emitters. */
export interface OwnedLiteShipEventProtocol {
  'liteship:adaptive-state': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: UniformDetail;
    readonly producers: readonly ['packages/astro/src/runtime/adaptive.ts'];
    readonly description: 'Adaptive boundary state crossing.';
  };
  'liteship:gpu-ready': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/gpu.ts'];
    readonly description: 'GPU shader runtime initialized on the directive host.';
  };
  'liteship:graph-state': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: UniformDetail;
    readonly producers: readonly ['packages/astro/src/runtime/motion.ts', 'packages/astro/src/runtime/scene-bridge.ts'];
    readonly description: 'Discrete graph-runtime state crossing on a bound element.';
  };
  'liteship:llm-done': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly accumulated: string };
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'LLM stream finished with the final accumulated text.';
  };
  'liteship:llm-error': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly message: string } | { readonly reason: string; readonly strategy: string };
    readonly producers: readonly ['packages/astro/src/runtime/llm.ts'];
    readonly description: 'Terminal LLM stream or connection failure.';
  };
  'liteship:llm-frame': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: UIFrame;
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'Structured UI frame emitted during an LLM stream.';
  };
  'liteship:llm-genui': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly node: GeneratedUINode; readonly renderHash: string };
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'Generated-UI tree rendered from the host catalog.';
  };
  'liteship:llm-start': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/llm.ts'];
    readonly description: 'LLM stream opened on the directive host.';
  };
  'liteship:llm-token': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly text: string; readonly accumulated: string };
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'Incremental LLM text token.';
  };
  'liteship:llm-tool-end': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly name: string; readonly args: unknown };
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'LLM tool call completed.';
  };
  'liteship:llm-tool-start': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly name: string };
    readonly producers: readonly ['packages/astro/src/runtime/llm-session.ts'];
    readonly description: 'LLM tool call started.';
  };
  'liteship:reinit': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly [
      'packages/astro/src/runtime/inspector/panel.ts',
      'packages/astro/src/runtime/slots.ts',
      'packages/vite/src/hmr.ts',
    ];
    readonly description: 'Directive re-read after a live or view-transition swap.';
  };
  'liteship:signal': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    /** Intentionally untrusted application payload: consumers validate their own signal schema at admission. */
    readonly detail: unknown;
    readonly producers: readonly ['packages/astro/src/runtime/stream.ts'];
    readonly description: 'SSE signal message payload from the stream directive.';
  };
  'liteship:state': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: UniformDetail;
    readonly producers: readonly ['packages/astro/src/runtime/boundary.ts'];
    readonly description: 'Boundary state crossing with CSS, ARIA, and uniform detail.';
  };
  'liteship:stream-connected': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/stream.ts'];
    readonly description: 'Stream SSE transport connected, including reconnect.';
  };
  'liteship:stream-disconnected': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/stream.ts'];
    readonly description: 'Stream SSE transport disconnected before a possible retry.';
  };
  'liteship:stream-morph': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/stream.ts'];
    readonly description: 'Stream patch morph applied.';
  };
  'liteship:teardown': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/slots.ts'];
    readonly description: 'Final directive teardown and owned-resource release.';
  };
  'liteship:wasm-error': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly url: string; readonly reason: string };
    readonly producers: readonly ['packages/astro/src/runtime/wasm.ts'];
    readonly description: 'WASM kernel load failed.';
  };
  'liteship:wasm-ready': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: { readonly url: string };
    readonly producers: readonly ['packages/astro/src/runtime/wasm.ts'];
    readonly description: 'WASM kernels loaded onto the browser host.';
  };
  'liteship:worker-ready': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: undefined;
    readonly producers: readonly ['packages/astro/src/runtime/worker.ts'];
    readonly description: 'Worker boundary runtime ready on the directive host.';
  };
  'liteship:worker-state': {
    readonly owner: 'astro';
    readonly channel: 'dom';
    readonly detail: UniformDetail;
    readonly producers: readonly ['packages/astro/src/runtime/worker.ts'];
    readonly description: 'Worker boundary state crossing.';
  };
}
