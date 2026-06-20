/**
 * Transport-free command dispatcher (CUT A1). Resolves an invocation against the
 * registry and runs the handler. Adapters (CLI argv, MCP JSON-RPC) parse their
 * native input into a `CapsuleCommandInvocation`, call `dispatch`, and project the
 * structured `CapsuleCommandResult` back to their wire format. No stdout capture.
 *
 * @module
 */
import { wallClock, type CapsuleCommandInvocation, type CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type CommandRegistry,
} from './registry.js';

interface CommandDispatcherShape {
  readonly dispatch: (invocation: CapsuleCommandInvocation, context: CommandContext) => Promise<CapsuleCommandResult>;
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
  return {
    dispatch: async (invocation, context) => {
      const command = registry.get(invocation.name);
      if (!command) {
        // Unknown commands fail structurally — never throw across the seam.
        // The registry knows every name, so teach the nearest match.
        const didYouMean = nearestCommand(invocation.name, registry);
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date(wallClock.now()).toISOString(),
          exitCode: 1,
          payload: {
            error: 'unknown_command',
            name: invocation.name,
            ...(didYouMean !== undefined ? { didYouMean } : {}),
            // One dispatcher serves both hosts: name the catalog entry point
            // for each (CLI verb chart, MCP tool list).
            hint: 'run `czap help` for the verb chart; over MCP, tools/list (or liteship://registry/commands) shows the catalog',
          },
        };
      }
      if (!command.handler) {
        // Declared in the catalog but handler-less: cli-orchestration commands
        // run only via the czap CLI by design; anything else is pending
        // migration. Fail structurally either way (error code is stable).
        const cliOwned = command.descriptor.executionKind === 'cli-orchestration';
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date(wallClock.now()).toISOString(),
          exitCode: 1,
          payload: {
            error: 'no_registry_handler',
            name: invocation.name,
            ...(command.descriptor.executionKind !== undefined
              ? { executionKind: command.descriptor.executionKind }
              : {}),
            hint: cliOwned
              ? `\`${invocation.name}\` runs only via the czap CLI (terminal orchestration) — type \`czap ${invocation.name}\``
              : `\`${invocation.name}\` is declared in the catalog but its handler has not been migrated — run it via the czap CLI`,
          },
        };
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
      return command.handler(invocation, context);
    },
  };
}

export const CommandDispatcher = { make };
export declare namespace CommandDispatcher {
  export type Shape = CommandDispatcherShape;
}
