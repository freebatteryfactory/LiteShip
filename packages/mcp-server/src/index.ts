/** `@liteship/mcp-server` — MCP bridge for **LiteShip**; forwards tools to the `liteship` CLI + capsule factory. */

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

// Live MCP Apps app resources (CUT D5) — interactive `ui://liteship/app/…` views linked from tools.
export { listAppResources, readAppResource } from './app-resources.js';

// MCP-app manifest (CUT D6) — the reachable `liteship://mcp-app/manifest` projection over all surfaces.
export { mcpAppManifest, listManifestResources, readManifestResource } from './manifest-resource.js';
export { runStdio } from './stdio.js';
export { runHttp } from './http.js';

// LSP rigor skin (Slice B/B3) — the THIRD JSON-RPC face over the one gauntlet
// fold: gauntlet Findings projected to live LSP Diagnostics + their remediations
// to CodeActions. The gauntlet runner is INJECTED (the heavy audit engine stays
// in the CLI host), so this package keeps its lean dependency set — it takes the
// engine edge nowhere, not even in prose (D9b-2 pins the boundary by literal).
export {
  runLspStdio,
  handle as handleLspMessage,
  initialLspState,
  projectFinding,
  groupDiagnosticsByUri,
  projectRemediation,
  severityToDiagnostic,
  fileToUri,
  makeFrameReader,
  encodeFrame,
  LITESHIP_CHECK_METHOD,
  LSP_SERVER_CAPABILITIES,
  DiagnosticSeverity,
  CodeActionKind,
  APPLY_PATCH_COMMAND,
  SHOW_INSTRUCTION_COMMAND,
  DIAGNOSTIC_SOURCE,
} from './lsp/index.js';
export type {
  LspGauntletRunner,
  LspServerState,
  LspHandleResult,
  LspNotification,
  FrameReader,
  FindingLike,
  FindingSeverity,
  FindingLevel,
  FindingLocationLike,
  FindingRemediationLike,
  LspPosition,
  LspRange,
  LspDiagnostic,
  LspDiagnosticSeverity,
  PublishDiagnosticsParams,
  LspTextEdit,
  LspWorkspaceEdit,
  LspCommand,
  LspCodeAction,
} from './lsp/index.js';

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
