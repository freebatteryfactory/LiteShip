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
import { assetAnalyzeCommand, assetVerifyCommand } from './commands/asset.js';
import { sceneVerifyCommand, sceneCompileCommand, sceneRenderCommand } from './commands/scene.js';
import { verifyCommand } from './commands/verify.js';
import { auditCommand } from './commands/audit.js';
import { plumbCommand } from './commands/plumb.js';
import { checkInvariantsCommand } from './commands/check-invariants.js';

/**
 * Descriptors for commands whose execution is owned by the CLI (terminal
 * orchestration, destructive/streaming workflows, host-probe batteries, catalog
 * projections) — they intentionally have NO `@czap/command` handler. They are
 * still first-class catalog entries for identity + discovery. Tagged
 * `executionKind: 'cli-orchestration'` structurally at assembly below, so a
 * CLI-owned entry can never silently look like a finite command that lost its
 * handler.
 */
const CLI_OWNED_DESCRIPTORS: readonly CapsuleCommandDescriptor[] = [
  {
    name: 'doctor',
    summary: 'Preflight rig-check: Node, pnpm, workspace, build artifacts, git hooks.',
    inputSchema: {
      type: 'object',
      properties: {
        fix: { type: 'boolean' },
        ci: { type: 'boolean' },
        preflight: { type: 'boolean' },
        target: { type: 'string', enum: ['cloudflare'] },
      },
    },
    annotations: { group: 'castoff' },
  },
  {
    name: 'describe',
    summary: 'Dump the capsule catalog + command schema (the AI discovery surface).',
    inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['json', 'mcp'] } } },
    // NOT mcpExposed: describe is a catalog projection — MCP already serves that
    // via tools/list, so exposing it as a callable tool is duplicate ontology.
    annotations: { readOnly: true, group: 'castoff' },
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
    inputSchema: {
      type: 'object',
      required: ['shell'],
      properties: { shell: { type: 'string', enum: ['bash', 'zsh', 'fish'] } },
    },
    annotations: { cliOnly: true, group: 'castoff' },
  },
  {
    name: 'scene.dev',
    summary: 'Launch Vite + the browser scene player.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    annotations: { longRunning: true, group: 'compose' },
  },
  {
    name: 'gauntlet',
    summary: 'Run the full release-grade gauntlet.',
    inputSchema: { type: 'object', properties: { 'dry-run': { type: 'boolean' } } },
    // NOT mcpExposed: gauntlet is a blocking spawnSync(stdio:inherit) that streams
    // a 28-phase run to a terminal — terminal orchestration, not an MCP tool.
    annotations: { group: 'ship' },
  },
  {
    name: 'ship',
    summary: 'Mint ShipCapsule(s) and (unless --dry-run) hand off to pnpm publish (ADR-0011).',
    inputSchema: { type: 'object', properties: { filter: { type: 'string' }, 'dry-run': { type: 'boolean' } } },
    annotations: { destructive: true, group: 'ship' },
  },
  {
    name: 'mcp',
    summary: 'Start the MCP server (stdio default; --http=PORT for HTTP).',
    inputSchema: { type: 'object', properties: { http: { type: 'string' } } },
    annotations: { longRunning: true, cliOnly: true, group: 'servers' },
  },
];

/** Finite, structured, handler-backed commands. Each is tagged `executionKind: 'handler'`. */
const HANDLER_COMMANDS: readonly RegisteredCommand[] = [
  glossaryCommand,
  versionCommand,
  capsuleInspectCommand,
  capsuleListCommand,
  capsuleVerifyCommand,
  assetAnalyzeCommand,
  assetVerifyCommand,
  sceneVerifyCommand,
  sceneCompileCommand,
  sceneRenderCommand,
  verifyCommand,
  auditCommand,
  plumbCommand,
  checkInvariantsCommand,
];

/**
 * Every registered command, with `executionKind` injected structurally by list
 * membership: handler-backed commands → `handler`; CLI-owned descriptors →
 * `cli-orchestration`. A command can never be misclassified — a `HandledCommand`
 * only lives in HANDLER_COMMANDS; a handler-less descriptor only in
 * CLI_OWNED_DESCRIPTORS — and the catalog tests enforce the law.
 */
const ALL_COMMANDS: readonly RegisteredCommand[] = [
  ...HANDLER_COMMANDS.map((command) => ({
    ...command,
    descriptor: { ...command.descriptor, executionKind: 'handler' as const },
  })),
  ...CLI_OWNED_DESCRIPTORS.map((descriptor) => ({
    descriptor: { ...descriptor, executionKind: 'cli-orchestration' as const },
  })),
];

/** The single canonical registry instance. CLI and MCP both project from this. */
export const commandRegistry: CommandRegistry.Shape = CommandRegistry.make(ALL_COMMANDS);

/** The full catalog of descriptors, sorted by name. Mirrors {@link commandRegistry}.list(). */
export const COMMAND_CATALOG: readonly CapsuleCommandDescriptor[] = commandRegistry.list();

/** The MCP-exposed subset of the catalog (explicit opt-in via `annotations.mcpExposed`). */
export function mcpExposedDescriptors(): readonly CapsuleCommandDescriptor[] {
  return COMMAND_CATALOG.filter((descriptor) => descriptor.annotations?.mcpExposed === true);
}
