/** Fast-lane scanner for immutable third-party GitHub Action references. */

export interface WorkflowActionPinViolation {
  readonly line: number;
  readonly content: string;
  readonly reason: 'missing-immutable-revision' | 'untrusted-source' | 'credentials-persisted';
}

const IMMUTABLE_REF = /^[0-9a-f]{40}$/i;

/** Reviewed action repositories admitted by LiteShip's workflow trust policy. */
export const TRUSTED_ACTION_SOURCES: ReadonlySet<string> = new Set([
  'actions/attest-build-provenance',
  'actions/checkout',
  'actions/download-artifact',
  'actions/setup-node',
  'actions/upload-artifact',
  'dtolnay/rust-toolchain',
  'pnpm/action-setup',
]);

/** Local reusable workflows are source-bound by the checkout; external actions require a SHA. */
export function scanWorkflowActionPins(text: string): readonly WorkflowActionPinViolation[] {
  const violations: WorkflowActionPinViolation[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const match = /^\s*(?:-\s*)?uses:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))(?:\s+#.*)?$/u.exec(raw);
    if (!match) continue;
    const reference = match[1] ?? match[2] ?? match[3]!;
    if (reference.startsWith('./')) continue;
    const at = reference.lastIndexOf('@');
    const source = at >= 0 ? reference.slice(0, at) : reference;
    const revision = at >= 0 ? reference.slice(at + 1) : '';
    if (!IMMUTABLE_REF.test(revision)) {
      violations.push({ line: index + 1, content: raw.trim(), reason: 'missing-immutable-revision' });
    } else if (!TRUSTED_ACTION_SOURCES.has(source)) {
      violations.push({ line: index + 1, content: raw.trim(), reason: 'untrusted-source' });
    }
  }
  return violations;
}

/** A checkout step is safe only when it explicitly declines credential persistence. */
export function scanWorkflowCheckoutCredentials(text: string): readonly WorkflowActionPinViolation[] {
  const lines = text.split(/\r?\n/u);
  const violations: WorkflowActionPinViolation[] = [];
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]!;
    const match = /^(\s*)(?:-\s*)?uses:\s*(?:["'])?actions\/checkout@[0-9a-f]{40}(?:["'])?(?:\s+#.*)?$/iu.exec(raw);
    if (match === null) continue;
    const indent = match[1]!.length;
    let safe = false;
    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      const candidate = lines[cursor]!;
      if (candidate.trim().length === 0) continue;
      const candidateIndent = /^\s*/u.exec(candidate)![0].length;
      if (candidateIndent <= indent) break;
      if (/^\s*persist-credentials:\s*false\s*(?:#.*)?$/u.test(candidate)) safe = true;
    }
    if (!safe) {
      violations.push({ line: index + 1, content: raw.trim(), reason: 'credentials-persisted' });
    }
  }
  return violations;
}
