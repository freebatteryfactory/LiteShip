/** `@czap/mcp-server` — MCP bridge for **LiteShip**; forwards tools to the `czap` CLI + capsule factory. */

export { start } from './start.js';
export type { StartOpts } from './start.js';
export { listTools, dispatchToolCall, dispatch } from './dispatch.js';
export type { McpToolCall, McpToolResult } from './dispatch.js';

// Resource + prompt projections (CUT D3) — same registry the CLI/tools surfaces project.
export { listResources, readResource } from './resources.js';
export type { McpResource, McpResourceContents } from './resources.js';
export { listPrompts, getPrompt } from './prompts.js';
export type { McpPrompt, McpPromptArgument, GetPromptResult } from './prompts.js';

// Static MCP Apps UI resources (CUT D4) — the `ui://` visible twins of the D3 JSON resources.
export { listUiResources, readUiResource } from './ui-resources.js';
export type { McpUiResource, McpUiResourceContents, McpUiResourceMeta, McpUiResourceCsp } from './ui-resources.js';
export { runStdio } from './stdio.js';
export { runHttp } from './http.js';

// JSON-RPC 2.0 kernel — reusable beyond MCP.
export {
  JsonRpcServer,
  jsonRpcServerCapsule,
  parse,
  errorResponse,
  successResponse,
  ParseError,
  InvalidRequest,
  MethodNotFound,
  InvalidParams,
  InternalError,
} from './jsonrpc.js';
export type {
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcResponse,
  JsonRpcSuccess,
  JsonRpcErrorResponse,
  ParseOutcome,
} from './jsonrpc.js';
