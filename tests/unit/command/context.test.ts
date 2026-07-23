/**
 * context command — the task-oriented pointer map. Proves every task resolves to a
 * structured pointer list AND that every pointer's `path` is a REAL repo file (so
 * the context an agent projects can never rot into a dangling reference).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  contextCommand,
  COMMAND_CATALOG,
  CONTEXT_MAP,
  CONTEXT_TASK_IDS,
  CHECK_REGISTRY,
  type ContextPayload,
} from '@liteship/command';
import { DIAGNOSTIC_REGISTRY } from '@liteship/error';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

async function context(task: string) {
  const result = await contextCommand.handler({ name: 'context', args: { task } }, {});
  return { result, payload: result.payload as ContextPayload };
}

describe('@liteship/command context command', () => {
  it('CONTEXT_TASK_IDS is exactly the sorted CONTEXT_MAP keys', () => {
    expect([...CONTEXT_TASK_IDS]).toEqual(Object.keys(CONTEXT_MAP).sort());
    expect(CONTEXT_TASK_IDS).toContain('add-boundary');
    expect(CONTEXT_TASK_IDS.length).toBeGreaterThanOrEqual(6);
  });

  it('returns a structured ok result with ordered pointers for a known task', async () => {
    const { result, payload } = await context('add-boundary');
    expect(result.status).toBe('ok');
    expect(result.command).toBe('context');
    expect(payload.task).toBe('add-boundary');
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.summary.length).toBeGreaterThan(0);
    expect(payload.pointers.length).toBeGreaterThan(0);
    // a check pointer carries its check id; a file pointer carries null
    expect(payload.pointers.some((p) => p.kind === 'check' && p.checkId?.startsWith('check/'))).toBe(true);
  });

  it('every pointer of every task resolves to a REAL repo file', async () => {
    for (const task of CONTEXT_TASK_IDS) {
      const { payload } = await context(task);
      for (const pointer of payload.pointers) {
        const abs = resolve(REPO_ROOT, pointer.path);
        expect(existsSync(abs), `${task}: pointer path does not exist: ${pointer.path}`).toBe(true);
      }
    }
  });

  it('every pointer kind is a known kind', async () => {
    const kinds = new Set(['owner-file', 'entrypoint', 'check', 'test', 'doc']);
    for (const task of CONTEXT_TASK_IDS) {
      const { payload } = await context(task);
      for (const pointer of payload.pointers) {
        expect(kinds.has(pointer.kind), `${task}: unknown kind ${pointer.kind}`).toBe(true);
      }
    }
  });

  it('every check pointer names a live check and every live check has a diagnostic code', () => {
    const checkIds = new Set(CHECK_REGISTRY.map((definition) => definition.id));
    const diagnosticCodes = new Set(Object.keys(DIAGNOSTIC_REGISTRY));
    for (const [task, contextTask] of Object.entries(CONTEXT_MAP)) {
      for (const pointer of contextTask.pointers) {
        if (pointer.kind === 'check') {
          expect(pointer.checkId, `${task}: check pointer must carry a checkId`).not.toBeNull();
          expect(checkIds.has(pointer.checkId!), `${task}: unknown checkId ${pointer.checkId}`).toBe(true);
        } else {
          expect(pointer.checkId, `${task}: non-check pointer must not carry a checkId`).toBeNull();
        }
      }
    }
    for (const checkId of checkIds) {
      expect(diagnosticCodes.has(checkId), `missing diagnostic registry entry for ${checkId}`).toBe(true);
    }
  });

  it('every concrete liteship command named by task context exists in COMMAND_CATALOG', () => {
    const commandNames = new Set(COMMAND_CATALOG.map((descriptor) => descriptor.name));
    const invocation = /`liteship\s+([a-z][\w.-]*)/gu;
    for (const [task, contextTask] of Object.entries(CONTEXT_MAP)) {
      const prose = [contextTask.title, contextTask.summary, ...contextTask.pointers.map((pointer) => pointer.note)].join(
        '\n',
      );
      for (const match of prose.matchAll(invocation)) {
        const command = match[1] as string;
        expect(commandNames.has(command), `${task}: unknown liteship command ${command}`).toBe(true);
      }
    }
  });

  it('returns a structured failed result (exit > 0) for an unknown task, never a throw', async () => {
    const { result, payload } = await context('not-a-real-task');
    expect(result.status).toBe('failed');
    expect(result.exitCode ?? 0).toBeGreaterThan(0);
    expect(payload.pointers).toEqual([]);
  });
});
