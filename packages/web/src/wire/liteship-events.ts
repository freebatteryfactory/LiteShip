/**
 * Single source for the runtime `liteship:*` CustomEvent vocabulary and payload shapes.
 * {@link dispatchLiteshipEvent} and {@link onLiteship} project from this map so a fabricated
 * event name (e.g. `liteship:stream-reconnecting`) is a compile error, not a shipped bug.
 *
 * @module
 */

import type { GraphMutationResponse, UIFrame } from '@liteship/core';
import type { GeneratedUINode } from '@liteship/genui';
import type { IslandMode, MorphRejection, SlotPath } from '../types.js';

/** Uniform / boundary payload carried by state and GPU update events. */
export interface LiteshipUniformUpdateDetail {
  readonly discrete?: Record<string, string>;
  readonly css?: Record<string, string | number>;
  readonly glsl?: Record<string, number>;
  readonly wgsl?: Record<string, unknown>;
  readonly aria?: Record<string, string>;
  /** Discrete crossing label on `liteship:graph-state`. */
  readonly state?: string;
}

/** `liteship:morph-rejected` — preserve constraint violation with optional recovery hint. */
export interface LiteshipMorphRejectedDetail extends MorphRejection {
  readonly recovery?: string;
}

/** `liteship:stream-error` — transport or resumption failure. */
export interface LiteshipStreamErrorDetail {
  readonly reason: string;
  readonly message?: string;
}

/** `liteship:llm-error` — terminal stream error or unrecoverable connection loss. */
export type LiteshipLlmErrorDetail =
  { readonly message: string } | { readonly reason: string; readonly strategy: string };

/**
 * Canonical `liteship:*` event names and their `CustomEvent.detail` shapes.
 * Events with `undefined` detail omit `detail` on dispatch.
 */
export interface LiteshipEventDetailMap {
  'liteship:graph-state': LiteshipUniformUpdateDetail;
  'liteship:gpu-ready': undefined;
  'liteship:llm-done': { readonly accumulated: string };
  'liteship:llm-error': LiteshipLlmErrorDetail;
  'liteship:llm-frame': UIFrame;
  'liteship:llm-genui': { readonly node: GeneratedUINode; readonly renderHash: string };
  'liteship:llm-start': undefined;
  'liteship:llm-token': { readonly text: string; readonly accumulated: string };
  'liteship:llm-tool-end': { readonly name: string; readonly args: unknown };
  'liteship:llm-tool-start': { readonly name: string };
  'liteship:morph-rejected': LiteshipMorphRejectedDetail;
  'liteship:mutation': GraphMutationResponse;
  'liteship:reinit': undefined;
  'liteship:request-snapshot': {
    readonly reason: string;
    /**
     * Whether the rendered DOM is known STALE (overrides the recovery binding's default).
     * A morph-rejection trigger omits it (the binding treats the DOM as stale). A trigger
     * whose DOM is intact — a receipt-only resume that applies a state crossing without any
     * failed morph — passes `false` so recovery gap-replays the crossing WITHOUT an
     * unnecessary snapshot floor (which would false-error absent a snapshot URL, or needlessly
     * replace fresh DOM).
     */
    readonly domStale?: boolean;
  };
  'liteship:adaptive-state': LiteshipUniformUpdateDetail;
  'liteship:signal': unknown;
  'liteship:slot-mounted': { readonly path: SlotPath; readonly mode: IslandMode };
  'liteship:slot-unmounted': { readonly path: SlotPath; readonly mode?: IslandMode };
  'liteship:state': LiteshipUniformUpdateDetail;
  'liteship:stream-connected': undefined;
  'liteship:stream-disconnected': undefined;
  'liteship:stream-error': LiteshipStreamErrorDetail;
  'liteship:stream-morph': undefined;
  'liteship:teardown': undefined;
  'liteship:uniform-update': LiteshipUniformUpdateDetail;
  'liteship:wasm-error': { readonly url: string; readonly reason: string };
  'liteship:wasm-ready': { readonly url: string };
  'liteship:worker-ready': undefined;
  'liteship:worker-state': LiteshipUniformUpdateDetail;
}

