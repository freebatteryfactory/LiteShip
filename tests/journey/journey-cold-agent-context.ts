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
import { journeyAssert, parseReceipt, REPO_ROOT, runInstalledLiteshipCliAt, type JourneyResult } from './harness.js';

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

export async function journeyColdAgentContext(installedAppDir: string): Promise<JourneyResult> {
  const name = 'journey-cold-agent-context';
  try {
    const result = await runInstalledLiteshipCliAt(['context', '--task', TASK, '--json'], installedAppDir, REPO_ROOT);
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

    const describeResult = await runInstalledLiteshipCliAt(['describe', '--format=json'], installedAppDir, REPO_ROOT);
    journeyAssert(describeResult.code === 0, `packed describe exited ${describeResult.code}`);
    const described = parseReceipt(describeResult.stdout);
    const publicSurface = described['publicSurface'] as
      { root?: readonly unknown[]; subpaths?: readonly unknown[]; lifecycle?: readonly unknown[] } | undefined;
    journeyAssert(
      Array.isArray(publicSurface?.root) &&
        Array.isArray(publicSurface?.subpaths) &&
        Array.isArray(publicSurface?.lifecycle) &&
        publicSurface.lifecycle.length === 24,
      'packed describe does not expose the generated facade and lifecycle projection',
    );

    const explainResult = await runInstalledLiteshipCliAt(
      ['explain', 'defineAdaptive', '--json'],
      installedAppDir,
      REPO_ROOT,
    );
    journeyAssert(explainResult.code === 0, `packed explain defineAdaptive exited ${explainResult.code}`);
    const explained = parseReceipt(explainResult.stdout);
    const explainedSurface = (explained['symbol'] as { surface?: Record<string, unknown> } | undefined)?.surface;
    journeyAssert(explainedSurface?.['specifier'] === 'liteship', 'packed explain omits defineAdaptive root ownership');
    journeyAssert(
      typeof explainedSurface?.['failureContract'] === 'string' &&
        (explainedSurface['failureContract'] as string).length > 0,
      'packed explain omits defineAdaptive failure behavior',
    );
    journeyAssert(
      Array.isArray(explainedSurface?.['proofRefs']) && Array.isArray(explainedSurface?.['checkIds']),
      'packed explain omits defineAdaptive checks or proof references',
    );

    const subjectResult = await runInstalledLiteshipCliAt(
      ['context', '--subject', 'createTimeline', '--json'],
      installedAppDir,
      REPO_ROOT,
    );
    journeyAssert(subjectResult.code === 0, `packed context --subject createTimeline exited ${subjectResult.code}`);
    const subjectReceipt = parseReceipt(subjectResult.stdout);
    const subjectSurface = subjectReceipt['publicSurface'] as
      { allocation?: { classification?: string; postDispose?: string; siblingCleanup?: string } } | undefined;
    journeyAssert(
      subjectSurface?.allocation?.classification === 'active-owned' &&
        subjectSurface.allocation.postDispose === 'inert' &&
        subjectSurface.allocation.siblingCleanup === 'aggregate',
      'packed subject context omits the active resource disposal contract',
    );

    return {
      name,
      status: 'pass',
      detail:
        `packed context --task ${TASK} returned ${pointers!.length} live pointers and the facade projection exposed ` +
        'owner, route, failure, proof, and lifecycle recovery without package archaeology',
      notes: ['ran packed describe, explain, task context, and public-subject context through the facade executable'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  }
}
