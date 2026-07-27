/**
 * Production CLI subprocess re-exports.
 *
 * The canonical implementation lives at ./internal/spawn.ts so it's part of the
 * cli's tsc --build (rootDir) tree. scripts/lib/spawn.ts is a thin shim
 * pointing at the same file so existing test/script imports keep working.
 *
 * @module
 */

export { spawnArgv, spawnArgvCapture, quoteWindowsArg } from './internal/spawn.js';
export type { SpawnArgvOpts, SpawnResult, SpawnCaptureOpts, SpawnCaptureResult } from './internal/spawn.js';
