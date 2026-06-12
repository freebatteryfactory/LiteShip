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

describe('dispatcher error contract — failed payloads teach the next step', () => {
  it('unknown command payload carries a hint naming tools/list and the registry resource', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([fakeCommand('scene.compile')]));
    const result = await dispatcher.dispatch({ name: 'zzz.unrelated', args: {} }, {});
    const payload = result.payload as { error: string; name: string; hint: string; didYouMean?: string };
    expect(payload.error).toBe('unknown_command');
    expect(payload.name).toBe('zzz.unrelated');
    expect(payload.hint).toContain('tools/list');
    expect(payload.hint).toContain('liteship://registry/commands');
  });

  it('a near-miss name gets a didYouMean suggestion; a far miss does not', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([fakeCommand('scene.compile')]));
    const near = await dispatcher.dispatch({ name: 'scene.compil', args: {} }, {});
    expect((near.payload as { didYouMean?: string }).didYouMean).toBe('scene.compile');
    const far = await dispatcher.dispatch({ name: 'zzz.unrelated', args: {} }, {});
    expect((far.payload as { didYouMean?: string }).didYouMean).toBeUndefined();
  });

  it('a catalog command without a handler fails as cli_only_command with the `czap <name>` remedy', async () => {
    const cliOwned: RegisteredCommand = {
      descriptor: {
        name: 'gauntlet',
        summary: 'CLI-owned',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    };
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([cliOwned]));
    const result = await dispatcher.dispatch({ name: 'gauntlet', args: {} }, {});
    expect(result.status).toBe('failed');
    const payload = result.payload as { error: string; hint: string };
    expect(payload.error).toBe('cli_only_command');
    expect(payload.hint).toContain('czap gauntlet');
  });
});
