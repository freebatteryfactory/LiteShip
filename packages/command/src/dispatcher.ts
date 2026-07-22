/**
 * Transport-free command dispatcher (CUT A1). Resolves an invocation against the
 * registry and runs the handler. Adapters (CLI argv, MCP JSON-RPC) parse their
 * native input into a `CapsuleCommandInvocation`, call `dispatch`, and project the
 * structured `CapsuleCommandResult` back to their wire format. No stdout capture.
 *
 * @module
 */
import { closestMatch, decode, type CapsuleCommandInvocation, type CapsuleCommandResult } from '@liteship/core';
import {
  capabilityUnavailable,
  failed,
  type CommandCapability,
  type CommandContext,
  type CommandRegistry,
} from './registry.js';
import type { CommandMap } from './catalog.js';

interface CommandDispatcherShape {
  /**
   * Resolve an invocation against the registry and run its handler. Generic over
   * the command NAME: when `N` is a `keyof CommandMap` literal (e.g. the string
   * `'glossary'`), the result's `payload` is typed `CommandMap[N]` at compile
   * time — no cast. A plain `string` name (an adapter forwarding a wire value)
   * widens to `unknown`, preserving the transport-neutral call the CLI/MCP skins
   * make. Never throws across the seam — every outcome is a structured result.
   */
  dispatch<N extends string>(
    invocation: { readonly name: N; readonly args: Readonly<Record<string, unknown>> },
    context: CommandContext,
  ): Promise<CapsuleCommandResult<N extends keyof CommandMap ? CommandMap[N] : unknown>>;
}

/** Nearest registered command name, when plausibly a typo (distance ≤ 3). */
function nearestCommand(name: string, registry: CommandRegistry): string | undefined {
  return closestMatch(
    name,
    registry.list().map((descriptor) => descriptor.name),
    3,
  );
}

function make(registry: CommandRegistry): CommandDispatcherShape {
  async function dispatch(
    invocation: CapsuleCommandInvocation,
    context: CommandContext,
  ): Promise<CapsuleCommandResult> {
    const command = registry.get(invocation.name);
    if (!command) {
      // Unknown commands fail structurally — never throw across the seam.
      // The registry knows every name, so teach the nearest match.
      const didYouMean = nearestCommand(invocation.name, registry);
      return failed(invocation.name, {
        error: 'unknown_command',
        name: invocation.name,
        ...(didYouMean !== undefined ? { didYouMean } : {}),
        // One dispatcher serves both hosts: name the catalog entry point
        // for each (CLI command list, MCP tool list).
        hint: 'run `liteship help` for the command list; over MCP, tools/list (or liteship://registry/commands) shows the catalog',
      });
    }
    if (!command.handler) {
      // Declared in the catalog but handler-less: cli-orchestration commands
      // run only via the liteship CLI by design; anything else is pending
      // migration. Fail structurally either way (error code is stable).
      const cliOwned = command.descriptor.executionKind === 'cli-orchestration';
      return failed(invocation.name, {
        error: 'no_registry_handler',
        name: invocation.name,
        ...(command.descriptor.executionKind !== undefined ? { executionKind: command.descriptor.executionKind } : {}),
        hint: cliOwned
          ? `\`${invocation.name}\` runs only via the liteship CLI (terminal orchestration) — type \`liteship ${invocation.name}\``
          : `\`${invocation.name}\` is declared in the catalog but its handler has not been migrated — run it via the liteship CLI`,
      });
    }
    // Declared capability requirements (descriptor `requires`) are enforced
    // here, once, so every command fails the same way: structured payload
    // naming the missing capabilities, exit 2 (see capabilityUnavailable).
    const missing = (command.descriptor.requires ?? []).filter(
      (capability) => (context as Record<string, unknown>)[capability] === undefined,
    ) as readonly CommandCapability[];
    if (missing.length > 0) {
      return capabilityUnavailable(invocation.name, missing);
    }
    // Decode the raw args against the command's declared schema BEFORE invoking
    // the handler. A mistyped arg (e.g. `--scene=123` where a string is required)
    // fails structurally with an `invalid_args` envelope naming the offending
    // paths, instead of reaching the handler as a wrong-typed value. When no
    // schema is declared the args pass through verbatim (decode is a no-op).
    let args = invocation.args;
    if (command.argsSchema) {
      const decoded = decode(command.argsSchema, invocation.args);
      if (!decoded.ok) {
        return failed(invocation.name, {
          error: 'invalid_args',
          name: invocation.name,
          issues: decoded.error.map((issue) => ({
            path: issue.path,
            code: issue.code,
            message: issue.message,
          })),
          hint: `\`${invocation.name}\` rejected its arguments — check the named paths against the command's inputSchema (\`liteship describe\` or MCP tools/list)`,
        });
      }
      args = decoded.value;
    }
    return command.handler({ name: invocation.name, args }, context);
  }
  // The implementation is uniform (its payload is `unknown` on every path); the
  // NAME-indexed return type is a compile-time projection the caller reads via
  // CommandMap. One plain cast bridges the uniform impl to the indexed signature
  // — never `as unknown as`.
  return { dispatch: dispatch as CommandDispatcherShape['dispatch'] };
}

export const CommandDispatcher = { make };
export type CommandDispatcher = CommandDispatcherShape;
