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
    const section = campaignJobSection(text, job);
    if (section === null) {
      violations.push(`${job}: job not found`);
      continue;
    }
    if (!/uses: actions\/cache\/restore@[0-9a-f]{40}/u.test(section)) {
      violations.push(`${job}: no actions/cache/restore step — the verdict bank is never restored`);
    }
    if (!/uses: actions\/cache\/save@[0-9a-f]{40}[^\n]*\n\s+if: always\(\)/u.test(section)) {
      violations.push(`${job}: no always() actions/cache/save step — a red campaign never banks its verdicts`);
    }
    if (/uses: actions\/cache@[0-9a-f]/u.test(section)) {
      violations.push(`${job}: combined actions/cache present — its post-if: success() save skips red runs`);
    }
    const lines = activeLinesOf(section);
    for (let i = 0; i < lines.length; i++) {
      const isSave = /^- uses: actions\/cache\/save@[0-9a-f]{40}/u.test(lines[i]!.body);
      const isRestore = /^- uses: actions\/cache\/restore@[0-9a-f]{40}/u.test(lines[i]!.body);
      if (!isSave && !isRestore) continue;
      const withIndex = childIndicesOf(lines, i).find((c) => lines[c]!.body === 'with:');
      const withChildren = withIndex === undefined ? [] : childIndicesOf(lines, withIndex);
      if (isSave) {
        // GitHub cache keys are immutable per scope: a re-run attempt saving
        // under a run_id-only key finds it reserved by attempt 1 and banks
        // NOTHING (PR #195 review, confirmed). Only a DIRECT child key: of
        // with: names the immutable save key — an env.key decoy or a key:
        // line inside a block scalar must not satisfy the contract, and a
        // step without a with.key stays a violation (PR #196 review rounds
        // 2–3, confirmed P2s: every looser text match failed OPEN).
        const key = withChildren.map((c) => lines[c]!.body).find((body) => body.startsWith('key: '));
        if (key === undefined) {
          violations.push(`${job}: cache save step has no with.key — the attempt-qualification contract is unprovable`);
        } else if (!key.includes('${{ github.run_attempt }}')) {
          violations.push(
            `${job}: cache save key lacks github.run_attempt — a re-run attempt cannot bank its verdicts`,
          );
        }
      } else {
        // Restore fallbacks are ordered: the FIRST restore-keys prefix must be
        // run-scoped, so a re-run resumes this run's own freshly banked work
        // instead of an older historical bank shadowing it (PR #196 review
        // round 3, confirmed P2).
        const rkIndex = withChildren.find((c) => lines[c]!.body.startsWith('restore-keys:'));
        if (rkIndex !== undefined) {
          const first = blockLinesOf(lines, rkIndex)[0]?.body.replace(/^- /u, '');
          if (first !== undefined && !first.includes('${{ github.run_id }}')) {
            violations.push(
              `${job}: restore-keys leads with a historical prefix — a re-run must prefer this run's own bank first`,
            );
          }
        }
      }
    }
  }
  return violations;
}

/** A comment-free, blank-free view of a YAML fragment: indentation plus trimmed body per line. */
interface ActiveLine {
  readonly indent: number;
  readonly body: string;
}

function activeLinesOf(text: string): readonly ActiveLine[] {
  const lines: ActiveLine[] = [];
  for (const raw of text.split('\n')) {
    const body = raw.trim();
    if (body.length === 0 || body.startsWith('#')) continue;
    lines.push({ indent: /^ */u.exec(raw)![0].length, body });
  }
  return lines;
}

/** Every line nested under lines[index] — deeper indentation until the first sibling or dedent. */
function blockLinesOf(lines: readonly ActiveLine[], index: number): readonly ActiveLine[] {
  const parent = lines[index]!.indent;
  const block: ActiveLine[] = [];
  for (let i = index + 1; i < lines.length && lines[i]!.indent > parent; i++) block.push(lines[i]!);
  return block;
}

/**
 * Indices of the DIRECT children of lines[index]: the shallowest indentation
 * level inside its block. Deeper lines are nested mappings or block-scalar
 * content and never satisfy a direct-child contract.
 */
function childIndicesOf(lines: readonly ActiveLine[], index: number): readonly number[] {
  const parent = lines[index]!.indent;
  let end = index + 1;
  while (end < lines.length && lines[end]!.indent > parent) end++;
  let childIndent = Number.POSITIVE_INFINITY;
  for (let i = index + 1; i < end; i++) childIndent = Math.min(childIndent, lines[i]!.indent);
  const children: number[] = [];
  for (let i = index + 1; i < end; i++) if (lines[i]!.indent === childIndent) children.push(i);
  return children;
}

