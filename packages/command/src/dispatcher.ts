/**
 * Transport-free command dispatcher (CUT A1). Resolves an invocation against the
 * registry and runs the handler. Adapters (CLI argv, MCP JSON-RPC) parse their
 * native input into a `CapsuleCommandInvocation`, call `dispatch`, and project the
 * structured `CapsuleCommandResult` back to their wire format. No stdout capture.
 *
 * @module
 */
import { decode, type CapsuleCommandInvocation, type CapsuleCommandResult } from '@czap/core';
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

/** Edit distance (Levenshtein) — small inputs only (command names). */
function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const insertOrDelete = Math.min(previous[j]!, previous[j - 1]!) + 1;
      const substitute = diagonal + (left[i - 1] === right[j - 1] ? 0 : 1);
      diagonal = previous[j]!;
      previous[j] = Math.min(insertOrDelete, substitute);
    }
  }
  return previous[right.length]!;
}

/** Nearest registered command name, when plausibly a typo (distance ≤ 3). */
function nearestCommand(name: string, registry: CommandRegistry.Shape): string | undefined {
  let best: { name: string; distance: number } | undefined;
  for (const descriptor of registry.list()) {
    const distance = editDistance(name, descriptor.name);
    if (!best || distance < best.distance) best = { name: descriptor.name, distance };
  }
  return best && best.distance <= 3 ? best.name : undefined;
}

function make(registry: CommandRegistry.Shape): CommandDispatcherShape {
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
        // for each (CLI verb chart, MCP tool list).
        hint: 'run `czap help` for the verb chart; over MCP, tools/list (or liteship://registry/commands) shows the catalog',
      });
    }
    if (!command.handler) {
      // Declared in the catalog but handler-less: cli-orchestration commands
      // run only via the czap CLI by design; anything else is pending
      // migration. Fail structurally either way (error code is stable).
      const cliOwned = command.descriptor.executionKind === 'cli-orchestration';
      return failed(invocation.name, {
        error: 'no_registry_handler',
        name: invocation.name,
        ...(command.descriptor.executionKind !== undefined ? { executionKind: command.descriptor.executionKind } : {}),
        hint: cliOwned
          ? `\`${invocation.name}\` runs only via the czap CLI (terminal orchestration) — type \`czap ${invocation.name}\``
          : `\`${invocation.name}\` is declared in the catalog but its handler has not been migrated — run it via the czap CLI`,
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
          hint: `\`${invocation.name}\` rejected its arguments — check the named paths against the command's inputSchema (\`czap describe\` or MCP tools/list)`,
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
export declare namespace CommandDispatcher {
  export type Shape = CommandDispatcherShape;
}
