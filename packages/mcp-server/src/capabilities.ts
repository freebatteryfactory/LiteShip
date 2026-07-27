/**
 * The one MCP method/capability source.
 *
 * Dispatch and initialize-capability projection consume the same immutable
 * catalog. Adding an advertised capability without its complete method pair is
 * a construction error; adding a method without a dispatch arm is a compile
 * error in `dispatch.ts`'s exhaustive switch.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';

/** MCP protocol revision this server speaks (lifecycle floor from D1). */
export const PROTOCOL_VERSION = '2025-11-25';

/** One implemented MCP method, its message kind, and the capability it earns. */
export interface McpMethodDescriptor {
  readonly method:
    | 'initialize'
    | 'notifications/initialized'
    | 'tools/list'
    | 'tools/call'
    | 'resources/list'
    | 'resources/read'
    | 'prompts/list'
    | 'prompts/get'
    | 'ui/call-tool';
  readonly messageKind: 'request' | 'notification';
  readonly capability?: 'tools' | 'resources' | 'prompts' | 'ui';
}

const METHOD_ROWS = [
  { method: 'initialize', messageKind: 'request' },
  { method: 'notifications/initialized', messageKind: 'notification' },
  { method: 'tools/list', messageKind: 'request', capability: 'tools' },
  { method: 'tools/call', messageKind: 'request', capability: 'tools' },
  { method: 'resources/list', messageKind: 'request', capability: 'resources' },
  { method: 'resources/read', messageKind: 'request', capability: 'resources' },
  { method: 'prompts/list', messageKind: 'request', capability: 'prompts' },
  { method: 'prompts/get', messageKind: 'request', capability: 'prompts' },
  { method: 'ui/call-tool', messageKind: 'request', capability: 'ui' },
] as const satisfies readonly McpMethodDescriptor[];

/** Exact MCP request/notification surface used by dispatch and feature-edge proof. */
export const MCP_METHOD_CATALOG: readonly McpMethodDescriptor[] = Object.freeze(
  METHOD_ROWS.map((row) => Object.freeze(row)),
);

/** Capability object projected only from complete implemented MCP method pairs. */
export type McpServerCapabilities = Readonly<Record<string, unknown>> & {
  readonly tools: { readonly listChanged: false };
  readonly resources: { readonly listChanged: false };
  readonly prompts: { readonly listChanged: false };
  readonly ui: { readonly callServerTool: true };
};

/** Derive the honest minimal capability object from implemented catalog rows. */
export function projectServerCapabilities(catalog: readonly McpMethodDescriptor[]): McpServerCapabilities {
  const methods = new Set(catalog.map((row) => row.method));
  const requireMethods = (capability: string, required: readonly McpMethodDescriptor['method'][]): void => {
    const missing = required.filter((method) => !methods.has(method));
    if (missing.length > 0) {
      throw InvariantViolationError(
        'mcp-capability-projection',
        `${capability} capability has no registered handler(s): ${missing.join(', ')}`,
      );
    }
  };
  requireMethods('tools', ['tools/list', 'tools/call']);
  requireMethods('resources', ['resources/list', 'resources/read']);
  requireMethods('prompts', ['prompts/list', 'prompts/get']);
  requireMethods('ui', ['ui/call-tool']);
  return Object.freeze({
    tools: Object.freeze({ listChanged: false as const }),
    resources: Object.freeze({ listChanged: false as const }),
    prompts: Object.freeze({ listChanged: false as const }),
    ui: Object.freeze({ callServerTool: true as const }),
  });
}

/** Shared initialize/resource capability projection. */
export const SERVER_CAPABILITIES = projectServerCapabilities(MCP_METHOD_CATALOG);
