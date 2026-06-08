/**
 * MCP-app manifest projector (CUT D6) — a PURE compiler target that projects a
 * single `McpAppManifest` artifact over the REAL MCP / MCP-Apps surfaces, fed in
 * as plain data. It is NOT a registry and NOT a second source of truth: every
 * tool comes from a passed-in command descriptor, every resource/prompt/UI entry
 * passes through verbatim. The canonical truth stays `@czap/command` +
 * `@czap/mcp-server`'s registries; this is a *view* over them.
 *
 * Topology law: `@czap/compiler` MUST NOT import `@czap/mcp-server` (nor
 * `@czap/command`). The wire-shaped inputs are accepted as LOCAL STRUCTURAL types;
 * the only cross-package type used is `CapsuleCommandDescriptor` (already in
 * `@czap/core`). The server feeds its real registries in; the compiler never crawls.
 *
 * Anti-drift core: {@link compileMcpAppManifest}'s tool projection is byte-identical
 * to `@czap/mcp-server`'s `listTools()` — the acceptance suite proves
 * `manifest.tools` deep-equals `listTools()` for the same descriptors.
 *
 * @module
 */
import type { CapsuleCommandDescriptor } from '@czap/core';

/** A D3 JSON resource as it appears on the wire (structural mirror of mcp-server's `McpResource`). */
export interface ManifestResourceView {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
}

/** A D4/D5 MCP Apps UI resource (structural mirror of mcp-server's `McpUiResource`). */
export interface ManifestUiResourceView {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
  readonly _meta: {
    readonly ui: {
      readonly csp: {
        readonly connectDomains: readonly string[];
        readonly resourceDomains: readonly string[];
        readonly frameDomains: readonly string[];
        readonly baseUriDomains: readonly string[];
      };
      readonly permissions?: readonly string[];
      readonly domain?: string;
      readonly prefersBorder?: boolean;
    };
  };
}

/** A D3 prompt (structural mirror of mcp-server's `McpPrompt`). */
export interface ManifestPromptView {
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly { readonly name: string; readonly description: string; readonly required: boolean }[];
}

/** A projected MCP tool — the exact shape `listTools()` emits. */
export interface ManifestToolView {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  readonly outputSchema?: object;
  readonly _meta?: { readonly ui: { readonly resourceUri: string } };
}

/** Inputs to {@link compileMcpAppManifest} — all supplied as plain data by the caller (server/tests). */
export interface CompileMcpAppManifestInput {
  readonly serverInfo: { readonly name: string; readonly version: string };
  readonly protocolVersion: string;
  readonly capabilities: Readonly<Record<string, unknown>>;
  /** The MCP-exposed command descriptors (e.g. `mcpExposedDescriptors()`). */
  readonly toolDescriptors: readonly CapsuleCommandDescriptor[];
  readonly resources: readonly ManifestResourceView[];
  readonly uiResources: readonly ManifestUiResourceView[];
  readonly appResources: readonly ManifestUiResourceView[];
  readonly prompts: readonly ManifestPromptView[];
}

/** The MCP-app manifest: a projection over all real MCP / MCP-Apps surfaces. */
export interface McpAppManifest {
  readonly serverInfo: { readonly name: string; readonly version: string };
  readonly protocolVersion: string;
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly tools: readonly ManifestToolView[];
  readonly resources: readonly ManifestResourceView[];
  /** D4 static UI resources — kept distinct from {@link appResources} (D5 live). */
  readonly uiResources: readonly ManifestUiResourceView[];
  /** D5 live app resources (`ui://liteship/app/…`). */
  readonly appResources: readonly ManifestUiResourceView[];
  readonly prompts: readonly ManifestPromptView[];
  /** Named reference to the D1 result-envelope policy (a constant, not re-derived logic). */
  readonly resultEnvelope: { readonly receiptMetaKey: 'liteship/result'; readonly structuredContentIsPayload: true };
  /** The product-owned namespace contract (D3/D4/D5/D6). */
  readonly namespacePolicy: {
    readonly resourcePrefix: 'liteship://';
    readonly uiPrefix: 'ui://liteship/';
    readonly appPrefix: 'ui://liteship/app/';
  };
}

/**
 * Project ONE command descriptor exactly as `@czap/mcp-server`'s `listTools()`
 * does (CUT D2 outputSchema + CUT D5 `_meta.ui.resourceUri`). Keeping this rule
 * identical to the server's is what makes the manifest a projection, not a fork.
 */
function projectTool(descriptor: CapsuleCommandDescriptor): ManifestToolView {
  return {
    name: descriptor.name,
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
    ...(descriptor.outputSchema ? { outputSchema: descriptor.outputSchema } : {}),
    ...(descriptor.ui ? { _meta: { ui: { resourceUri: descriptor.ui.resourceUri } } } : {}),
  };
}

/**
 * Compile the MCP-app manifest. Pure + total: tools are projected from
 * `toolDescriptors`; resources/prompts/UI surfaces pass through verbatim; the
 * envelope + namespace policies are constants. No I/O, no clock, no invention.
 */
export function compileMcpAppManifest(input: CompileMcpAppManifestInput): McpAppManifest {
  return {
    serverInfo: input.serverInfo,
    protocolVersion: input.protocolVersion,
    capabilities: input.capabilities,
    tools: input.toolDescriptors.map(projectTool),
    resources: input.resources,
    uiResources: input.uiResources,
    appResources: input.appResources,
    prompts: input.prompts,
    resultEnvelope: { receiptMetaKey: 'liteship/result', structuredContentIsPayload: true },
    namespacePolicy: { resourcePrefix: 'liteship://', uiPrefix: 'ui://liteship/', appPrefix: 'ui://liteship/app/' },
  };
}
