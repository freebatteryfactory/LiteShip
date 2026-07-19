/**
 * Re-export shim. The canonical spawn helper now lives in
 * @liteship/cli (packages/cli/src/lib/spawn.ts) so it can be part of the
 * cli's tsc --build (rootDir) tree. This file preserves the existing
 * import path used by tests and other scripts.
 *
 * @module
 */

export {
  spawnArgv,
  spawnArgvCapture,
  spawnArgvVisible,
  quoteWindowsArg,
  withSpawned,
  startSpawnHandle,
} from '../../packages/cli/src/lib/spawn.js';
export type {
  SpawnArgvOpts,
  SpawnCaptureOpts,
  SpawnCaptureResult,
  SpawnResult,
  SpawnHandle,
} from '../../packages/cli/src/lib/spawn.js';
