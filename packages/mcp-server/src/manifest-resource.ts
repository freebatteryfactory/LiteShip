/**
 * MCP-app manifest resource (CUT D6) — the reachable emission of the pure
 * `@czap/compiler` projector. The server collects the real registries it already
 * owns (command catalog, D3 resources/prompts, D4 static UI, D5 live app
 * resources, server identity + capabilities) and feeds them to
 * `compileMcpAppManifest`, then serves the result as a JSON resource at
 * `liteship://mcp-app/manifest`.
 *
 * The compiler stays pure (it never imports this package); the dependency edge
 * is one-way `@czap/mcp-server → @czap/compiler`. The manifest is a top-level
 * projection class — it lives at `ui-app`-distinct `liteship://mcp-app/…`, NOT in
 * the D3 `registry/*` space, and is NOT a member of its own `resources` array
 * (no self-reference).
 *
 * @module
 */
import { compileMcpAppManifest } from '@czap/compiler';
import type { McpAppManifest } from '@czap/compiler';
import { mcpExposedDescriptors } from '@czap/command';
import { serverInfo } from './server-info.js';
import { PROTOCOL_VERSION, SERVER_CAPABILITIES } from './capabilities.js';
import { listResources } from './resources.js';
import type { McpResource, McpResourceContents } from './resources.js';
import { listUiResources } from './ui-resources.js';
import { listAppResources } from './app-resources.js';
import { listPrompts } from './prompts.js';
import { NotFoundError } from '@czap/error';

/** The single top-level app-manifest resource URI (product-owned; distinct from registry/*). */
const MANIFEST_URI = 'liteship://mcp-app/manifest';

/** Project the live MCP-app manifest from the server's real registries (the compiler does the pure work). */
export function mcpAppManifest(): McpAppManifest {
  return compileMcpAppManifest({
    serverInfo: serverInfo(),
    protocolVersion: PROTOCOL_VERSION,
    capabilities: SERVER_CAPABILITIES,
    toolDescriptors: mcpExposedDescriptors(),
    resources: listResources(),
    uiResources: listUiResources(),
    appResources: listAppResources(),
    prompts: listPrompts(),
  });
}

/** The manifest resource descriptor for `resources/list` (its own class, served alongside D3/D4/D5). */
export function listManifestResources(): readonly McpResource[] {
  return [
    {
      uri: MANIFEST_URI,
      name: 'mcp-app/manifest',
      description:
        'The LiteShip MCP-app manifest: a projection over all real MCP / MCP Apps surfaces (server info, capabilities, tools, JSON resources, prompts, static UI + live app resources).',
      mimeType: 'application/json',
    },
  ];
}

/** Read the manifest resource. Any other `liteship://mcp-app/…` URI → `NotFoundError` (→ -32002). */
export function readManifestResource(uri: string): McpResourceContents {
  if (uri !== MANIFEST_URI) throw NotFoundError('resource', uri);
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(mcpAppManifest(), null, 2) }] };
}
