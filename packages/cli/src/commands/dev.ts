/**
 * dev — launch a LiteShip dev host by spawning an example app's own dev server.
 *
 * This is the CLI face of the root `pnpm dev` convenience: it resolves the
 * requested example under `examples/<name>` and runs `pnpm --dir examples/<name>
 * dev`, inheriting stdio so the dev server is interactive. The default host is
 * `examples/showcase`; `--tutorial` selects `examples/tutorial`; `--example
 * <name>` selects any example by directory name.
 *
 * Long-running: it does not return until the spawned dev server exits (Ctrl-C).
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wallClock } from '@liteship/core';
import { spawnArgv } from '../lib/spawn.js';
import { emit, emitError } from '../receipts.js';

/** Resolve the example name from the flag combination (default `showcase`). */
function resolveExample(opts: { example?: string; tutorial?: boolean }): string {
  if (opts.example !== undefined && opts.example.length > 0) return opts.example;
  if (opts.tutorial === true) return 'tutorial';
  return 'showcase';
}

/**
 * Execute `liteship dev [--example <name>] [--tutorial]`. Emits a startup receipt
 * naming the resolved example, then hands the terminal to the example app's dev
 * server. Returns the dev server's exit code (0 on a clean shutdown); exits 1 with
 * a diagnostic when the named example has no app to launch.
 */
export async function dev(opts: { example?: string; tutorial?: boolean; cwd?: string } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const example = resolveExample(opts);
  const exampleRel = `examples/${example}`;
  const exampleDir = resolve(cwd, exampleRel);
  if (!existsSync(resolve(exampleDir, 'package.json'))) {
    emitError(
      'dev',
      `no example app at ${exampleRel} (expected ${exampleRel}/package.json)`,
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
  const result = await spawnArgv('pnpm', ['--dir', exampleRel, 'dev'], { stdio: 'inherit', cwd });
  return result.exitCode;
}