/** The job section of a workflow, from its key to the next top-level job key (two-space indent). */
function campaignJobSection(text: string, job: string): string | null {
  const start = text.indexOf(`\n  ${job}:`);
  if (start === -1) return null;
  const next = text.slice(start + 1).search(/\n {2}[a-z][a-z-]*:\n/u);
  return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
}

/** An 85-minute cold seam-coverage probe phase, measured in run 30606178745 (first heartbeat 07:04 vs step start 05:39). */
export const CAMPAIGN_COLD_PROBE_MS = 5_100_000;
/** ~9.5 minutes per census target, measured across 37 targets in run 30606178745. */
export const CAMPAIGN_TARGET_EVAL_MS = 570_000;
/** Setup before the gates run plus save/upload after it — both outside the wall-budget clock but inside timeout-minutes. */
export const CAMPAIGN_POST_STEP_MARGIN_MS = 900_000;

/**
 * The campaign wall-budget sizing contract (PR #195 review, confirmed): the
 * budget clock anchors at the top of the facts builders — BEFORE the probe
 * phase — so a budget smaller than a cold probe plus two targets folds the
 * whole census inconclusive at index 0 and mints nothing. And a budget too
 * close to timeout-minutes hands the kill to GitHub's backstop, which skips
 * the always() save/upload post-steps the banking design depends on.
 */
export function scanCampaignWallBudget(text: string, jobs: readonly string[]): readonly string[] {
  const violations: string[] = [];
  for (const job of jobs) {
    const section = campaignJobSection(text, job);
    if (section === null) {
      violations.push(`${job}: job not found`);
      continue;
    }
    // Both knobs are read at their OWNING YAML levels — a commented-out knob,
    // a step-level timeout-minutes, or an env on an unrelated step is a
    // MISSING knob, because GitHub applies none of them to the campaign
    // (PR #196 review rounds 2–3, confirmed P2s: every flat text search
    // accepted a knob the runner never honors).
    const lines = activeLinesOf(section);
    const jobChildren = childIndicesOf(lines, 0).map((c) => lines[c]!);
    const timeout = jobChildren
      .map((line) => /^timeout-minutes: (\d+)$/u.exec(line.body))
      .find((match) => match !== null);
    const budget = campaignStepBudgetOf(lines);
    if (timeout === undefined || timeout === null || budget === null) {
      violations.push(
        `${job}: job-level timeout-minutes or the campaign step's LITESHIP_CAMPAIGN_WALL_BUDGET_MS missing — the budget contract is unenforceable`,
      );
      continue;
    }
    const budgetMs = Number(budget);
    if (budgetMs < CAMPAIGN_COLD_PROBE_MS + 2 * CAMPAIGN_TARGET_EVAL_MS) {
      violations.push(
        `${job}: wall budget ${budgetMs}ms cannot absorb a cold probe plus two targets — a cold run folds everything inconclusive and banks nothing`,
      );
    }
    if (budgetMs + CAMPAIGN_POST_STEP_MARGIN_MS > Number(timeout[1]) * 60_000) {
      violations.push(
        `${job}: wall budget ${budgetMs}ms leaves no post-step margin under timeout-minutes ${timeout[1]} — the backstop kill skips the always() save`,
      );
    }
  }
  return violations;
}

/**
 * The wall-budget env value declared on the CAMPAIGN step — the step whose
 * body invokes `check gates` — or null when no such step declares it. An env
 * on any other step never reaches the campaign process, so it must not
 * satisfy the contract (PR #196 review round 3, confirmed P2).
 */
function campaignStepBudgetOf(lines: readonly ActiveLine[]): string | null {
  const stepsIndex = childIndicesOf(lines, 0).find((c) => lines[c]!.body === 'steps:');
  if (stepsIndex === undefined) return null;
  for (const stepIndex of childIndicesOf(lines, stepsIndex)) {
    const stepBlock = [lines[stepIndex]!, ...blockLinesOf(lines, stepIndex)];
    if (!stepBlock.some((line) => line.body.includes('check gates'))) continue;
    const envIndex = childIndicesOf(lines, stepIndex).find((c) => lines[c]!.body === 'env:');
    if (envIndex === undefined) continue;
    for (const envChild of childIndicesOf(lines, envIndex)) {
      const value = /^LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '(\d+)'$/u.exec(lines[envChild]!.body);
      if (value !== null) return value[1]!;
    }
  }
  return null;
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
