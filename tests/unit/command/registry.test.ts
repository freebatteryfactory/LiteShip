import { describe, it, expect } from 'vitest';
import { CommandRegistry, CommandDispatcher, commandRegistry, ok, failed, defineCommand } from '@czap/command';
import type { RegisteredCommand } from '@czap/command';
import type { GlossaryPayload } from '@czap/command';
import { S } from '@czap/core';

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

  it('a cli-orchestration command without a handler keeps the stable code and the `czap <name>` remedy', async () => {
    const cliOwned: RegisteredCommand = {
      descriptor: {
        name: 'gauntlet',
        summary: 'CLI-owned',
        executionKind: 'cli-orchestration',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    };
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([cliOwned]));
    const result = await dispatcher.dispatch({ name: 'gauntlet', args: {} }, {});
    expect(result.status).toBe('failed');
    const payload = result.payload as { error: string; hint: string; executionKind?: string };
    // ONE stable code for every handler-less catalog entry; executionKind +
    // hint carry the cli-owned vs pending-migration distinction.
    expect(payload.error).toBe('no_registry_handler');
    expect(payload.executionKind).toBe('cli-orchestration');
    expect(payload.hint).toContain('czap gauntlet');
  });
});

describe('ok()/failed() envelope constructors stamp the shared shape once', () => {
  it('ok(): status ok, threaded command, wall-clock timestamp, payload, NO exitCode', () => {
    const result = ok('demo.cmd', { count: 3 });
    expect(result.status).toBe('ok');
    expect(result.command).toBe('demo.cmd');
    expect(result.payload).toEqual({ count: 3 });
    expect(result.exitCode).toBeUndefined();
    expect(typeof result.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('failed(): status failed, given exitCode, payload; exitCode defaults to 1', () => {
    const explicit = failed('demo.cmd', { error: 'boom' }, 3);
    expect(explicit.status).toBe('failed');
    expect(explicit.command).toBe('demo.cmd');
    expect(explicit.exitCode).toBe(3);
    expect(explicit.payload).toEqual({ error: 'boom' });

    const defaulted = failed('demo.cmd', { error: 'boom' });
    expect(defaulted.exitCode).toBe(1);
  });
});

describe('CommandMap types the dispatch payload at compile time', () => {
  it("dispatch('glossary') yields a GlossaryPayload — read a payload field with no cast", async () => {
    const dispatcher = CommandDispatcher.make(commandRegistry);
    const result = await dispatcher.dispatch({ name: 'glossary', args: {} }, {});
    expect(result.status).toBe('ok');
    const payload = result.payload;
    // COMPILE-TIME PROOF: `payload` is typed `GlossaryPayload | undefined`, so
    // `.entries` / `.term` resolve WITHOUT a cast. Were the return `unknown`
    // (the pre-CommandMap dispatch), these member reads would fail typecheck.
    if (payload) {
      const entries: GlossaryPayload['entries'] = payload.entries;
      const term: GlossaryPayload['term'] = payload.term;
      expect(Array.isArray(entries)).toBe(true);
      expect(term).toBeNull();
    }
  });
});

describe('RegisteredCommand carries a declared argsSchema slot', () => {
  it('defineCommand threads the schema onto the registered command', () => {
    const command = defineCommand({
      descriptor: {
        name: 'schema.cmd',
        summary: 'declares an args schema',
        inputSchema: { type: 'object', properties: { scene: { type: 'string' } }, required: ['scene'] },
      },
      argsSchema: S.struct({ scene: S.string }),
      handler: async (invocation) => ok('schema.cmd', { scene: invocation.args.scene }),
    });
    const registry = CommandRegistry.make([command]);
    expect(registry.get('schema.cmd')?.argsSchema).toBeDefined();
    // A descriptor-only / legacy command has no schema slot.
    const legacy = CommandRegistry.make([fakeCommand('legacy.cmd')]);
    expect(legacy.get('legacy.cmd')?.argsSchema).toBeUndefined();
  });
});
