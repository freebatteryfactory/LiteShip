/**
 * WebMCP projection — register LiteShip tools in `navigator.modelContext`.
 *
 * @module
 */
import { CommandDispatcher, commandRegistry } from '../index.js';
import type { CommandContext } from '../registry.js';
import { browserSafeCommandNames, createBrowserCommandContext } from './context.js';

export interface ModelContextTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  readonly execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ModelContextHost {
  readonly registerTool: (tool: ModelContextTool) => void;
}

export interface WebMcpProjectionOptions {
  readonly context?: CommandContext;
  readonly commandNames?: readonly string[];
  readonly delegateServerUrl?: string;
}

function readModelContext(): ModelContextHost | null {
  if (typeof navigator === 'undefined') return null;
  const mc = (navigator as Navigator & { modelContext?: ModelContextHost }).modelContext;
  return mc ?? null;
}

/**
 * Project MCP-exposed (or browser-safe subset) commands into WebMCP.
 * No-ops when `navigator.modelContext` is absent (progressive enhancement).
 */
export function registerWebMcpTools(opts: WebMcpProjectionOptions = {}): number {
  const host = readModelContext();
  if (!host) return 0;

  const dispatcher = CommandDispatcher.make(commandRegistry);
  const context =
    opts.context ??
    createBrowserCommandContext({
      mcpServerUrl: opts.delegateServerUrl,
    });

  const allowed = new Set(opts.commandNames ?? browserSafeCommandNames());
  const descriptors = commandRegistry.list().filter((d) => allowed.has(d.name) && commandRegistry.get(d.name)?.handler);

  for (const descriptor of descriptors) {
    host.registerTool({
      name: descriptor.name,
      description: descriptor.summary,
      inputSchema: descriptor.inputSchema,
      execute: async (args) => {
        const result = await dispatcher.dispatch({ name: descriptor.name, args }, context);
        return result.payload ?? result;
      },
    });
  }

  return descriptors.length;
}
