/**
 * Subprocess helper — re-export of the canonical impl now in
 * `@czap/command/host` (CUT A1 capstone-1). Kept at this path so the CLI's many
 * import sites, `scripts/lib/spawn.ts`, and the spawn drift-guard tests resolve
 * unchanged. The CLI no longer hoards the host impl; it consumes it from
 * `@czap/command/host`.
 *
 * @module
 */
export {
  spawnArgv,
  spawnArgvVisible,
  spawnArgvCapture,
  withSpawned,
  startSpawnHandle,
  quoteWindowsArg,
} from '@czap/command/host';
export type { SpawnResult, SpawnArgvOpts, SpawnCaptureResult, SpawnCaptureOpts, SpawnHandle } from '@czap/command/host';
