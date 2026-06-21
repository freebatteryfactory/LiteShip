/**
 * Finding → LSP Diagnostic projection (PURE).
 *
 * The third skin's first half: a gauntlet {@link FindingLike} is ~90% an LSP
 * `Diagnostic`. This module is the exact, total, side-effect-free mapping —
 * tested in isolation (every severity, every level, the 1-based→0-based line
 * conversion, the no-column case).
 *
 * MAPPING (documented, pinned by tests):
 *  - `location {file, line?, column?}` → `Diagnostic.range`. LSP is 0-based;
 *    Finding lines/columns are 1-based, so subtract 1 (clamped at 0 so a
 *    malformed line 0 never produces a negative coordinate). With no line, the
 *    finding points at the file head (line 0). With no column, the range spans
 *    the WHOLE line (character 0 → end-of-line sentinel) so an editor underlines
 *    the line, not a single caret.
 *  - `severity` → `DiagnosticSeverity` (see {@link severityToDiagnostic}).
 *  - `ruleId` → `Diagnostic.code` (the traceability anchor an editor shows).
 *  - `title` + `detail` → `Diagnostic.message` ("title — detail": the WHAT then
 *    the WHY, on one wire string the editor renders).
 *  - `level` (L0..L4) → `Diagnostic.data.level` (the assurance level surfaced to
 *    the dev + round-tripped to the code-action layer).
 *  - `source` = the fixed `'czap-gauntlet'` provenance.
 *
 * A finding with NO `location` cannot be a textDocument diagnostic (a Diagnostic
 * is always anchored to a document range). {@link projectFinding} returns `null`
 * for such findings; the server filters them — they are surfaced via the MCP /
 * CLI skins, which carry findings without a source anchor.
 *
 * @module
 */

import { pathToFileURL } from 'node:url';
import {
  DiagnosticSeverity,
  type FindingLike,
  type FindingSeverity,
  type LspDiagnostic,
  type LspDiagnosticSeverity,
  type LspRange,
} from './types.js';

/** The fixed provenance every gauntlet diagnostic carries (§Diagnostic.source). */
export const DIAGNOSTIC_SOURCE = 'czap-gauntlet' as const;

/**
 * LSP has no "to end of line" position in a single number, so a whole-line range
 * (no column) ends at this large character sentinel — every conformant client
 * clamps an end character past EOL to the actual line length (§Position), giving
 * a full-line underline without the server reading file contents (it has none).
 */
const END_OF_LINE_SENTINEL = Number.MAX_SAFE_INTEGER;

/**
 * Map a finding severity to its LSP diagnostic severity.
 *  - `error` → Error(1): blocks; the loudest.
 *  - `warning` → Warning(2): tracked-but-tolerated.
 *  - `advisory` → Information(3): the authority ratchet's calibrating tier — a
 *    real finding that does NOT yet block. `Information` (a visible notice)
 *    models "surfaced but non-blocking" more honestly than `Hint(4)` (which
 *    editors fade away). The mapping is total over the three-member union.
 */
export function severityToDiagnostic(severity: FindingSeverity): LspDiagnosticSeverity {
  switch (severity) {
    case 'error':
      return DiagnosticSeverity.Error;
    case 'warning':
      return DiagnosticSeverity.Warning;
    case 'advisory':
      return DiagnosticSeverity.Information;
  }
}

/**
 * Convert a 1-based Finding line/column to the 0-based LSP range. Subtract 1,
 * clamp at 0 (a defensive floor: a malformed `line: 0` would otherwise produce
 * `-1`, which no client accepts). With no column, span the whole line.
 */
function locationToRange(line: number | undefined, column: number | undefined): LspRange {
  const startLine = line !== undefined ? Math.max(0, line - 1) : 0;
  if (column !== undefined) {
    const startChar = Math.max(0, column - 1);
    // A column-anchored finding underlines a single character at the column.
    return { start: { line: startLine, character: startChar }, end: { line: startLine, character: startChar + 1 } };
  }
  // No column → whole-line range (character 0 → end-of-line sentinel).
  return { start: { line: startLine, character: 0 }, end: { line: startLine, character: END_OF_LINE_SENTINEL } };
}

