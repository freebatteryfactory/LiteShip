/**
 * Compute-then-emit law for `$GITHUB_OUTPUT` heredoc writes.
 *
 * A workflow step that opens a `name<<DELIMITER` heredoc into
 * `$GITHUB_OUTPUT`, runs a fallible command, and only then emits the closing
 * delimiter corrupts the output file whenever that command fails: the runner
 * reports "Matching delimiter not found" and buries the root error (observed
 * on CI runs 30263467365 and 30156066346). The law: every line between the
 * delimiter open and close must be an emit (`echo`/`printf`) of
 * already-computed data — compute first, open the heredoc after.
 *
 * Pure text classifier so tests prove RED/GREEN on synthetic workflows while
 * the gate applies the same code to `.github/workflows/`.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

/** One `$GITHUB_OUTPUT` heredoc discovered in a workflow file. */
export interface OutputHeredocSubject {
  readonly file: string;
  /** 1-based line of the `name<<DELIMITER` opener. */
  readonly openLine: number;
  readonly delimiter: string;
}

/** One workflow line that hands data to GitHub's step-output file. */
export interface WorkflowOutputWriteSubject {
  readonly file: string;
  readonly line: number;
  readonly mode: 'direct' | 'delegated';
}

/** One delivery-evidence artifact ingress consumed by the admission job. */
export interface DeliveryEvidenceDownloadSubject {
  readonly file: string;
  readonly line: number;
  readonly artifact: 'delivery-evidence-candidates';
  readonly path: string | null;
}

export type DeliveryEvidenceDownloadFindingKind =
  'missing-delivery-evidence-download' | 'duplicate-delivery-evidence-download' | 'delivery-evidence-outside-reports';

/** A workflow-topology defect that would hide evidence from admission. */
export interface DeliveryEvidenceDownloadFinding {
  readonly kind: DeliveryEvidenceDownloadFindingKind;
  readonly file: string;
  readonly line: number;
  readonly detail: string;
}

export type OutputHeredocFindingKind = 'fallible-interior-command' | 'unterminated-heredoc';

/** One violation of the compute-then-emit law. */
export interface OutputHeredocFinding extends OutputHeredocSubject {
  readonly kind: OutputHeredocFindingKind;
  /** 1-based line of the offending interior command (opener for unterminated). */
  readonly line: number;
  readonly text: string;
}

/** Complete current-head subject coverage for the output-delimiter authority. */
export interface WorkflowOutputReceipt {
  readonly enumerator: 'github-output-and-delivery-ingress';
  readonly censusDigest: `sha256:${string}`;
  /** Complete candidate population: every non-comment `$GITHUB_OUTPUT` use. */
  readonly writes: readonly WorkflowOutputWriteSubject[];
  readonly subjects: readonly OutputHeredocSubject[];
  readonly findings: readonly OutputHeredocFinding[];
  readonly artifactDownloads: readonly DeliveryEvidenceDownloadSubject[];
  readonly artifactFindings: readonly DeliveryEvidenceDownloadFinding[];
}

const HEREDOC_OPEN = /echo\s+["']?[A-Za-z0-9_-]+<<([A-Za-z0-9_]+)["']?/u;
/** An interior line that only emits already-computed data. */
const EMIT_ONLY = /^\s*(?:echo|printf)\b/u;

/** Detect executable shell forms while ignoring inert text inside single quotes. */
function hasFallibleShellForm(line: string): boolean {
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (char === "'" && quote !== '"') {
      quote = quote === "'" ? null : "'";
      continue;
    }
    if (char === '"' && quote !== "'") {
      quote = quote === '"' ? null : '"';
      continue;
    }
    if (quote === "'") continue;
    const tail = line.slice(index);
    if (tail.startsWith('$(') || char === '`') return true;
    if (
      quote === null &&
      (tail.startsWith('&&') || tail.startsWith('||') || tail.startsWith('<(') || tail.startsWith('>('))
    ) {
      return true;
    }
    if (quote === null && (char === ';' || char === '|')) return true;
  }
  return quote !== null || escaped;
}

function heredocClose(delimiter: string): RegExp {
  return new RegExp(`^\\s*echo\\s+["']?${delimiter}["']?\\s*$`, 'u');
}

/** Scan one workflow file's text for `$GITHUB_OUTPUT` heredoc subjects and findings. */
export function scanWorkflowOutputHeredocs(
  file: string,
  text: string,
): { readonly subjects: readonly OutputHeredocSubject[]; readonly findings: readonly OutputHeredocFinding[] } {
  const lines = text.split(/\r?\n/u);
  const subjects: OutputHeredocSubject[] = [];
  const findings: OutputHeredocFinding[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]!.trim().startsWith('#')) continue;
    const open = HEREDOC_OPEN.exec(lines[index]!);
    if (open === null) continue;
    const delimiter = open[1]!;
    const subject: OutputHeredocSubject = Object.freeze({ file, openLine: index + 1, delimiter });
    subjects.push(subject);

    const close = heredocClose(delimiter);
    let closed = false;
    for (let interior = index + 1; interior < lines.length; interior += 1) {
      const line = lines[interior]!;
      if (close.test(line)) {
        closed = true;
        index = interior;
        break;
      }
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#') || trimmed === '}' || /^\}\s*>>/u.test(trimmed)) continue;
      if (!EMIT_ONLY.test(line) || hasFallibleShellForm(line)) {
        findings.push(
          Object.freeze({ ...subject, kind: 'fallible-interior-command', line: interior + 1, text: trimmed }),
        );
      }
    }
    if (!closed) {
      findings.push(
        Object.freeze({
          ...subject,
          kind: 'unterminated-heredoc',
          line: subject.openLine,
          text: lines[subject.openLine - 1]!.trim(),
        }),
      );
    }
  }
  return Object.freeze({ subjects: Object.freeze(subjects), findings: Object.freeze(findings) });
}

