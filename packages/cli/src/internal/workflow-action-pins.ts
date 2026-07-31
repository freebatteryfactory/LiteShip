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
  // The verdict-bank persistence for the exhaustive campaigns (run
  // 30579292227: the census exceeds one job; `.liteship/cache` must survive
  // between nightlies). GitHub-first-party, SHA-pinned like every entry here.
  // The SPLIT sub-actions, deliberately not the combined `actions/cache`: its
  // save hook is `post-if: success()` and a budget-exhausted campaign exits 1,
  // so only an explicit always() save step banks a red run (PR #194 review).
  'actions/cache/restore',
  'actions/cache/save',
  'actions/checkout',
  'actions/download-artifact',
  'actions/setup-node',
  'actions/upload-artifact',
  'dtolnay/rust-toolchain',
  'github/codeql-action/init',
  'github/codeql-action/analyze',
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

/**
 * The exhaustive-campaign cache-persistence contract (PR #194 review,
 * confirmed P1): the combined `actions/cache` declares its save hook
 * `post-if: success()`, and a budget-exhausted campaign exits 1 by design
 * (inconclusive findings red the gates) — the combined action would NEVER
 * save and every nightly would restart from the same old bank. Each named
 * job must RESTORE via `actions/cache/restore`, SAVE via an explicit
 * `actions/cache/save` step under `if: always()`, and carry NO combined
 * `actions/cache` use. Returns one violation string per broken job.
 */
export function scanExhaustiveCachePersistence(text: string, jobs: readonly string[]): readonly string[] {
  const violations: string[] = [];
  for (const job of jobs) {
    const start = text.indexOf(`\n  ${job}:`);
    if (start === -1) {
      violations.push(`${job}: job not found`);
      continue;
    }
    // The job section ends at the next top-level job key (two-space indent).
    const next = text.slice(start + 1).search(/\n {2}[a-z][a-z-]*:\n/u);
    const section = next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
    if (!/uses: actions\/cache\/restore@[0-9a-f]{40}/u.test(section)) {
      violations.push(`${job}: no actions/cache/restore step — the verdict bank is never restored`);
    }
    if (!/uses: actions\/cache\/save@[0-9a-f]{40}[^\n]*\n\s+if: always\(\)/u.test(section)) {
      violations.push(`${job}: no always() actions/cache/save step — a red campaign never banks its verdicts`);
    }
    if (/uses: actions\/cache@[0-9a-f]/u.test(section)) {
      violations.push(`${job}: combined actions/cache present — its post-if: success() save skips red runs`);
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
