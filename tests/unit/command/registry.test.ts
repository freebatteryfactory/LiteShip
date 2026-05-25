import { describe, it, expect } from 'vitest';
import { CommandRegistry, CommandDispatcher } from '@czap/command';
import type { RegisteredCommand } from '@czap/command';

function fakeCommand(name: string): RegisteredCommand {
  return {
    descriptor: {
      name,
      summary: `does ${name}`,
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    handler: async (invocation) => ({
      status: 'ok',
      command: name,
      timestamp: '2026-05-24T00:00:00.000Z',
      payload: { echoed: invocation.args },
    }),
  };
}

describe('@czap/command registry + dispatcher', () => {
  it('registry.list() returns the descriptor for every registered command, sorted by name', () => {
    const registry = CommandRegistry.make([fakeCommand('b.cmd'), fakeCommand('a.cmd')]);
    expect(registry.list().map((d) => d.name)).toEqual(['a.cmd', 'b.cmd']);
    expect(registry.get('a.cmd')?.descriptor.summary).toBe('does a.cmd');
    expect(registry.get('missing')).toBeUndefined();
  });

  it('registry rejects duplicate command names', () => {
    expect(() => CommandRegistry.make([fakeCommand('dup'), fakeCommand('dup')])).toThrow(/duplicate/i);
  });

  it('dispatcher invokes the registered handler and returns its structured result', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([fakeCommand('scene.compile')]));
    const result = await dispatcher.dispatch({ name: 'scene.compile', args: { scene: '/x.ts' } }, {});
    expect(result.status).toBe('ok');
    expect(result.command).toBe('scene.compile');
    expect((result.payload as { echoed: unknown }).echoed).toEqual({ scene: '/x.ts' });
  });

  it('dispatcher returns a structured failed result (not a throw) for an unknown command', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([fakeCommand('scene.compile')]));
    const result = await dispatcher.dispatch({ name: 'nope', args: {} }, {});
    expect(result.status).toBe('failed');
    expect(result.command).toBe('nope');
    expect(result.exitCode ?? 0).toBeGreaterThan(0);
  });
});
