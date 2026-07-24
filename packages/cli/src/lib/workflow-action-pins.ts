/** Fast-lane scanner for immutable third-party GitHub Action references. */

export interface WorkflowActionPinViolation {
  readonly line: number;
  readonly content: string;
}

const IMMUTABLE_REF = /^[0-9a-f]{40}$/i;

/** Local reusable workflows are source-bound by the checkout; external actions require a SHA. */
export function scanWorkflowActionPins(text: string): readonly WorkflowActionPinViolation[] {
  const violations: WorkflowActionPinViolation[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const match = /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/.exec(raw);
    if (!match) continue;
    const reference = match[1]!;
    if (reference.startsWith('./')) continue;
    const at = reference.lastIndexOf('@');
    const revision = at >= 0 ? reference.slice(at + 1) : '';
    if (!IMMUTABLE_REF.test(revision)) {
      violations.push({ line: index + 1, content: raw.trim() });
    }
  }
  return violations;
}
