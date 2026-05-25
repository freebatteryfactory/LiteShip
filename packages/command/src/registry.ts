/**
 * The single canonical command registry (CUT A1). CLI listing, MCP `tools/list`,
 * `describe --format=mcp`, and `run()` dispatch all derive from one instance.
 *
 * @module
 */
import type { CapsuleCommandDescriptor, CapsuleCommandInvocation, CapsuleCommandResult } from '@czap/core';

/**
 * Injected I/O surface for command handlers. Handlers receive their Node-coupled
 * dependencies here rather than reaching for globals, so the registry/handler
 * boundary stays declarative. Extended as handlers migrate into this package.
 */
export interface CommandContext {
  /** Working directory for path resolution; defaults to `process.cwd()` at the adapter. */
  readonly cwd?: string;
}

/** A command handler: structured invocation in, structured result out. No stdout, no argv. */
export interface CapsuleCommandHandler {
  (invocation: CapsuleCommandInvocation, context: CommandContext): Promise<CapsuleCommandResult>;
}

/** A descriptor paired with its handler — the unit the registry indexes. */
export interface RegisteredCommand {
  readonly descriptor: CapsuleCommandDescriptor;
  readonly handler: CapsuleCommandHandler;
}

interface CommandRegistryShape {
  readonly get: (name: string) => RegisteredCommand | undefined;
  readonly list: () => readonly CapsuleCommandDescriptor[];
}

function make(commands: readonly RegisteredCommand[]): CommandRegistryShape {
  const byName = new Map<string, RegisteredCommand>();
  for (const command of commands) {
    const { name } = command.descriptor;
    if (byName.has(name)) {
      throw new Error(`@czap/command: duplicate command name "${name}"`);
    }
    byName.set(name, command);
  }
  const descriptors = [...byName.values()]
    .map((command) => command.descriptor)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    get: (name) => byName.get(name),
    list: () => descriptors,
  };
}

export const CommandRegistry = { make };
export declare namespace CommandRegistry {
  export type Shape = CommandRegistryShape;
}
