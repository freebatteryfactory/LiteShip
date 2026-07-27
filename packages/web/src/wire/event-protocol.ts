/**
 * Web-owned LiteShip event protocol declarations.
 *
 * This type-only catalog is the semantic source consumed by the fleet event
 * projection generator. Runtime names, documentation, and `_spine` types are
 * generated from these owner declarations; do not mirror the list elsewhere.
 *
 * @module
 */

import type { GraphMutationResponse } from '@liteship/core';
import type { IslandMode, MorphRejection, SlotPath } from '../types.js';

/** Web-owned DOM events and the source files that really emit them. */
export interface OwnedLiteShipEventProtocol {
  'liteship:morph-rejected': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: MorphRejection & { readonly recovery?: string };
    readonly producers: readonly ['packages/web/src/morph/diff.ts'];
    readonly description: 'Morph preserve constraint violated.';
  };
  'liteship:mutation': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: GraphMutationResponse;
    readonly producers: readonly ['packages/web/src/graph-form.ts'];
    readonly description: 'Graph mutation channel response after form submit.';
  };
  'liteship:request-snapshot': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: { readonly reason: string; readonly domStale?: boolean };
    readonly producers: readonly ['packages/web/src/morph/diff.ts', 'packages/astro/src/runtime/stream.ts'];
    readonly description: 'Recovery fetch requested after morph rejection or a receipt gap.';
  };
  'liteship:slot-mounted': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: {
      readonly path: SlotPath;
      readonly mode: IslandMode;
    };
    readonly producers: readonly ['packages/web/src/slot/registry.ts'];
    readonly description: 'Slot registry registered a data-liteship-slot element.';
  };
  'liteship:slot-unmounted': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: {
      readonly path: SlotPath;
      readonly mode?: IslandMode;
    };
    readonly producers: readonly ['packages/web/src/slot/registry.ts'];
    readonly description: 'Slot registry removed a slot path.';
  };
  'liteship:stream-error': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: { readonly reason: string; readonly message?: string };
    readonly producers: readonly ['packages/web/src/stream/recovery.ts', 'packages/astro/src/runtime/stream.ts'];
    readonly description: 'Stream transport, resumption, or recovery failed.';
  };
  'liteship:uniform-update': {
    readonly owner: 'web';
    readonly channel: 'dom';
    readonly detail: {
      readonly discrete?: Readonly<Record<string, string>>;
      readonly css?: Readonly<Record<string, string | number>>;
      readonly glsl?: Readonly<Record<string, number>>;
      readonly wgsl?: Readonly<Record<string, unknown>>;
      readonly aria?: Readonly<Record<string, string>>;
      readonly state?: string;
    };
    readonly producers: readonly [
      'packages/astro/src/runtime/boundary.ts',
      'packages/astro/src/runtime/scene-bridge.ts',
      'packages/astro/src/runtime/uniform-signal.ts',
      'packages/astro/src/runtime/write-continuous-map.ts',
      'packages/vite/src/hmr.ts',
    ];
    readonly description: 'Live CSS, GLSL, WGSL, ARIA, and state values for runtime consumers.';
  };
}
