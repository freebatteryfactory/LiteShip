/**
 * `@czap/command/host` — Node host execution for the command registry. The
 * canonical home for spawn, the vitest runner, the ffmpeg render backend, the
 * idempotency cache, manifest-path resolution, and the shared
 * `createNodeCommandContext()` factory. The CLI and MCP adapters both build
 * their injected I/O from here; neither hoards host infra, and the MCP server
 * never imports the CLI.
 *
 * Importing this pulls Node-coupled code (child_process, fs, ffmpeg). The pure
 * `@czap/command` main entry (registry, descriptors, handlers, types) does NOT
 * import this — keep that boundary intact.
 *
 * @module
 */
export { createNodeCommandContext } from './context.js';
export {
  spawnArgv,
  spawnArgvVisible,
  spawnArgvCapture,
  withSpawned,
  startSpawnHandle,
  quoteWindowsArg,
} from './spawn.js';
export type { SpawnResult, SpawnArgvOpts, SpawnCaptureResult, SpawnCaptureOpts, SpawnHandle } from './spawn.js';
export { VitestRunner } from './vitest-runner.js';
export { renderWithFfmpeg } from './ffmpeg.js';
export type { RenderOpts, RenderResult } from './ffmpeg.js';
export { ffmpegRenderCapable, probeFfmpegRender } from './ffmpeg-probe.js';
export type { FfmpegRenderProbe } from './ffmpeg-probe.js';
export { tryReadCache, writeCache, hashInputs, cachePath, currentEnvFingerprint } from './idempotency.js';
export type { IdempotencyCtx } from './idempotency.js';
export { getCapsuleManifestPath } from './manifest-path.js';
export { runPlumbScan } from './plumb-scan.js';
