/**
 * Provisional detect script — the render-blocking head-inline script that writes
 * the cheap device attributes and a PROVISIONAL `data-liteship-tier` before any
 * module graph or GPU probe exists.
 *
 * The provisional tier is no longer a hand-rolled cap ladder. An earlier release
 * inlined its OWN low-core / low-memory thresholds here that DIFFERED from
 * canonical `headProbeCapTier` — and since both this script and the deferred
 * {@link DETECT_UPGRADE_SCRIPT} write `data-liteship-tier`, the provisional value
 * disagreed with canonical by construction (the exact 0.2.3/0.3.0 detect-ladder
 * drift bug-class).
 *
 * This module removes that hand-copy: the script is GENERATED from canonical
 * `@liteship/detect` by {@link emitProvisionalDetectScript}, which emits the SAME
 * `headProbeCapTier` ladder verbatim and feeds it the inline primitives with the
 * conservative GPU fallback the runtime sweep itself uses when no renderer probe
 * is available. The provisional tier therefore IS canonical for a GPU-unknown
 * device, and the deferred upgrade re-runs the same function with the real GPU
 * tier. One ladder, two callers — they cannot drift.
 *
 * @module
 */

import { emitProvisionalDetectScript } from '@liteship/detect';

/**
 * Provisional head-inline detect script, DERIVED from canonical `@liteship/detect`.
 * Injected via `injectScript('head-inline', ...)` by the integration so it runs
 * before hydration; the deferred {@link DETECT_UPGRADE_SCRIPT} later refines the
 * tier with a real GPU probe. The cap-tier rule inside is the canonical
 * `headProbeCapTier`, never hand-copied, so it stays in lockstep by construction.
 */
export const DETECT_INLINE_SCRIPT: string = emitProvisionalDetectScript();
