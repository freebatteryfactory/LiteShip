/**
 * journey-cold-agent-context — a cold agent, dropped into the repo with no prior
 * context, asks `liteship context` for its oriented work-list and can NAVIGATE it:
 * every pointer names a real file AND the returned packet contains enough
 * semantic landmarks to carry out the selected debugging task.
 *
 * Runs `liteship context --task debug-check-failure --json` and asserts every
 * `pointer.path` resolves to a real file under the repo root — the property that
 * makes the context map trustworthy for an agent (a dangling pointer would send it
 * chasing a file that isn't there).
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import { journeyAssert, parseReceipt, REPO_ROOT, runLiteshipCli, type JourneyResult } from './harness.js';

const TASK = 'debug-check-failure';

/** Load-bearing landmarks a cold debugger needs, not merely paths that exist. */
const REQUIRED_LANDMARKS: Readonly<Record<string, string>> = {
  'packages/command/src/commands/check.ts': 'checkGatesCommand',
  'packages/cli/src/commands/check.ts': 'check gates',
  'packages/gauntlet/src/engine.ts': 'runGates',
  'packages/gauntlet/src/finding.ts': 'ruleId',
  'packages/error/src/codes.ts': 'DIAGNOSTIC_REGISTRY',
  'tests/unit/command/check.test.ts': 'checkGatesCommand',
};

export async function journeyColdAgentContext(): Promise<JourneyResult> {
  const name = 'journey-cold-agent-context';
  try {
    const result = await runLiteshipCli(['context', '--task', TASK, '--json'], REPO_ROOT);
    journeyAssert(
      result.code === 0,
      `liteship context --task ${TASK} exited ${result.code}\n${result.stderr.slice(-600)}`,
    );

    const receipt = parseReceipt(result.stdout);
    journeyAssert(
      typeof receipt['summary'] === 'string' &&
        receipt['summary'].includes('Finding') &&
        receipt['summary'].includes('liteship explain'),
      'context summary does not state the Finding → explain debugging workflow',
    );

    const pointers = receipt['pointers'] as
      ReadonlyArray<{ path?: string; kind?: string; note?: string; checkId?: string | null }> | undefined;
    journeyAssert(Array.isArray(pointers) && pointers.length > 0, `context --task ${TASK} returned no pointers`);

    const missing: string[] = [];
    const kinds = new Set<string>();
    for (const pointer of pointers!) {
      const path = pointer.path;
      journeyAssert(typeof path === 'string' && path.length > 0, 'a context pointer has no path');
      journeyAssert(
        typeof pointer.note === 'string' && pointer.note.trim().length >= 20,
        `context pointer ${path} has no actionable note`,
      );
      kinds.add(pointer.kind ?? '');
      if (!existsSync(resolve(REPO_ROOT, path!))) missing.push(path!);

      const landmark = REQUIRED_LANDMARKS[path!];
      if (landmark !== undefined && existsSync(resolve(REPO_ROOT, path!))) {
        journeyAssert(
          readFileSync(resolve(REPO_ROOT, path!), 'utf8').includes(landmark),
          `context pointer ${path} no longer carries the expected debugging landmark ${landmark}`,
        );
      }
    }
    journeyAssert(
      missing.length === 0,
      `context pointers name ${missing.length} nonexistent file(s): ${missing.join(', ')}`,
    );
    for (const requiredKind of ['owner-file', 'entrypoint', 'test', 'check']) {
      journeyAssert(kinds.has(requiredKind), `context packet is insufficient: missing ${requiredKind} pointer`);
    }
    const checkPointers = pointers!.filter((pointer) => pointer.kind === 'check');
    journeyAssert(
      checkPointers.some((pointer) => pointer.checkId === 'check/gates'),
      'context packet does not identify the authoritative check/gates registry entry',
    );
    const registered = new Set<string>(CHECK_REGISTRY.map((check) => check.id));
    for (const pointer of checkPointers) {
      journeyAssert(
        typeof pointer.checkId === 'string' && registered.has(pointer.checkId),
        `context points to an unregistered check: ${String(pointer.checkId)}`,
      );
    }
    journeyAssert(
      Object.keys(REQUIRED_LANDMARKS).every((path) => pointers!.some((pointer) => pointer.path === path)),
      'context packet omits one or more load-bearing debugging owners/tests',
    );

    return {
      name,
      status: 'pass',
      detail:
        `context --task ${TASK} returned ${pointers!.length} live pointers with owner, entrypoint, test, registered check, ` +
        'and Finding→explain landmarks sufficient for the task',
      notes: ['validated semantic landmarks and registered authority, not path existence alone'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  }
}
