/**
 * GPU probe upgrade -- replaces the provisional tier with full detection.
 *
 * Runs after DOMContentLoaded (not render-blocking). Creates a throwaway
 * WebGL context, reads the GPU renderer string, classifies the GPU tier, and
 * updates the `<html>` element attributes.
 *
 * The probe runs in the document `<head>` before any module graph exists, so
 * it CANNOT import `@czap/detect` at runtime. Earlier releases re-typed the
 * classifier + tier ladders inline — and the 0.2.3 "detect-ladder" cut shipped
 * a real drift bug when that hand-copy silently diverged from canonical.
 *
 * The script is no longer hand-written: it is GENERATED from canonical
 * `@czap/detect` by `emitDetectUpgradeScript`, which folds the head probe's
 * classifier from the one `GPU_TIER_PATTERNS` datum and emits the canonical
 * cap-level / motion ladder functions verbatim. There is one source for each
 * rule; this module is a derived artifact, so it cannot drift.
 *
 * @module
 */

import { emitDetectUpgradeScript } from '@czap/detect';

/**
 * Inline GPU-probe script, DERIVED from canonical `@czap/detect`. Injected via
 * `injectScript('page', ...)` by the integration; deferred to DOMContentLoaded
 * so it never blocks rendering. Every classification rule inside is generated
 * from the canonical patterns + ladders — never hand-copied — so it stays in
 * lockstep with the runtime sweep by construction.
 */
export const DETECT_UPGRADE_SCRIPT: string = emitDetectUpgradeScript();
