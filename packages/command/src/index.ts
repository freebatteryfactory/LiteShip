/**
 * @czap/command — the shared command registry + dispatcher (CUT A1).
 *
 * One canonical command language (re-anchored from @czap/_spine via @czap/core),
 * one registry, one dispatcher. `@czap/cli` and `@czap/mcp-server` are thin
 * projection adapters over this package; neither imports the other.
 *
 * @module
 */
export type {
  CapsuleCommandDescriptor,
  CapsuleCommandInvocation,
  CapsuleCommandResult,
  CommandAnnotations,
  CommandJsonSchema,
} from '@czap/core';

export { CommandRegistry } from './registry.js';
export type { CapsuleCommandHandler, CommandContext, RegisteredCommand } from './registry.js';
export { CommandDispatcher } from './dispatcher.js';
