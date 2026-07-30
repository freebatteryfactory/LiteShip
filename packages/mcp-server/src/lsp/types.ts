/**
 * LSP skin — wire types + the structural Finding contract.
 *
 * The gauntlet `Finding` is ~90% an LSP `Diagnostic`, and a Finding's
 * `remediation` is ~90% an LSP `CodeAction`. This module declares JUST the
 * subset of the Language Server Protocol the rigor projection needs — the
 * diagnostics + code-actions surface, NOT the full LSP (no hover, completion,
 * rename, semantic tokens). It is the third JSON-RPC skin over the one gauntlet
 * fold (CLI = `liteship check`, MCP = tools/call, LSP = live diagnostics).
 *
 * LEAN-ENGINE BOUNDARY (the load-bearing decision): `@liteship/mcp-server` does NOT
 * depend on `@liteship/gauntlet` (and must not — that would drag the engine into the
 * thin server). So the Finding shape the projections consume is declared HERE as
 * a STRUCTURAL contract ({@link FindingLike}) that the real `@liteship/gauntlet`
 * `Finding` is assignable to. The gauntlet findings arrive over the INJECTED
 * runner ({@link LspGauntletRunner}), exactly like `dispatch.ts` gets its check
 * findings via `context.runGauntlet` — the engine stays in the CLI host.
 *
 * Conformance: Language Server Protocol 3.17
 * (https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/).
 *
 * @module
 */

import type { LspDiagnosticSeverity, LspMessageType } from './protocol.js';

// The numeric protocol types live with their constant tables in protocol.ts
// (types.ts stays fully erasable); re-exported here so the type surface is one
// import for consumers.
export type { LspDiagnosticSeverity, LspMessageType } from './protocol.js';

// ---------- The structural Finding contract (mirrors @liteship/gauntlet) ----------

/** Severity vocabulary — structurally identical to `@liteship/gauntlet`'s `Severity`. */
export type FindingSeverity = 'advisory' | 'warning' | 'error';

/** Assurance level vocabulary — structurally identical to `@liteship/gauntlet`'s `AssuranceLevel`. */
export type FindingLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** Where a finding points — structurally identical to `@liteship/gauntlet`'s `SourceLocation`. */
export interface FindingLocationLike {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

/** How to fix a finding — structurally identical to `@liteship/gauntlet`'s `Remediation`. */
export type FindingRemediationLike =
  | { readonly kind: 'patch'; readonly description: string; readonly diff: string }
  | { readonly kind: 'instruction'; readonly description: string; readonly steps: readonly string[] };

/**
 * The structural finding the projections read. The real `@liteship/gauntlet`
 * `Finding` is assignable to this (same field names + types). Declaring it here
 * — instead of importing the engine type — keeps `@liteship/mcp-server` free of a
 * `@liteship/gauntlet` dependency (the lean-server invariant). The injected runner
 * supplies values that satisfy this shape.
 */
export interface FindingLike {
  readonly ruleId: string;
  readonly severity: FindingSeverity;
  readonly level: FindingLevel;
  readonly title: string;
  readonly detail: string;
  readonly location?: FindingLocationLike;
  readonly remediation?: FindingRemediationLike;
}

/**
 * The injected gauntlet runner — the LSP's ONLY door to findings. Mirrors
 * `CommandContext.runGauntlet`: the engine fold (and its `node:fs` glob +
 * waiver-expiry wall-clock) lives in the CLI host, NOT in this server. The
 * server folds the returned findings into diagnostics; it never runs the
 * gauntlet itself. Returns findings grouped per the engine's flat list — the
 * server groups them by file URI for `publishDiagnostics`.
 */
export type LspGauntletRunner = (globs?: readonly string[]) => Promise<{
  readonly findings: readonly FindingLike[];
  readonly blocked: boolean;
}>;

// ---------- LSP wire types (the rigor-projection subset of LSP 3.17) ----------

/** LSP `Position` (§Text Documents) — 0-based line + character. */
export interface LspPosition {
  readonly line: number;
  readonly character: number;
}

/** LSP `Range` — `[start, end)` over a document. */
export interface LspRange {
  readonly start: LspPosition;
  readonly end: LspPosition;
}

/**
 * LSP `Diagnostic` (§Diagnostic). `code` carries the gate `ruleId`; `source` is
 * the fixed `'liteship-gauntlet'` provenance; `data` carries the assurance level
 * and rule identity that an editor surfaces and a code-action reads back.
 * `message` is the finding's WHY (title + detail).
 */
export interface LspDiagnostic {
  readonly range: LspRange;
  readonly severity: LspDiagnosticSeverity;
  readonly code: string;
  readonly source: string;
  readonly message: string;
  /** Rigor metadata round-tripped to the code-action layer: assurance level + ruleId. */
  readonly data: { readonly level: FindingLevel; readonly ruleId: string };
}

/** LSP `PublishDiagnosticsParams` (§textDocument/publishDiagnostics). */
export interface PublishDiagnosticsParams {
  readonly uri: string;
  readonly diagnostics: readonly LspDiagnostic[];
}

/**
 * LSP `LogMessageParams` (§window/logMessage) — a server→client notification the
 * editor records in its output channel WITHOUT a user-facing popup (unlike
 * `showMessage`). The honest channel for surfacing a notification-handler failure:
 * a notification produces no JSON-RPC response (§4.1), but its error is logged
 * out-of-band rather than silently dropped.
 */
export interface LogMessageParams {
  readonly type: LspMessageType;
  readonly message: string;
}

/** LSP `Command` (§Command) — a client-executed command carrying its arguments. */
export interface LspCommand {
  readonly title: string;
  readonly command: string;
  readonly arguments: readonly unknown[];
}

/**
 * LSP `CodeAction` (§textDocument/codeAction). Both patch and instruction
 * remediations project to client-executed commands. The lean server has no
 * document store and therefore does not advertise or model WorkspaceEdit.
 * `diagnostics` links the action back to the diagnostic it fixes.
 */
export interface LspCodeAction {
  readonly title: string;
  readonly kind: string;
  readonly diagnostics: readonly LspDiagnostic[];
  readonly command?: LspCommand;
}
