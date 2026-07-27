/** Scene-dev-owned fleet event declaration. @module */

/** Scene's custom HMR update channel. */
export interface OwnedLiteShipEventProtocol {
  'liteship:scene-update': {
    readonly owner: 'scene';
    readonly channel: 'vite-hmr';
    readonly detail: { readonly sceneId: string };
    readonly producers: readonly ['packages/scene/src/dev/server.ts'];
    readonly description: 'Scene source changed while preserving the development playhead.';
  };
}
