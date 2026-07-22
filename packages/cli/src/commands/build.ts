/**
 * build — build a LiteShip consumer app by delegating to its host's own build.
 *
 * A consumer app is recognized by a `liteship.config.ts` in the working
 * directory. The actual build is the host framework's: an Astro app
 * (`astro.config.*`) builds with `pnpm exec astro build`; a Vite app
 * (`vite.config.*`) builds with `pnpm exec vite build`. The host's build output
 * is piped to stderr so this command's stdout stays a single JSON receipt.
 *
 * If there is no `liteship.config.ts`, or no recognizable host config beside it,
 * the command emits a clear diagnostic instead of guessing.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wallClock } from '@liteship/core';
import { detectHost, type BuildHost } from '../lib/host-detect.js';
import { spawnArgvVisible } from '../lib/spawn.js';
import { emit, emitError, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `liteship build`. */
export interface BuildReceipt {
  readonly status: 'ok' | 'failed';
  readonly command: 'build';
  readonly timestamp: WallClockTimestamp;
  readonly host: BuildHost;
  readonly exitCode: number;
}

type BuildSpawn = typeof spawnArgvVisible;
type BuildCommand = (opts?: { readonly cwd?: string }) => Promise<number>;

/**
 * Bind the one outbound build capability to the command logic.
 *
 * This factory is intentionally absent from `@liteship/cli`'s public package
 * entrypoint. Production binds the canonical visible spawn below; in-process
 * command tests bind a scripted host boundary so they execute every decision
 * and receipt branch without mocking an internal module or launching a real
 * framework build.
 *
 * @internal
 */
export function createBuildCommand(spawn: BuildSpawn = spawnArgvVisible): BuildCommand {
  return async (opts = {}) => {
    const cwd = opts.cwd ?? process.cwd();

    if (!existsSync(resolve(cwd, 'liteship.config.ts'))) {
      emitError(
        'build',
        'no liteship.config.ts in the current directory — `liteship build` runs a consumer app build',
        'Run it from a LiteShip app directory, or scaffold one: npm create liteship',
      );
      return 1;
    }

    const host = detectHost(cwd);
    if (host === null) {
      emitError(
        'build',
        'found liteship.config.ts but no host build config (astro.config.* / vite.config.*) beside it',
        'Add your host framework config, then re-run `liteship build`',
      );
      return 1;
    }

    const buildArgs = host === 'astro' ? ['exec', 'astro', 'build'] : ['exec', 'vite', 'build'];
    const result = await spawn('pnpm', buildArgs, { cwd });

    const receipt: BuildReceipt = {
      status: result.exitCode === 0 ? 'ok' : 'failed',
      command: 'build',
      timestamp: new Date(wallClock.now()).toISOString(),
      host,
      exitCode: result.exitCode,
    };
    emit(receipt);
    return result.exitCode;
  };
}

const runBuild = createBuildCommand();

/**
 * Execute `liteship build`. Detects `liteship.config.ts` + the host backend in
 * `cwd`, runs the host build (`astro build` / `vite build`), and emits a JSON
 * receipt with the host + exit code. Exit 0 on a clean build; 1 when there is no
 * consumer app or no recognizable host; otherwise the build's own nonzero exit.
 */
export async function build(opts: { cwd?: string } = {}): Promise<number> {
  return runBuild(opts);
}
