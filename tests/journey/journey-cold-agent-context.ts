/**
 * journey-cold-agent-context — a cold agent, dropped into the repo with no prior
 * context, asks `liteship context` for its oriented work-list and can NAVIGATE it:
 * every pointer names a file that actually exists.
 *
 * Runs `liteship context --task debug-check-failure --json` and asserts every
 * `pointer.path` resolves to a real file under the repo root — the property that
 * makes the context map trustworthy for an agent (a dangling pointer would send it
 * chasing a file that isn't there).
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { journeyAssert, parseReceipt, REPO_ROOT, runLiteshipCli, type JourneyResult } from './harness.js';

const TASK = 'debug-check-failure';

export async function journeyColdAgentContext(): Promise<JourneyResult> {
  const name = 'journey-cold-agent-context';
  try {
    const result = await runLiteshipCli(['context', '--task', TASK, '--json'], REPO_ROOT);
    journeyAssert(
      result.code === 0,
      `liteship context --task ${TASK} exited ${result.code}\n${result.stderr.slice(-600)}`,
    );

    const receipt = parseReceipt(result.stdout);
    const pointers = receipt['pointers'] as ReadonlyArray<{ path?: string; kind?: string }> | undefined;
    journeyAssert(Array.isArray(pointers) && pointers.length > 0, `context --task ${TASK} returned no pointers`);

    const missing: string[] = [];
    for (const pointer of pointers!) {
      const path = pointer.path;
      journeyAssert(typeof path === 'string' && path.length > 0, 'a context pointer has no path');
      if (!existsSync(resolve(REPO_ROOT, path!))) missing.push(path!);
    }
    journeyAssert(
      missing.length === 0,
      `context pointers name ${missing.length} nonexistent file(s): ${missing.join(', ')}`,
    );

    return {
      name,
      status: 'pass',
      detail: `context --task ${TASK} returned ${pointers!.length} pointers; every pointer.path names a real file in the repo`,
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  }
}
