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
 *  - `source` = the fixed `'liteship-gauntlet'` provenance.
 *
 * A finding with NO `location` cannot be a textDocument diagnostic (a Diagnostic
 * is always anchored to a document range). {@link projectFinding} returns `null`
 * for such findings; the server filters them — they are surfaced via the MCP /
 * CLI skins, which carry findings without a source anchor.
 *
 * @module
 */

import {
  DiagnosticSeverity,
  type FindingLike,
  type FindingSeverity,
  type LspDiagnostic,
  type LspDiagnosticSeverity,
  type LspRange,
} from './types.js';

/** The fixed provenance every gauntlet diagnostic carries (§Diagnostic.source). */
export const DIAGNOSTIC_SOURCE = 'liteship-gauntlet' as const;

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
export function projectFinding(
  finding: FindingLike,
  workspaceRootUri?: string,
): { uri: string; diagnostic: LspDiagnostic } | null {
  const location = finding.location;
  if (location === undefined) return null;
  return {
    uri: fileToUri(location.file, workspaceRootUri),
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
  workspaceRootUri?: string,
): ReadonlyArray<{ uri: string; diagnostics: readonly LspDiagnostic[] }> {
  const byUri = new Map<string, LspDiagnostic[]>();
  for (const finding of findings) {
    const projected = projectFinding(finding, workspaceRootUri);
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
 * The path-segment characters node's `pathToFileURL` leaves LITERAL but
 * `encodeURIComponent` over-encodes: the RFC 3986 `sub-delims` plus `:` and `@`
 * that are valid inside a URI path segment (`pchar`). Decoding them back from the
 * `encodeURIComponent` output reproduces `pathToFileURL`'s exact path encoding
 * (`~` is handled separately — see {@link encodePathSegment}). This is the ONE
 * gap between the two encoders, fixed by an explicit, total character map (no
 * heuristics) so the codec is byte-identical to the canonical constructor.
 */
const PCHAR_KEPT_LITERAL: Readonly<Record<string, string>> = {
  '%24': '$',
  '%26': '&',
  '%2B': '+',
  '%2C': ',',
  '%3A': ':',
  '%3B': ';',
  '%3D': '=',
  '%40': '@',
};

/**
 * Percent-encode ONE path segment to the exact form node's `pathToFileURL`
 * emits — but PLATFORM-INDEPENDENTLY (no OS path resolution, so no Windows
 * drive-letter is ever injected). `encodeURIComponent` is the strict base
 * (it encodes a literal `%` → `%25`, a space → `%20`, multi-byte → UTF-8
 * percent-octets); two precise fix-ups reconcile it with the file-URL path
 * grammar: restore the `pchar` sub-delims it over-encodes
 * ({@link PCHAR_KEPT_LITERAL}) and encode `~` → `%7E` (which `pathToFileURL`
 * percent-encodes but `encodeURIComponent` keeps). The result is verified
 * byte-identical to POSIX `pathToFileURL` over the full ASCII + multi-byte
 * range. NOT a slash-normalizer — it never sees a `/` (the caller splits on it).
 */
function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment)
    .replace(/%24|%26|%2B|%2C|%3A|%3B|%3D|%40/g, (m) => PCHAR_KEPT_LITERAL[m]!)
    .replace(/~/g, '%7E');
}

/**
 * Normalize the initialized workspace authority before it is retained by the
 * LSP state machine. Query and fragment data are not filesystem identity.
 *
 * PURE: a deterministic URI transform with no filesystem read.
 */
export function normalizeWorkspaceRootUri(uri: string): string {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'file:') throw new TypeError(`LSP workspace root must be a file URI: ${uri}`);
  parsed.search = '';
  parsed.hash = '';
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  return parsed.href;
}

/**
 * Convert a finding path to its document URI. Repo-relative paths resolve below
 * the initialized workspace root; absolute paths and existing URIs retain their
 * own authority. The default root preserves the historical pure projection for
 * callers that intentionally operate without an LSP workspace.
 */
export function fileToUri(file: string, workspaceRootUri: string = 'file:///'): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(file)) return file;
  const normalized = file.replaceAll('\\', '/');
  const windowsAbsolute = /^[A-Za-z]:\//u.test(normalized);
  if (normalized.startsWith('/') || windowsAbsolute) {
    const absolute = windowsAbsolute ? `/${normalized}` : normalized;
    return `file://${absolute.split('/').map(encodePathSegment).join('/')}`;
  }
  const segments = normalized.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.includes('..')) throw new TypeError(`finding path escapes the initialized workspace: ${file}`);
  const relative = segments.map(encodePathSegment).join('/');
  return new URL(relative, normalizeWorkspaceRootUri(workspaceRootUri)).href;
}