function scalarValue(line: string, key: string): string | null {
  const matched = new RegExp(`^\\s*${key}:\\s*(.*?)\\s*$`, 'u').exec(line)?.[1];
  if (matched === undefined || matched.length === 0 || matched === '|' || matched === '>') return null;
  return matched.replace(/^(?:"(.*)"|'(.*)')$/u, '$1$2');
}

/** Enumerate candidate-artifact download steps without depending on YAML key order. */
export function scanDeliveryEvidenceDownloads(file: string, text: string): readonly DeliveryEvidenceDownloadSubject[] {
  const lines = text.split(/\r?\n/u);
  const subjects: DeliveryEvidenceDownloadSubject[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const indent = /^\s*/u.exec(lines[index]!)?.[0].length ?? 0;
    if (!/^\s*-\s+uses:\s+actions\/download-artifact@/u.test(lines[index]!)) continue;
    let artifact: string | null = null;
    let path: string | null = null;
    for (let field = index + 1; field < lines.length; field += 1) {
      const fieldIndent = /^\s*/u.exec(lines[field]!)?.[0].length ?? 0;
      if (fieldIndent <= indent && /^\s*-\s+/u.test(lines[field]!)) break;
      artifact ??= scalarValue(lines[field]!, 'name');
      path ??= scalarValue(lines[field]!, 'path');
    }
    if (artifact === 'delivery-evidence-candidates') {
      subjects.push(Object.freeze({ file, line: index + 1, artifact, path }));
    }
  }
  return Object.freeze(subjects);
}

/** Exactly one candidate download must restore upload-artifact's stripped root. */
export function deliveryEvidenceDownloadFindings(
  subjects: readonly DeliveryEvidenceDownloadSubject[],
): readonly DeliveryEvidenceDownloadFinding[] {
  if (subjects.length === 0) {
    return Object.freeze([
      Object.freeze({
        kind: 'missing-delivery-evidence-download' as const,
        file: '.github/workflows/ci.yml',
        line: 0,
        detail: 'delivery-evidence-candidates has no download step',
      }),
    ]);
  }
  const findings: DeliveryEvidenceDownloadFinding[] = [];
  if (subjects.length > 1) {
    findings.push(
      Object.freeze({
        kind: 'duplicate-delivery-evidence-download',
        file: subjects[1]!.file,
        line: subjects[1]!.line,
        detail: `expected one candidate download, found ${subjects.length}`,
      }),
    );
  }
  for (const subject of subjects) {
    if (subject.path !== 'reports') {
      findings.push(
        Object.freeze({
          kind: 'delivery-evidence-outside-reports',
          file: subject.file,
          line: subject.line,
          detail: `candidate download path is ${subject.path ?? '(missing)'}, expected reports`,
        }),
      );
    }
  }
  return Object.freeze(findings);
}

/** Build the complete receipt over `.github/workflows/`. */
export function buildWorkflowOutputReceipt(repoRoot: string): WorkflowOutputReceipt {
  const workflowDir = resolve(repoRoot, '.github', 'workflows');
  const writes: WorkflowOutputWriteSubject[] = [];
  const subjects: OutputHeredocSubject[] = [];
  const findings: OutputHeredocFinding[] = [];
  const artifactDownloads: DeliveryEvidenceDownloadSubject[] = [];
  if (existsSync(workflowDir)) {
    for (const file of readdirSync(workflowDir).sort()) {
      if (!/\.ya?ml$/u.test(file)) continue;
      const workflowPath = `.github/workflows/${file}`;
      const text = readFileSync(resolve(workflowDir, file), 'utf8');
      for (const [index, line] of text.split(/\r?\n/u).entries()) {
        if (!line.includes('$GITHUB_OUTPUT') || line.trim().startsWith('#')) continue;
        writes.push(
          Object.freeze({
            file: workflowPath,
            line: index + 1,
            mode: /(?:>>|>)\s*["']?\$GITHUB_OUTPUT/u.test(line) ? 'direct' : 'delegated',
          }),
        );
      }
      const scanned = scanWorkflowOutputHeredocs(workflowPath, text);
      subjects.push(...scanned.subjects);
      findings.push(...scanned.findings);
      artifactDownloads.push(...scanDeliveryEvidenceDownloads(workflowPath, text));
    }
  }
  const artifactFindings = deliveryEvidenceDownloadFindings(artifactDownloads);
  const digest = createHash('sha256').update(JSON.stringify({ writes, subjects, artifactDownloads })).digest('hex');
  return Object.freeze({
    enumerator: 'github-output-and-delivery-ingress',
    censusDigest: `sha256:${digest}`,
    writes: Object.freeze(writes),
    subjects: Object.freeze(subjects),
    findings: Object.freeze(findings),
    artifactDownloads: Object.freeze(artifactDownloads),
    artifactFindings,
  });
}
