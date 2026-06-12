/**
 * Transport-free command dispatcher (CUT A1). Resolves an invocation against the
 * registry and runs the handler. Adapters (CLI argv, MCP JSON-RPC) parse their
 * native input into a `CapsuleCommandInvocation`, call `dispatch`, and project the
 * structured `CapsuleCommandResult` back to their wire format. No stdout capture.
 *
 * @module
 */
import type { CapsuleCommandInvocation, CapsuleCommandResult } from '@czap/core';
import type { CommandContext, CommandRegistry } from './registry.js';

interface CommandDispatcherShape {
  readonly dispatch: (invocation: CapsuleCommandInvocation, context: CommandContext) => Promise<CapsuleCommandResult>;
}

/** Levenshtein edit distance. The catalog is dozens of names, so the O(n·m) rolling row is plenty. */
function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j]! + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = row[j]!;
      row[j] = next;
    }
  }
  return row[b.length]!;
}

/** Nearest catalog name within edit distance 3 — beyond that a suggestion misleads more than it helps. */
function nearestName(name: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = 4;
  for (const candidate of candidates) {
    const distance = levenshtein(name, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function make(registry: CommandRegistry.Shape): CommandDispatcherShape {
  return {
    dispatch: async (invocation, context) => {
      const command = registry.get(invocation.name);
      if (!command) {
        // Unknown commands fail structurally — never throw across the seam.
        const didYouMean = nearestName(
          invocation.name,
          registry.list().map((d) => d.name),
        );
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date().toISOString(),
          exitCode: 1,
          payload: {
            error: 'unknown_command',
            name: invocation.name,
            hint: `No tool named "${invocation.name}". Run tools/list (or read liteship://registry/commands) for the catalog.`,
            ...(didYouMean !== undefined ? { didYouMean } : {}),
          },
        };
      }
      if (!command.handler) {
        // Declared in the catalog but handler-less: the command is CLI-owned and
        // routed by `czap` argv dispatch. Fail structurally here too.
        return {
          status: 'failed',
          command: invocation.name,
          timestamp: new Date().toISOString(),
          exitCode: 1,
          payload: {
            error: 'cli_only_command',
            name: invocation.name,
            hint: `"${invocation.name}" exists but is CLI-owned; run \`czap ${invocation.name}\` instead of calling it over MCP.`,
          },
        };
      }
      return command.handler(invocation, context);
    },
  };
}

export const CommandDispatcher = { make };
export declare namespace CommandDispatcher {
  export type Shape = CommandDispatcherShape;
}
