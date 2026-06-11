/**
 * Transport-free command dispatcher (CUT A1). Resolves an invocation against the
 * registry and runs the handler. Adapters (CLI argv, MCP JSON-RPC) parse their
 * native input into a `CapsuleCommandInvocation`, call `dispatch`, and project the
 * structured `CapsuleCommandResult` back to their wire format. No stdout capture.
 *
 * @module
 */
import type { CapsuleCommandInvocation, CapsuleCommandResult } from '@czap/core';
import { capabilityUnavailable, type CommandCapability, type CommandContext, type CommandRegistry } from './registry.js';

interface CommandDispatcherShape {
  readonly dispatch: (invocation: CapsuleCommandInvocation, context: CommandContext) => Promise<CapsuleCommandResult>;
}

function make(registry: CommandRegistry.Shape): CommandDispatcherShape {
  return {
    dispatch: async (invocation, context) => {
      const command = registry.get(invocation.name);
      if (!command) {
        // Unknown commands fail structurally — never throw across the seam.
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date().toISOString(),
          exitCode: 1,
          payload: { error: 'unknown_command', name: invocation.name },
        };
      }
      if (!command.handler) {
        // Declared in the catalog but not yet migrated into this package — the
        // CLI still routes it via legacy dispatch. Fail structurally here too.
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date().toISOString(),
          exitCode: 1,
          payload: { error: 'no_registry_handler', name: invocation.name },
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
