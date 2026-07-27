// @vitest-environment node
/** Direct lifecycle laws for the public `createLLMSession` owner. */

import { describe, expect, test, vi } from 'vitest';
import { createLLMSessionWithHost, type LLMSessionHost } from '../../../packages/astro/src/runtime/llm-session.js';

function inertHost(overrides?: Partial<LLMSessionHost>): LLMSessionHost {
  return {
    setTarget: () => undefined,
    renderText: () => true,
    renderFrame: () => true,
    emitToken: () => undefined,
    emitFrame: () => undefined,
    emitToolStart: () => undefined,
    emitToolEnd: () => undefined,
    emitDone: () => undefined,
    ...overrides,
  };
}

describe('createLLMSession lifecycle', () => {
  test('dispose is monotonic and later operations remain inert', async () => {
    const setTarget = vi.fn();
    const emitToken = vi.fn();
    const session = createLLMSessionWithHost(
      { mode: 'append', getDeviceTier: () => 'animations' },
      inertHost({ setTarget, emitToken }),
    );
    session.activate();

    const first = session.dispose();
    const second = session.dispose();
    expect(second).toBe(first);
    expect(session.state).toBe('disposed');
    expect(setTarget).toHaveBeenCalledTimes(1);
    expect(session.ingest({ type: 'text', partial: false, content: 'late' })).toBe('done');
    expect(emitToken).not.toHaveBeenCalled();
    await expect(first).resolves.toBeUndefined();
    await expect(session[Symbol.asyncDispose]()).resolves.toBeUndefined();
  });

  test('a hostile host release arm cannot prevent the remaining cleanup attempts', async () => {
    const session = createLLMSessionWithHost(
      { mode: 'append', getDeviceTier: () => 'animations' },
      inertHost({
        setTarget: () => {
          throw new Error('host teardown failed');
        },
      }),
    );
    session.activate();

    const first = session.dispose();
    expect(session.state).toBe('disposed');
    expect(session.ingest({ type: 'text', partial: false, content: 'late' })).toBe('done');
    await expect(first).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });
    const second = session.dispose();
    expect(second).toBe(first);
    await expect(second).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });
  });
});
