import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CommandRegistry, type RegisteredCommand } from '@liteship/command';

function command(name: string, ordinal: number): RegisteredCommand {
  return {
    descriptor: {
      name,
      summary: `command ${ordinal}`,
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnly: true },
      executionKind: 'cli-orchestration',
    },
  };
}

describe('command projection permutation laws', () => {
  it('registry lookup and listing are independent of authored command order', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 80 }), { minLength: 1, maxLength: 24 }), (ids) => {
        const commands = ids.map((id, index) => command(`probe.${id.toString().padStart(2, '0')}`, index));
        const permutation = [...commands].reverse();
        const first = CommandRegistry.make(commands);
        const second = CommandRegistry.make(permutation);
        expect(second.list()).toEqual(first.list());
        for (const entry of commands) {
          expect(second.get(entry.descriptor.name)?.descriptor.name).toBe(entry.descriptor.name);
        }
      }),
    );
  });

  it('rejects a duplicate under every insertion position', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 2 }), (id, position) => {
        const duplicate = command(`probe.${id}`, 0);
        const entries = [command('before', 1), command('after', 2)];
        entries.splice(position, 0, duplicate, duplicate);
        expect(() => CommandRegistry.make(entries)).toThrow(/duplicate command name/u);
      }),
    );
  });
});