/**
 * Compose the diagnostic message: `title` then `detail` (the WHAT, then the WHY)
 * joined by an em-dash, mirroring the CLI's `ruleId: title` rendering but
 * carrying the full `detail` an editor's hover panel can show. When `detail` is
 * empty (or duplicates the title), the title stands alone.
 */
function composeMessage(title: string, detail: string): string {
  if (detail.length === 0 || detail === title) return title;
  return `${title} — ${detail}`;
}

/**
 * Project a single Finding to an LSP Diagnostic, or `null` when the finding has
 * no source `location` (a Diagnostic must be anchored to a document range — an
 * unanchored finding is surfaced through the MCP/CLI skins instead).
 *
 * PURE: no I/O, no clock, no host. Same finding → same diagnostic.
 */
export function projectFinding(finding: FindingLike): { uri: string; diagnostic: LspDiagnostic } | null {
  const location = finding.location;
  if (location === undefined) return null;
  return {
    uri: fileToUri(location.file),
    diagnostic: {
      range: locationToRange(location.line, location.column),
      severity: severityToDiagnostic(finding.severity),
      code: finding.ruleId,
      source: DIAGNOSTIC_SOURCE,
      message: composeMessage(finding.title, finding.detail),
      data: { level: finding.level, ruleId: finding.ruleId },
    },
  };
}

/**
 * Group a flat finding list into `PublishDiagnosticsParams`-shaped buckets keyed
 * by file URI. Findings with no location are dropped (they cannot anchor to a
 * document). The grouping is DETERMINISTIC: URIs sort lexically, diagnostics
 * within a URI keep finding order — so two equal finding lists publish
 * byte-identical params (content-addressable, replayable).
 *
 * PURE: a fold over the findings, no I/O.
 */
export function groupDiagnosticsByUri(
  findings: readonly FindingLike[],
): ReadonlyArray<{ uri: string; diagnostics: readonly LspDiagnostic[] }> {
  const byUri = new Map<string, LspDiagnostic[]>();
  for (const finding of findings) {
    const projected = projectFinding(finding);
    if (projected === null) continue;
    const bucket = byUri.get(projected.uri);
    if (bucket === undefined) {
      byUri.set(projected.uri, [projected.diagnostic]);
    } else {
      bucket.push(projected.diagnostic);
    }
  }
  return [...byUri.keys()].sort().map((uri) => ({ uri, diagnostics: byUri.get(uri)! }));
}

/**
 * Convert a repo-relative (or absolute) POSIX file path to a `file://` URI — the
 * form LSP `publishDiagnostics` keys on. A path that is already a `file://` URI
 * (or any scheme URI) passes through unchanged.
 *
 * The URI is built by node's `pathToFileURL`, which is the CANONICAL file→URI
 * constructor: it emits the correct `file://` authority AND percent-encodes path
 * segments per the URI grammar (a space → `%20`, a literal `%` → `%25`) — more
 * correct than a hand-rolled `file://` concatenation, which would emit invalid
 * URIs for any path carrying a reserved character. It is NOT a slash-normalizer
 * (the b5 cage's concern): the path inputs are already repo-relative POSIX (the
 * runner roots at the workspace and the audit layer normalizes paths upstream),
 * so there are no backslashes to convert here.
 *
 * The repo-relative path is made absolute with a leading `/` before handing it to
 * `pathToFileURL` (which requires an absolute path), yielding the deterministic
 * `file:///packages/...` form the LSP client keys on. No filesystem read.
 *
 * PURE: a deterministic transform, no filesystem read (the server keys
 * diagnostics by the workspace-rooted path the CLI host already rooted at).
 */
export function fileToUri(file: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(file)) return file;
  const absolute = file.startsWith('/') ? file : `/${file}`;
  return pathToFileURL(absolute).href;
}
