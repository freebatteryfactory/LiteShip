/** Server-side projection from canonical boundary manifests to HMR wire payloads. @module */

import { boundaryAttrIdentity, type Boundary } from '@liteship/core/authoring';
import type { BoundaryManifest } from '@liteship/edge';
import { InvariantViolationError } from '@liteship/error';
import type { BoundaryDefinitionMap } from './boundary-manifest.js';
import type { HMRBoundaryIdentity, HMRPayload } from './hmr.js';

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function identity(boundary: Boundary): HMRBoundaryIdentity {
  return boundaryAttrIdentity(boundary) as unknown as HMRBoundaryIdentity;
}

/**
 * Diff an admitted previous/current manifest pair into deterministic custom
 * HMR messages. New/deleted exports remain Vite module updates; only an
 * existing named boundary has a live content-addressed host to update.
 */
export function createBoundaryHMRPayloads(
  previous: BoundaryManifest,
  current: BoundaryManifest,
  definitions: BoundaryDefinitionMap,
): readonly HMRPayload[] {
  const payloads: HMRPayload[] = [];
  for (const boundaryName of Object.keys(current).sort(codeUnitCompare)) {
    const before = previous[boundaryName];
    const after = current[boundaryName];
    const definition = definitions.get(boundaryName);
    if (before === undefined || after === undefined || definition === undefined) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (definition.primitive.id !== after.id) {
      throw InvariantViolationError(
        'vite.hmr-boundary-identity',
        `boundary HMR identity drift for ${boundaryName}: definition ${definition.primitive.id} != manifest ${after.id}`,
      );
    }
    payloads.push({
      type: 'liteship:update',
      boundaryName,
      previousBoundaryId: before.id,
      boundary: identity(definition.primitive),
      manifest: { id: after.id, outputs: after.outputs, outputsByTier: after.outputsByTier },
    });
  }
  return Object.freeze(payloads);
}
