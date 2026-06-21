/**
 * LSP skin — wire types + the structural Finding contract.
 *
 * The gauntlet `Finding` is ~90% an LSP `Diagnostic`, and a Finding's
 * `remediation` is ~90% an LSP `CodeAction`. This module declares JUST the
 * subset of the Language Server Protocol the rigor projection needs — the
 * diagnostics + code-actions surface, NOT the full LSP (no hover, completion,
 * rename, semantic tokens). It is the third JSON-RPC skin over the one gauntlet
 * fold (CLI = `czap check`, MCP = tools/call, LSP = live diagnostics).
 *
 * LEAN-ENGINE BOUNDARY (the load-bearing decision): `@czap/mcp-server` does NOT
 * depend on `@czap/gauntlet` (and must not — that would drag the engine into the
 * thin server). So the Finding shape the projections consume is declared HERE as
 * a STRUCTURAL contract ({@link FindingLike}) that the real `@czap/gauntlet`
 * `Finding` is assignable to. The gauntlet findings arrive over the INJECTED
 * runner ({@link LspGauntletRunner}), exactly like `dispatch.ts` gets its check
 * findings via `context.runGauntlet` — the engine stays in the CLI host.
 *
 * Conformance: Language Server Protocol 3.17
 * (https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/).
 *
 * @module
 */

// ---------- The structural Finding contract (mirrors @czap/gauntlet) ----------

/** Severity vocabulary — structurally identical to `@czap/gauntlet`'s `Severity`. */
export type FindingSeverity = 'advisory' | 'warning' | 'error';

/** Assurance level vocabulary — structurally identical to `@czap/gauntlet`'s `AssuranceLevel`. */
export type FindingLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** Where a finding points — structurally identical to `@czap/gauntlet`'s `SourceLocation`. */
export interface FindingLocationLike {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

/** How to fix a finding — structurally identical to `@czap/gauntlet`'s `Remediation`. */
export type FindingRemediationLike =
  | { readonly kind: 'patch'; readonly description: string; readonly diff: string }
  | { readonly kind: 'instruction'; readonly description: string; readonly steps: readonly string[] };

/**
 * The structural finding the projections read. The real `@czap/gauntlet`
 * `Finding` is assignable to this (same field names + types). Declaring it here
 * — instead of importing the engine type — keeps `@czap/mcp-server` free of a
 * `@czap/gauntlet` dependency (the lean-server invariant). The injected runner
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
 * LSP `DiagnosticSeverity` (§Diagnostic). The rigor mapping (documented on
 * {@link severityToDiagnostic}): `error` → Error(1), `warning` → Warning(2),
 * `advisory` → Information(3) — advisory is the authority ratchet's calibrating
 * tier (a real, surfaced finding that does NOT block), which `Information` (a
 * visible, non-actionable-yet notice) models more honestly than `Hint(4)`
 * (which editors fold away behind a fade).
 */
export const DiagnosticSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4,
} as const;

/** A numeric LSP diagnostic severity (1..4). */
export type LspDiagnosticSeverity = (typeof DiagnosticSeverity)[keyof typeof DiagnosticSeverity];

/**
 * LSP `Diagnostic` (§Diagnostic). `code` carries the gate `ruleId`; `source` is
 * the fixed `'czap-gauntlet'` provenance; `data` carries the assurance level +
 * coverage class (the rigor metadata an editor surfaces and a code-action reads
 * back). `message` is the finding's WHY (title + detail).
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
 * LSP `MessageType` (§window/logMessage, §window/showMessage). The numeric
 * severity a server→client log/notification carries. `Error(1)` is the loudest —
 * the type a handler failure logs under.
 */
export const MessageType = {
  Error: 1,
  Warning: 2,
  Info: 3,
  Log: 4,
} as const;

/** A numeric LSP message type (1..4). */
export type LspMessageType = (typeof MessageType)[keyof typeof MessageType];

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

/** LSP `TextEdit` (§Text Documents) — replace `range` with `newText`. */
export interface LspTextEdit {
  readonly range: LspRange;
  readonly newText: string;
}

/** LSP `WorkspaceEdit` (§WorkspaceEdit) — file-keyed text edits. */
export interface LspWorkspaceEdit {
  readonly changes: Readonly<Record<string, readonly LspTextEdit[]>>;
}

/** LSP `Command` (§Command) — a client-executed command carrying its arguments. */
export interface LspCommand {
  readonly title: string;
  readonly command: string;
  readonly arguments: readonly unknown[];
}

/** LSP `CodeActionKind` subset (§CodeActionKind). The rigor projection emits only `quickfix`. */
export const CodeActionKind = {
  QuickFix: 'quickfix',
} as const;

/**
 * LSP `CodeAction` (§textDocument/codeAction). A `patch` remediation projects to
 * an `edit` (a machine-applicable {@link LspWorkspaceEdit} carrying the diff for
 * the client to apply); an `instruction` remediation projects to a `command`
 * (the client surfaces the ordered steps). `diagnostics` links the action back
 * to the diagnostic it fixes (§CodeAction.diagnostics).
 */
export interface LspCodeAction {
  readonly title: string;
  readonly kind: string;
  readonly diagnostics: readonly LspDiagnostic[];
  readonly edit?: LspWorkspaceEdit;
  readonly command?: LspCommand;
}

/**
 * The client command id a `patch` workspace-edit and an `instruction` step-list
 * carry, so an editor extension knows which czap action it is applying. Stable
 * (pinned by a test) so a downstream client can register handlers against it.
 */
export const APPLY_PATCH_COMMAND = 'czap.gauntlet.applyPatch' as const;

/** The client command id an `instruction` code-action carries to surface its steps. */
export const SHOW_INSTRUCTION_COMMAND = 'czap.gauntlet.showInstruction' as const;
