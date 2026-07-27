/**
 * describe (CLI adapter) — dumps the capsule assembly-kind catalog + the
 * command surface. Both the JSON command list and the `--format=mcp` tool
 * manifest are PROJECTIONS of the one canonical command catalog in
 * `@liteship/command`; this file maintains no parallel command table. Default
 * format is JSON; `--format=mcp` emits the MCP tool manifest (the mcpExposed
 * subset — identical to `@liteship/mcp-server`'s `listTools()`).
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { COMMAND_CATALOG, PUBLIC_SURFACE_CONTEXT, mcpExposedDescriptors } from '@liteship/command';
import { ASSEMBLY_KINDS, type CapsuleCommandDescriptor } from '@liteship/core';

/** Result of `describe` in JSON mode. */
export interface DescribeReceipt {
  readonly assemblyKinds: readonly string[];
  readonly commands: readonly CapsuleCommandDescriptor[];
  readonly publicSurface: typeof PUBLIC_SURFACE_CONTEXT;
}

/** MCP tool descriptor as emitted in --format=mcp mode. */
export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  readonly outputSchema?: object;
  readonly _meta?: { ui: { resourceUri: string } };
}

/**
 * Project the mcpExposed catalog subset into MCP tool descriptors. Must stay
 * byte-identical to @liteship/mcp-server's `listTools()` (A1-T4 parity), so it emits
 * `outputSchema` (CUT D2) and `_meta.ui.resourceUri` (CUT D5) for the same descriptors.
 */
function mcpTools(): readonly McpToolDescriptor[] {
  return mcpExposedDescriptors().map((descriptor) => ({
    name: descriptor.name,
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
    ...(descriptor.outputSchema ? { outputSchema: descriptor.outputSchema } : {}),
    ...(descriptor.ui ? { _meta: { ui: { resourceUri: descriptor.ui.resourceUri } } } : {}),
  }));
}

/** Execute the describe command. */
export function describe(
  args: { format?: 'json' | 'mcp' } = {},
): DescribeReceipt | { tools: readonly McpToolDescriptor[] } {
  if (args.format === 'mcp') {
    const cachedManifest = '.liteship/generated/mcp-manifest.json';
    if (existsSync(cachedManifest)) {
      return JSON.parse(readFileSync(cachedManifest, 'utf8')) as { tools: readonly McpToolDescriptor[] };
    }
    return { tools: mcpTools() };
  }
  return { assemblyKinds: ASSEMBLY_KINDS, commands: COMMAND_CATALOG, publicSurface: PUBLIC_SURFACE_CONTEXT };
}
