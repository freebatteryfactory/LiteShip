/**
 * LSP protocol constant tables — the runtime VALUES of the wire skin.
 *
 * Split from `types.ts` so that file stays fully erasable (types-file-purity):
 * these tables and command ids are runtime values with definition sites, and the
 * numeric types derived from them (`typeof` projections) live beside their
 * source of truth.
 *
 * Conformance: Language Server Protocol 3.17.
 *
 * @module
 */

/**
 * LSP `DiagnosticSeverity` (§Diagnostic). The rigor mapping (documented on
 * `severityToDiagnostic`): `error` → Error(1), `warning` → Warning(2),
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

/** LSP `CodeActionKind` subset (§CodeActionKind). The rigor projection emits only `quickfix`. */
export const CodeActionKind = {
  QuickFix: 'quickfix',
} as const;

/**
 * The client command id a `patch` workspace-edit and an `instruction` step-list
 * carry, so an editor extension knows which liteship action it is applying. Stable
 * (pinned by a test) so a downstream client can register handlers against it.
 */
export const APPLY_PATCH_COMMAND = 'liteship.gauntlet.applyPatch' as const;

/** The client command id an `instruction` code-action carries to surface its steps. */
export const SHOW_INSTRUCTION_COMMAND = 'liteship.gauntlet.showInstruction' as const;
