/**
 * The LSP rigor skin — the THIRD JSON-RPC face over the one gauntlet fold.
 *
 * `@czap/mcp-server` already owns the JSON-RPC transport (`jsonrpc.ts`); this
 * subtree adds an LSP (Language Server Protocol) projection of the gauntlet
 * `Finding`: it publishes findings as live `textDocument/publishDiagnostics`
 * Diagnostics and offers their remediations as `textDocument/codeAction`
 * CodeActions. The CLI (`czap check`) and the MCP server (`tools/call`) are the
 * other two skins; all three read the SAME `Finding`.
 *
 * The gauntlet runner is INJECTED ({@link LspGauntletRunner}) — the engine fold
 * (and the heavy audit engine it builds the RepoIR with) lives in the CLI host,
 * so this package stays lean: it takes the engine edge NOWHERE, not even in prose
 * (D9b-2 pins the boundary by forbidding the literal package specifier here).
 *
 * @module
 */

export {
  projectFinding,
  groupDiagnosticsByUri,
  severityToDiagnostic,
  fileToUri,
  DIAGNOSTIC_SOURCE,
} from './diagnostic.js';
export { projectRemediation } from './code-action.js';
export {
  handle,
  initialLspState,
  CZAP_CHECK_METHOD,
  LSP_SERVER_CAPABILITIES,
  type LspServerState,
  type LspHandleResult,
  type LspNotification,
} from './server.js';
export { runLspStdio } from './stdio.js';
export { makeFrameReader, encodeFrame, type FrameReader } from './framing.js';
export {
  DiagnosticSeverity,
  CodeActionKind,
  APPLY_PATCH_COMMAND,
  SHOW_INSTRUCTION_COMMAND,
  type FindingLike,
  type FindingSeverity,
  type FindingLevel,
  type FindingLocationLike,
  type FindingRemediationLike,
  type LspGauntletRunner,
  type LspPosition,
  type LspRange,
  type LspDiagnostic,
  type LspDiagnosticSeverity,
  type PublishDiagnosticsParams,
  type LspTextEdit,
  type LspWorkspaceEdit,
  type LspCommand,
  type LspCodeAction,
} from './types.js';
