/**
 * THE CANONICAL CAPABILITY SYMBOL TABLE (browser-safe runtime) — the sibling of
 * {@link file://./capabilities.ts} for capability probes that must run in a REAL browser, where
 * `node:fs` / `process` / spawn are unavailable.
 *
 * The sanctioned probes span runtimes (node vitest / real-browser vitest / Playwright). The
 * `tests/browser/**` suite runs under `vitest.browser.config.ts` in an actual browser, so its
 * capability probe cannot import the node module. This module therefore carries ONLY browser-safe
 * probes (a `typeof <global>` feature test — zero node imports). The capability-gate linker reads
 * BOTH this module and the node `capabilities.ts` as ONE symbol table: each export here is a probe,
 * the export NAME is the capability id (camelCase ↔ kebab — `sharedArrayBufferAbsent` ↔
 * `shared-array-buffer-absent`), and a sanctioned browser skip's guard must link to its export.
 *
 * @module
 */

/** `shared-array-buffer-absent` — `SharedArrayBuffer` is not available (no COOP/COEP cross-origin isolation). */
export const sharedArrayBufferAbsent = typeof SharedArrayBuffer === 'undefined';
