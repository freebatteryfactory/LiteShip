/**
 * Finding.remediation → LSP CodeAction projection (PURE).
 *
 * The third skin's second half: a Finding's `remediation` — a machine-applicable
 * patch OR an ordered work-instruction — is ~90% an LSP `CodeAction`. This module
 * is the exact, total, side-effect-free mapping, tested in isolation (the patch
 * arm + the instruction arm).
 *
 * MAPPING (documented, pinned by tests):
 *  - `remediation.kind === 'patch'` (a unified diff) → a `quickfix` CodeAction
 *    carrying a `command` ({@link APPLY_PATCH_COMMAND}) whose arguments are the
 *    target file URI + the diff text. A unified diff is NOT a set of LSP
 *    `TextEdit`s (it is a hunk-addressed text format), so projecting it as a
 *    `WorkspaceEdit.changes` would require the server to parse + resolve the diff
 *    against current file contents — which the lean server has no document store
 *    for. Instead the action is a REAL machine-applicable command: the client
 *    extension applies the diff (`git apply` / a patch library) under the
 *    raccoon-rule it already owns. This is a real action, never a no-op.
 *  - `remediation.kind === 'instruction'` (ordered steps) → a `quickfix`
 *    CodeAction carrying a `command` ({@link SHOW_INSTRUCTION_COMMAND}) whose
 *    arguments are the description + the steps, so the client surfaces the
 *    ordered work-list (a planning agent or a human reads + executes it).
 *  - `CodeAction.diagnostics` links the action back to the diagnostic it fixes
 *    (§CodeAction.diagnostics) — the diagnostic the caller pairs with the
 *    finding, so "apply" attaches to the right squiggle.
 *
 * A finding with NO `remediation` yields NO code action ({@link projectRemediation}
 * returns `null`) — there is nothing to apply.
 *
 * @module
 */

import {
  APPLY_PATCH_COMMAND,
  CodeActionKind,
  SHOW_INSTRUCTION_COMMAND,
  type FindingRemediationLike,
  type LspCodeAction,
  type LspDiagnostic,
} from './types.js';

/**
 * Project a finding's remediation to an LSP CodeAction, or `null` when the
 * finding carries no remediation. `diagnostic` is the projected diagnostic the
 * action fixes (the §CodeAction.diagnostics back-link); `uri` is the document
 * the patch targets (carried in the apply-patch command arguments so the client
 * knows WHERE to apply the diff).
 *
 * PURE: no I/O, no clock, no host. Same (remediation, diagnostic, uri) → same
 * code action. The mapping is TOTAL over the two-member remediation union (the
 * `switch` has no `default` — a new remediation kind surfaces here as a
 * type error to handle, never a silent fall-through).
 */
export function projectRemediation(
  remediation: FindingRemediationLike | undefined,
  diagnostic: LspDiagnostic,
  uri: string,
): LspCodeAction | null {
  if (remediation === undefined) return null;
  switch (remediation.kind) {
    case 'patch':
      // A machine-applicable diff → a quickfix carrying the apply-patch command.
      return {
        title: remediation.description,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        command: {
          title: remediation.description,
          command: APPLY_PATCH_COMMAND,
          arguments: [{ uri, diff: remediation.diff, ruleId: diagnostic.code }],
        },
      };
    case 'instruction':
      // An ordered work-list → a quickfix carrying the show-instruction command.
      return {
        title: remediation.description,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        command: {
          title: remediation.description,
          command: SHOW_INSTRUCTION_COMMAND,
          arguments: [{ uri, description: remediation.description, steps: remediation.steps, ruleId: diagnostic.code }],
        },
      };
  }
}
