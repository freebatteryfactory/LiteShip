/**
 * The canonical command catalog (CUT A1, catalog collapse). One source of
 * command identity for every surface: CLI help / completion / describe and MCP
 * `tools/list` all project this registry instead of hand-maintaining their own
 * parallel tables.
 *
 * Migrated commands ({@link glossaryCommand}, {@link versionCommand}) contribute
 * their descriptor *and* handler; commands whose handlers are still legacy-backed
 * (routed by the CLI's own dispatch, pending migration) contribute a
 * descriptor-only entry here. Either way, identity lives in exactly one place.
 *
 * @module
 */
import type { CapsuleCommandDescriptor } from '@czap/core';
import { CommandRegistry, type RegisteredCommand } from './registry.js';
import { glossaryCommand } from './commands/glossary.js';
import { versionCommand } from './commands/version.js';
import { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from './commands/capsule.js';

/** Descriptors for commands whose handlers have not yet migrated into this package. */
const PENDING_DESCRIPTORS: readonly CapsuleCommandDescriptor[] = [
  {
    name: 'doctor',
    summary: 'Preflight rig-check: Node, pnpm, workspace, build artifacts, git hooks.',
    inputSchema: { type: 'object', properties: { fix: { type: 'boolean' }, ci: { type: 'boolean' } } },
    annotations: { group: 'castoff' },
  },
  {
    name: 'describe',
    summary: 'Dump the capsule catalog + command schema (the AI discovery surface).',
    inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['json', 'mcp'] } } },
    annotations: { readOnly: true, mcpExposed: true, group: 'castoff' },
  },
  {
    name: 'help',
    summary: 'Print the CLI usage chart (verb table grouped by phase).',
    inputSchema: { type: 'object', properties: {} },
    annotations: { cliOnly: true, group: 'castoff' },
  },
  {
    name: 'completion',
    summary: 'Emit a shell tab-completion script for sourcing into a shell rc.',
    inputSchema: { type: 'object', required: ['shell'], properties: { shell: { type: 'string', enum: ['bash', 'zsh', 'fish'] } } },
    annotations: { cliOnly: true, group: 'castoff' },
  },
  {
    name: 'scene.compile',
    summary: 'Compile a scene capsule.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  {
    name: 'scene.render',
    summary: 'Render a scene to mp4.',
    inputSchema: {
      type: 'object',
      required: ['scene', 'output'],
      properties: { scene: { type: 'string' }, output: { type: 'string' } },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  {
    name: 'scene.verify',
    summary: 'Run a scene capsule’s generated tests.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  {
    name: 'scene.dev',
    summary: 'Launch Vite + the browser scene player.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    annotations: { longRunning: true, group: 'compose' },
  },
  {
    name: 'asset.analyze',
    summary: 'Run a cachedProjection (beat / onset / waveform) over an asset.',
    inputSchema: {
      type: 'object',
      required: ['asset', 'projection'],
      properties: { asset: { type: 'string' }, projection: { type: 'string', enum: ['beat', 'onset', 'waveform'] } },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  {
    name: 'asset.verify',
    summary: 'Verify an asset capsule.',
    inputSchema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string' } } },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  {
    name: 'gauntlet',
    summary: 'Run the full release-grade gauntlet.',
    inputSchema: { type: 'object', properties: { 'dry-run': { type: 'boolean' } } },
    annotations: { mcpExposed: true, group: 'ship' },
  },
  {
    name: 'ship',
    summary: 'Mint ShipCapsule(s) and (unless --dry-run) hand off to pnpm publish (ADR-0011).',
    inputSchema: { type: 'object', properties: { filter: { type: 'string' }, 'dry-run': { type: 'boolean' } } },
    annotations: { destructive: true, group: 'ship' },
  },
  {
    name: 'verify',
    summary: 'Locally verify a tarball against its ShipCapsule (ADR-0011; no network).',
    inputSchema: { type: 'object', required: ['tarball', 'capsule'], properties: { tarball: { type: 'string' }, capsule: { type: 'string' } } },
    annotations: { readOnly: true, group: 'ship' },
  },
  {
    name: 'mcp',
    summary: 'Start the MCP server (stdio default; --http=PORT for HTTP).',
    inputSchema: { type: 'object', properties: { http: { type: 'string' } } },
    annotations: { longRunning: true, cliOnly: true, group: 'servers' },
  },
];

/** Every registered command: migrated (descriptor + handler) and pending (descriptor only). */
const ALL_COMMANDS: readonly RegisteredCommand[] = [
  glossaryCommand,
  versionCommand,
  capsuleInspectCommand,
  capsuleListCommand,
  capsuleVerifyCommand,
  ...PENDING_DESCRIPTORS.map((descriptor) => ({ descriptor })),
];

/** The single canonical registry instance. CLI and MCP both project from this. */
export const commandRegistry: CommandRegistry.Shape = CommandRegistry.make(ALL_COMMANDS);

/** The full catalog of descriptors, sorted by name. Mirrors {@link commandRegistry}.list(). */
export const COMMAND_CATALOG: readonly CapsuleCommandDescriptor[] = commandRegistry.list();

/** The MCP-exposed subset of the catalog (explicit opt-in via `annotations.mcpExposed`). */
export function mcpExposedDescriptors(): readonly CapsuleCommandDescriptor[] {
  return COMMAND_CATALOG.filter((descriptor) => descriptor.annotations?.mcpExposed === true);
}
