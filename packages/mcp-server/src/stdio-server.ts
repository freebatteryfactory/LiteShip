/**
 * MCP stdio server bootstrap. Provides the tsx direct-invoke entrypoint
 * for `tests/integration/mcp/stdio-spawn.test.ts`. Excluded from
 * coverage because the only way to exercise this guard is by spawning
 * the script as the entrypoint of a Node process — which is what the
 * integration test does. The pure read-line-write loop lives in
 * `stdio.ts` (`runStdio` / `processLine`) and is fully unit-tested.
 *
 * @module
 */

import { runStdio } from './stdio.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function isDirectEntrypoint(moduleUrl: string, argvPath: string | undefined): boolean {
  return argvPath !== undefined && pathToFileURL(resolve(argvPath)).href === moduleUrl;
}

if (isDirectEntrypoint(import.meta.url, process.argv[1])) {
  runStdio().catch((err: unknown) => {
    process.stderr.write(JSON.stringify({ error: String(err) }) + '\n');
    process.exit(1);
  });
}
