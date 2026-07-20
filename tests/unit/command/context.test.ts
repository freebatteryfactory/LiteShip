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
import { contextCommand, CONTEXT_MAP, CONTEXT_TASK_IDS, type ContextPayload } from '@liteship/command';

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

  it('returns a structured failed result (exit > 0) for an unknown task, never a throw', async () => {
    const { result, payload } = await context('not-a-real-task');
    expect(result.status).toBe('failed');
    expect(result.exitCode ?? 0).toBeGreaterThan(0);
    expect(payload.pointers).toEqual([]);
  });
});