/** Exhaustive event-name list — docs and drift guards derive `expected` from this. */
export const LITESHIP_EVENT_NAMES = [
  'liteship:graph-state',
  'liteship:gpu-ready',
  'liteship:llm-done',
  'liteship:llm-error',
  'liteship:llm-frame',
  'liteship:llm-genui',
  'liteship:llm-start',
  'liteship:llm-token',
  'liteship:llm-tool-end',
  'liteship:llm-tool-start',
  'liteship:morph-rejected',
  'liteship:mutation',
  'liteship:reinit',
  'liteship:request-snapshot',
  'liteship:adaptive-state',
  'liteship:signal',
  'liteship:slot-mounted',
  'liteship:slot-unmounted',
  'liteship:state',
  'liteship:stream-connected',
  'liteship:stream-disconnected',
  'liteship:stream-error',
  'liteship:stream-morph',
  'liteship:teardown',
  'liteship:uniform-update',
  'liteship:wasm-error',
  'liteship:wasm-ready',
  'liteship:worker-ready',
  'liteship:worker-state',
] as const satisfies readonly (keyof LiteshipEventDetailMap)[];

/** Union of all canonical `liteship:*` event names. */
export type LiteshipEventName = (typeof LITESHIP_EVENT_NAMES)[number];

/** Short human descriptions for generated wire-contract docs. */
export const LITESHIP_EVENT_DOCS: Record<LiteshipEventName, string> = {
  'liteship:graph-state': 'Discrete graph-runtime state crossing on a bound element.',
  'liteship:gpu-ready': 'GPU shader runtime initialized on the directive host.',
  'liteship:llm-done': 'LLM stream finished; carries final accumulated text.',
  'liteship:llm-error': 'Terminal server-side LLM stream error.',
  'liteship:llm-frame': 'Structured UI frame emitted mid-stream.',
  'liteship:llm-genui': 'Generated-UI tree rendered from the host catalog.',
  'liteship:llm-start': 'LLM stream opened on the directive host.',
  'liteship:llm-token': 'Incremental LLM text token.',
  'liteship:llm-tool-end': 'Tool call completed.',
  'liteship:llm-tool-start': 'Tool call started.',
  'liteship:morph-rejected': 'Morph preserve constraint violated.',
  'liteship:mutation': 'Graph mutation channel response after form submit.',
  'liteship:reinit': 'Directive re-read after a view-transition swap (not final teardown).',
  'liteship:request-snapshot': 'Recovery fetch requested after morph rejection.',
  'liteship:adaptive-state': 'Adaptive boundary state crossing.',
  'liteship:signal': 'SSE `signal` message payload from the stream directive.',
  'liteship:slot-mounted': 'Slot registry registered a `data-liteship-slot` element.',
  'liteship:slot-unmounted': 'Slot registry removed a slot path.',
  'liteship:state': 'Boundary state crossing (CSS/ARIA/uniform detail).',
  'liteship:stream-connected': 'Stream SSE transport connected (includes post-reconnect).',
  'liteship:stream-disconnected': 'Stream SSE transport lost; reconnect may follow.',
  'liteship:stream-error': 'Stream transport or resumption failed.',
  'liteship:stream-morph': 'Stream patch morph applied (one event per flushed patch).',
  'liteship:teardown': 'Final directive teardown — release observers, do not re-init.',
  'liteship:uniform-update': 'GPU/uniform consumers: live CSS/GLSL/WGSL values.',
  'liteship:wasm-error': 'WASM kernel load failed.',
  'liteship:wasm-ready': 'WASM kernels loaded onto `window.__LITESHIP_WASM__`.',
  'liteship:worker-ready': 'Worker boundary runtime ready on the directive host.',
  'liteship:worker-state': 'Worker boundary state crossing.',
};
