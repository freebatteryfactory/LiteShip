/**
 * Args decode at the dispatcher seam (CUT A1, ceremony wave). A command that
 * declares an `argsSchema` has `invocation.args` decoded against it BEFORE the
 * handler runs: valid args reach the handler already typed; a mistyped arg fails
 * structurally with an `invalid_args` envelope (built through `failed()`) naming
 * the offending paths — never reaching the handler, never throwing across the
 * seam. A command WITHOUT a schema passes its args through verbatim.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { CommandRegistry, CommandDispatcher, defineCommand, ok } from '@liteship/command';
import type { RegisteredCommand, CommandJsonSchema } from '@liteship/command';
import { schema } from '@liteship/core';

const SCENE_INPUT: CommandJsonSchema = {
  type: 'object',
  properties: { scene: { type: 'string' } },
  required: ['scene'],
};

describe('dispatcher decodes args against the declared argsSchema', () => {
  it('valid args reach the handler already decoded and typed', async () => {
    const seen: unknown[] = [];
    const probe = defineCommand({
      descriptor: { name: 'scene.probe', summary: 'probe', inputSchema: SCENE_INPUT },
      argsSchema: schema.struct({ scene: schema.string }),
      handler: async (invocation) => {
        seen.push(invocation.args);
        // COMPILE-TIME PROOF: `invocation.args.scene` is a `string` (decoded via
        // the schema), not `unknown` — this annotated binding would fail to
        // typecheck if the handler still saw loosely-typed args.
        const scene: string = invocation.args.scene;
        return ok('scene.probe', { scene });
      },
    });
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([probe]));
    const result = await dispatcher.dispatch({ name: 'scene.probe', args: { scene: 'intro.ts' } }, {});
    expect(result.status).toBe('ok');
    expect(seen).toEqual([{ scene: 'intro.ts' }]);
    expect((result.payload as { scene: string }).scene).toBe('intro.ts');
  });

  it('a mistyped arg fails with a structured invalid_args envelope; the handler never runs', async () => {
    const calls: number[] = [];
    const probe = defineCommand({
      descriptor: { name: 'scene.probe', summary: 'probe', inputSchema: SCENE_INPUT },
      argsSchema: schema.struct({ scene: schema.string }),
      handler: async (invocation) => {
        calls.push(1);
        return ok('scene.probe', { scene: invocation.args.scene });
      },
    });
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([probe]));
    // `liteship scene --scene=123`-style mistyping: a number where a string is required.
    const result = await dispatcher.dispatch({ name: 'scene.probe', args: { scene: 123 } }, {});
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    expect(result.command).toBe('scene.probe');
    expect(typeof result.timestamp).toBe('string');
    const payload = result.payload as {
      error: string;
      name: string;
      issues: readonly { path: readonly (string | number)[]; code: string; message: string }[];
      hint: string;
    };
    expect(payload.error).toBe('invalid_args');
    expect(payload.name).toBe('scene.probe');
    expect(payload.issues.length).toBeGreaterThan(0);
    expect(payload.issues[0]!.path).toEqual(['scene']);
    expect(payload.issues[0]!.code).toBe('schema/type');
    expect(payload.hint).toContain('inputSchema');
    // The decode gate fired BEFORE the handler.
    expect(calls).toEqual([]);
  });

  it('a missing required arg is caught with a schema/missing issue at its path', async () => {
    const probe = defineCommand({
      descriptor: { name: 'scene.probe', summary: 'probe', inputSchema: SCENE_INPUT },
      argsSchema: schema.struct({ scene: schema.string }),
      handler: async (invocation) => ok('scene.probe', { scene: invocation.args.scene }),
    });
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([probe]));
    const result = await dispatcher.dispatch({ name: 'scene.probe', args: {} }, {});
    expect(result.status).toBe('failed');
    const payload = result.payload as {
      error: string;
      issues: readonly { path: readonly (string | number)[]; code: string }[];
    };
    expect(payload.error).toBe('invalid_args');
    expect(payload.issues.some((issue) => issue.code === 'schema/missing' && issue.path[0] === 'scene')).toBe(true);
  });

  it('a command WITHOUT an argsSchema passes its args through verbatim (decode is a no-op)', async () => {
    const echo: RegisteredCommand = {
      descriptor: { name: 'echo.cmd', summary: 'echo', inputSchema: { type: 'object', properties: {} } },
      handler: async (invocation) => ok('echo.cmd', { echoed: invocation.args }),
    };
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([echo]));
    const result = await dispatcher.dispatch({ name: 'echo.cmd', args: { anything: [1, 2], nested: { a: 1 } } }, {});
    expect(result.status).toBe('ok');
    expect((result.payload as { echoed: unknown }).echoed).toEqual({ anything: [1, 2], nested: { a: 1 } });
  });
});
