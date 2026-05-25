/**
 * describe (CLI adapter) — dumps the capsule assembly-kind catalog + the
 * command surface. Both the JSON command list and the `--format=mcp` tool
 * manifest are PROJECTIONS of the one canonical command catalog in
 * `@czap/command`; this file maintains no parallel command table. Default
 * format is JSON; `--format=mcp` emits the MCP tool manifest (the mcpExposed
 * subset — identical to `@czap/mcp-server`'s `listTools()`).
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';
import type { CapsuleCommandDescriptor } from '@czap/core';

/** Closed catalog of the seven assembly kinds (matches ADR-0008). */
const ASSEMBLY_KINDS = [
  'pureTransform',
  'receiptedMutation',
  'stateMachine',
  'siteAdapter',
  'policyGate',
  'cachedProjection',
  'sceneComposition',
] as const;

/** Result of `describe` in JSON mode. */
export interface DescribeReceipt {
  readonly assemblyKinds: readonly string[];
  readonly commands: readonly CapsuleCommandDescriptor[];
}

/** MCP tool descriptor as emitted in --format=mcp mode. */
export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
}

/** Project the mcpExposed catalog subset into MCP tool descriptors. */
function mcpTools(): readonly McpToolDescriptor[] {
  return mcpExposedDescriptors().map((descriptor) => ({
    name: descriptor.name,
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
  }));
}

/** Execute the describe command. */
export function describe(
  args: { format?: 'json' | 'mcp' } = {},
): DescribeReceipt | { tools: readonly McpToolDescriptor[] } {
  if (args.format === 'mcp') {
    const cachedManifest = '.czap/generated/mcp-manifest.json';
    if (existsSync(cachedManifest)) {
      return JSON.parse(readFileSync(cachedManifest, 'utf8')) as { tools: readonly McpToolDescriptor[] };
    }
    return { tools: mcpTools() };
  }
  return { assemblyKinds: ASSEMBLY_KINDS, commands: COMMAND_CATALOG };
}
