/** Detect-owned fleet event declaration. @module */

import type { DetectReadyDetail } from './detect-ready.js';

/** The Detect head probe owns one settle event on the DOM channel. */
export interface OwnedLiteShipEventProtocol {
  'liteship:detect-ready': {
    readonly owner: 'detect';
    readonly channel: 'dom';
    readonly detail: DetectReadyDetail;
    readonly producers: readonly ['packages/detect/src/head-probe.ts'];
    readonly description: 'Capability detection settled on either the success or error path.';
  };
}
