/**
 * dev — launch a LiteShip dev host, mirroring `liteship build`'s two routes.
 *
 * Consumer-app route: when run in a LiteShip app (a `liteship.config.ts` beside
 * a recognizable host config) with no explicit example/tutorial selector, `dev`
 * delegates to the host framework's own dev server through the consumer's npm or
 * pnpm installation — exactly as `liteship build` delegates the build.
 *
 * In-monorepo examples route (the CLI face of the root `pnpm dev` convenience):
 * resolves the requested example under `examples/<name>` and runs `pnpm --dir
 * examples/<name> dev`. The default host is `examples/showcase`; `--tutorial`
 * selects `examples/tutorial`; `--example <name>` selects any example by
 * directory name. Passing either selector always takes this route.
 *
 * Long-running: it does not return until the spawned dev server exits (Ctrl-C),
 * so the JSON receipt is emitted BEFORE the spawn hands over the terminal.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wallClock } from '@liteship/core';
import { detectHost, type BuildHost } from '../lib/host-detect.js';
import {
  detectProjectPackageManager,
  projectBinaryInvocation,
  UNSUPPORTED_PROJECT_PACKAGE_MANAGER_HINT,
  unsupportedProjectPackageManagerMessage,
  type ProjectPackageManager,
} from '../lib/project-package-manager.js';
import { spawnArgv } from '../lib/spawn.js';
import { emit, emitError, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `liteship dev` when it delegates to the consumer app's own host dev server. */
export interface DevHostReceipt {
  readonly status: 'ok';
  readonly command: 'dev';
  readonly timestamp: WallClockTimestamp;
  readonly host: BuildHost;
  readonly packageManager: ProjectPackageManager;
  readonly mode: 'host';
}

type DevSpawn = typeof spawnArgv;
type DevOptions = { readonly example?: string; readonly tutorial?: boolean; readonly cwd?: string };
type DevCommand = (opts?: DevOptions) => Promise<number>;

/** Resolve the example name from the flag combination (default `showcase`). */
function resolveExample(opts: { example?: string; tutorial?: boolean }): string {
  if (opts.example !== undefined && opts.example.length > 0) return opts.example;
  if (opts.tutorial === true) return 'tutorial';
  return 'showcase';
}

/**
 * Execute `liteship dev [--example <name>] [--tutorial]`. With no explicit
 * selector, inside a LiteShip consumer app (`liteship.config.ts` + a host
 * config), delegates to the host's own dev server (`astro dev` / `vite dev`) and
 * emits a `{ mode: 'host', host }` receipt. Otherwise resolves an example under
 * `examples/<name>` and launches its dev server. Either way it emits a startup
 * receipt, then hands the terminal to the dev server and returns its exit code
 * (0 on a clean shutdown); exits 1 with a diagnostic when there is nothing to
 * launch on the examples route.
 */
export function createDevCommand(spawn: DevSpawn = spawnArgv): DevCommand {
  return async (opts = {}) => {
    const cwd = opts.cwd ?? process.cwd();

    // Consumer-app route (mirrors `liteship build`): no explicit example/tutorial
    // selector, and this cwd is a LiteShip app with a recognizable host config.
    // Delegate to the host's own dev server.
    if (opts.example === undefined && opts.tutorial !== true && existsSync(resolve(cwd, 'liteship.config.ts'))) {
      const host = detectHost(cwd);
      if (host !== null) {
        const detectedManager = detectProjectPackageManager(cwd);
        if (detectedManager.kind === 'unsupported') {
          emitError(
            'dev',
            'cli/config-invalid',
            unsupportedProjectPackageManagerMessage(detectedManager),
            UNSUPPORTED_PROJECT_PACKAGE_MANAGER_HINT,
          );
          return 1;
        }
        const packageManager = detectedManager.manager;
        const receipt: DevHostReceipt = {
          status: 'ok',
          command: 'dev',
          timestamp: new Date(wallClock.now()).toISOString(),
          host,
          packageManager,
          mode: 'host',
        };
        // Receipt BEFORE the spawn: the dev server is long-running/interactive and
        // never returns until Ctrl-C, so stdout must carry the JSON receipt first.
        emit(receipt);
        const invocation = projectBinaryInvocation(packageManager, host, ['dev']);
        return (await spawn(invocation.command, invocation.args, { stdio: 'inherit', cwd })).exitCode;
      }
    }

    // In-monorepo examples route (honors --example / --tutorial).
    const example = resolveExample(opts);
    const exampleRel = `examples/${example}`;
    const exampleDir = resolve(cwd, exampleRel);
    if (!existsSync(resolve(exampleDir, 'package.json'))) {
      emitError(
        'dev',
        'cli/not-found',
        `no example app at ${exampleRel} (expected ${exampleRel}/package.json) — run inside a LiteShip app (liteship.config.ts + astro/vite config), or from a dir with ${exampleRel}`,
        'List the available examples: ls examples/',
      );
      return 1;
    }

    emit({
      status: 'ok',
      command: 'dev',
      timestamp: new Date(wallClock.now()).toISOString(),
      example,
      dir: exampleRel,
    });

    // Mirror the root `pnpm dev` shape (`pnpm --dir examples/<name> dev`). Inherit
    // stdio so the dev server is fully interactive; the process blocks here until
    // the child exits, and its exit code becomes ours.
    const result = await spawn('pnpm', ['--dir', exampleRel, 'dev'], { stdio: 'inherit', cwd });
    return result.exitCode;
  };
}

const runDev = createDevCommand();

/** Execute the production dev route with the real subprocess capability. */
export async function dev(opts: DevOptions = {}): Promise<number> {
  return runDev(opts);
}
