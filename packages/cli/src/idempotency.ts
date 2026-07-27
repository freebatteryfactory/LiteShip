/**
 * Content-addressed idempotency — re-export of the canonical impl now in
 * `@liteship/command/host` (CUT A1 capstone-1). Kept at this path so CLI commands
 * and the idempotency tests resolve unchanged.
 *
 * @module
 */
export { hashInputs, cachePath, tryReadCache, writeCache } from '@liteship/command/host';
export type { IdempotencyCtx } from '@liteship/command/host';
