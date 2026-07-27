/** Vite-owned fleet event declaration. @module */

import type { HMRPayload } from './hmr.js';

/** Vite's custom HMR update channel. */
export interface OwnedLiteShipEventProtocol {
  'liteship:update': {
    readonly owner: 'vite';
    readonly channel: 'vite-hmr';
    readonly detail: HMRPayload;
    // The feature-edge census verifies this source path contains the typed
    // custom-channel send; a catalog string alone cannot manufacture authority.
    readonly producers: readonly ['packages/vite/src/plugin.ts'];
    readonly description: 'Compiled boundary CSS or uniforms changed during development.';
  };
}
