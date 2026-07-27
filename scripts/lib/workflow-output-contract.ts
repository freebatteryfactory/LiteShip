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
  readonly enumerator: 'github-output-writes';
  readonly censusDigest: `sha256:${string}`;
  /** Complete candidate population: every non-comment `$GITHUB_OUTPUT` use. */
  readonly writes: readonly WorkflowOutputWriteSubject[];
  readonly subjects: readonly OutputHeredocSubject[];
  readonly findings: readonly OutputHeredocFinding[];
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

/** Build the complete receipt over `.github/workflows/`. */
export function buildWorkflowOutputReceipt(repoRoot: string): WorkflowOutputReceipt {
  const workflowDir = resolve(repoRoot, '.github', 'workflows');
  const writes: WorkflowOutputWriteSubject[] = [];
  const subjects: OutputHeredocSubject[] = [];
  const findings: OutputHeredocFinding[] = [];
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
    }
  }
  const digest = createHash('sha256').update(JSON.stringify({ writes, subjects })).digest('hex');
  return Object.freeze({
    enumerator: 'github-output-writes',
    censusDigest: `sha256:${digest}`,
    writes: Object.freeze(writes),
    subjects: Object.freeze(subjects),
    findings: Object.freeze(findings),
  });
}
