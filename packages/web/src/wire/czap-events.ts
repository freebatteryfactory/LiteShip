/**
 * Single source for the runtime `czap:*` CustomEvent vocabulary and payload shapes.
 * {@link dispatchCzapEvent} and {@link onCzap} project from this map so a fabricated
 * event name (e.g. `czap:stream-reconnecting`) is a compile error, not a shipped bug.
 *
 * @module
 */

import type { GraphMutationResponse, UIFrame } from '@czap/core';
import type { GeneratedUINode } from '@czap/genui';
import type { IslandMode, MorphRejection, SlotPath } from '../types.js';

/** Uniform / boundary payload carried by state and GPU update events. */
export interface CzapUniformUpdateDetail {
  readonly discrete?: Record<string, string>;
  readonly css?: Record<string, string | number>;
  readonly glsl?: Record<string, number>;
  readonly wgsl?: Record<string, unknown>;
  readonly aria?: Record<string, string>;
  /** Discrete crossing label on `czap:graph-state`. */
  readonly state?: string;
}

/** `czap:morph-rejected` — preserve constraint violation with optional recovery hint. */
export interface CzapMorphRejectedDetail extends MorphRejection {
  readonly recovery?: string;
}

/** `czap:stream-error` — transport or resumption failure. */
export interface CzapStreamErrorDetail {
  readonly reason: string;
  readonly message?: string;
}

/** `czap:llm-error` — terminal stream error or unrecoverable connection loss. */
export type CzapLlmErrorDetail = { readonly message: string } | { readonly reason: string; readonly strategy: string };

/**
 * Canonical `czap:*` event names and their `CustomEvent.detail` shapes.
 * Events with `undefined` detail omit `detail` on dispatch.
 */
export interface CzapEventDetailMap {
  'czap:graph-state': CzapUniformUpdateDetail;
  'czap:gpu-ready': undefined;
  'czap:llm-done': { readonly accumulated: string };
  'czap:llm-error': CzapLlmErrorDetail;
  'czap:llm-frame': UIFrame;
  'czap:llm-genui': { readonly node: GeneratedUINode; readonly renderHash: string };
  'czap:llm-start': undefined;
  'czap:llm-token': { readonly text: string; readonly accumulated: string };
  'czap:llm-tool-end': { readonly name: string; readonly args: unknown };
  'czap:llm-tool-start': { readonly name: string };
  'czap:morph-rejected': CzapMorphRejectedDetail;
  'czap:mutation': GraphMutationResponse;
  'czap:reinit': undefined;
  'czap:request-snapshot': {
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
  'czap:satellite-state': CzapUniformUpdateDetail;
  'czap:signal': unknown;
  'czap:slot-mounted': { readonly path: SlotPath; readonly mode: IslandMode };
  'czap:slot-unmounted': { readonly path: SlotPath; readonly mode?: IslandMode };
  'czap:state': CzapUniformUpdateDetail;
  'czap:stream-connected': undefined;
  'czap:stream-disconnected': undefined;
  'czap:stream-error': CzapStreamErrorDetail;
  'czap:stream-morph': undefined;
  'czap:teardown': undefined;
  'czap:uniform-update': CzapUniformUpdateDetail;
  'czap:wasm-error': { readonly url: string; readonly reason: string };
  'czap:wasm-ready': { readonly url: string };
  'czap:worker-ready': undefined;
  'czap:worker-state': CzapUniformUpdateDetail;
}

/** Exhaustive event-name list — docs and drift guards derive `expected` from this. */
export const CZAP_EVENT_NAMES = [
  'czap:graph-state',
  'czap:gpu-ready',
  'czap:llm-done',
  'czap:llm-error',
  'czap:llm-frame',
  'czap:llm-genui',
  'czap:llm-start',
  'czap:llm-token',
  'czap:llm-tool-end',
  'czap:llm-tool-start',
  'czap:morph-rejected',
  'czap:mutation',
  'czap:reinit',
  'czap:request-snapshot',
  'czap:satellite-state',
  'czap:signal',
  'czap:slot-mounted',
  'czap:slot-unmounted',
  'czap:state',
  'czap:stream-connected',
  'czap:stream-disconnected',
  'czap:stream-error',
  'czap:stream-morph',
  'czap:teardown',
  'czap:uniform-update',
  'czap:wasm-error',
  'czap:wasm-ready',
  'czap:worker-ready',
  'czap:worker-state',
] as const satisfies readonly (keyof CzapEventDetailMap)[];

/** Union of all canonical `czap:*` event names. */
export type CzapEventName = (typeof CZAP_EVENT_NAMES)[number];

/** Short human descriptions for generated wire-contract docs. */
export const CZAP_EVENT_DOCS: Record<CzapEventName, string> = {
  'czap:graph-state': 'Discrete graph-runtime state crossing on a bound element.',
  'czap:gpu-ready': 'GPU shader runtime initialized on the directive host.',
  'czap:llm-done': 'LLM stream finished; carries final accumulated text.',
  'czap:llm-error': 'Terminal server-side LLM stream error.',
  'czap:llm-frame': 'Structured UI frame emitted mid-stream.',
  'czap:llm-genui': 'Generated-UI tree rendered from the host catalog.',
  'czap:llm-start': 'LLM stream opened on the directive host.',
  'czap:llm-token': 'Incremental LLM text token.',
  'czap:llm-tool-end': 'Tool call completed.',
  'czap:llm-tool-start': 'Tool call started.',
  'czap:morph-rejected': 'Morph preserve constraint violated.',
  'czap:mutation': 'Graph mutation channel response after form submit.',
  'czap:reinit': 'Directive re-read after a view-transition swap (not final teardown).',
  'czap:request-snapshot': 'Recovery fetch requested after morph rejection.',
  'czap:satellite-state': 'Satellite boundary state crossing.',
  'czap:signal': 'SSE `signal` message payload from the stream directive.',
  'czap:slot-mounted': 'Slot registry registered a `data-czap-slot` element.',
  'czap:slot-unmounted': 'Slot registry removed a slot path.',
  'czap:state': 'Boundary state crossing (CSS/ARIA/uniform detail).',
  'czap:stream-connected': 'Stream SSE transport connected (includes post-reconnect).',
  'czap:stream-disconnected': 'Stream SSE transport lost; reconnect may follow.',
  'czap:stream-error': 'Stream transport or resumption failed.',
  'czap:stream-morph': 'Stream patch morph applied (one event per flushed patch).',
  'czap:teardown': 'Final directive teardown — release observers, do not re-init.',
  'czap:uniform-update': 'GPU/uniform consumers: live CSS/GLSL/WGSL values.',
  'czap:wasm-error': 'WASM kernel load failed.',
  'czap:wasm-ready': 'WASM kernels loaded onto `window.__CZAP_WASM__`.',
  'czap:worker-ready': 'Worker boundary runtime ready on the directive host.',
  'czap:worker-state': 'Worker boundary state crossing.',
};
