import type { AsyncOwnedResource } from '@liteship/core';
import { Diagnostics } from '@liteship/core';

/**
 * Dispose an owned resource from a synchronous browser-event boundary.
 *
 * DOM lifecycle events cannot await a returned Promise. This is the one
 * sanctioned adapter for that seam: synchronous finalizers still run during
 * this call, while a later aggregate rejection is observed and emitted through
 * the registered Astro diagnostic surface instead of becoming unhandled.
 */
export function disposeOwnedResourceFromEvent(
  resource: Pick<AsyncOwnedResource, 'dispose'>,
  owner: 'llm' | 'stream' | 'worker',
): void {
  void resource.dispose().catch((error: unknown) => {
    Diagnostics.errorRegistered({
      source: `liteship/astro.${owner}`,
      code: 'astro/runtime/owned-resource-dispose-failed',
      message: `The ${owner} runtime failed while releasing owned state.`,
      detail: error instanceof Error ? error.message : String(error),
    });
  });
}
