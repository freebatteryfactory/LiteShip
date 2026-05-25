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
export type { CapsuleCommandHandler, CommandContext, HandledCommand, RegisteredCommand } from './registry.js';
export { CommandDispatcher } from './dispatcher.js';

// The canonical command catalog — the single source CLI/MCP surfaces project from.
export { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from './catalog.js';

// Migrated commands (CUT A1, checkpoint 2+).
export { glossaryCommand, GLOSSARY_ENTRIES, matchGlossaryEntries } from './commands/glossary.js';
export type { GlossaryEntry, GlossaryPayload } from './commands/glossary.js';
export { versionCommand } from './commands/version.js';
export type { VersionPayload } from './commands/version.js';
export { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from './commands/capsule.js';
export type { CapsuleManifest, CapsuleManifestEntry } from './commands/manifest.js';
export { assetAnalyzeCommand, assetVerifyCommand } from './commands/asset.js';
export type { AssetAnalyzePayload } from './commands/asset.js';
export { sceneVerifyCommand, sceneCompileCommand, sceneRenderCommand } from './commands/scene.js';
