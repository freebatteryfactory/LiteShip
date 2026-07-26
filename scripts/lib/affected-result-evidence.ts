/** Honest execution-state evidence for affected PR test lanes. @module */

export type AffectedStepOutcome = 'success' | 'failure' | 'cancelled' | 'skipped';

export interface AffectedResultStepInput {
  readonly id: string;
  readonly outcome: AffectedStepOutcome;
  readonly evidencePath?: string;
}

export interface AffectedResultEvidence {
  readonly schema: 'liteship/affected-result-evidence@2';
  readonly lane: string;
  readonly headSha: string;
  readonly planId: `sha256:${string}`;
  readonly steps: readonly {
    readonly id: string;
    readonly outcome: AffectedStepOutcome;
    readonly evidence?: {
      readonly path: string;
      readonly present: boolean;
    };
  }[];
  /** False only when an authority ran but failed to leave its promised evidence. */
  readonly integrity: boolean;
}

const OUTCOMES: ReadonlySet<string> = new Set(['success', 'failure', 'cancelled', 'skipped']);

/**
 * Build a receipt that distinguishes an honestly skipped authority from a test
 * process that ran without producing its promised result file.
 */
export function buildAffectedResultEvidence(
  input: {
    readonly lane: string;
    readonly headSha: string;
    readonly planId: `sha256:${string}`;
    readonly steps: readonly AffectedResultStepInput[];
  },
  evidenceExists: (path: string) => boolean,
): AffectedResultEvidence {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(input.lane)) throw new TypeError('affected result lane is invalid');
  if (!/^[0-9a-f]{40}$/u.test(input.headSha)) throw new TypeError('affected result head SHA is invalid');
  if (!/^sha256:[0-9a-f]{64}$/u.test(input.planId)) throw new TypeError('affected result plan id is invalid');
  if (input.steps.length === 0) throw new TypeError('affected result requires at least one step');

  const seen = new Set<string>();
  const steps = input.steps.map((step) => {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(step.id) || seen.has(step.id)) {
      throw new TypeError(`affected result step id is invalid or duplicated: ${step.id}`);
    }
    seen.add(step.id);
    if (!OUTCOMES.has(step.outcome)) throw new TypeError(`affected result outcome is invalid: ${step.outcome}`);
    if (step.evidencePath === undefined) return Object.freeze({ id: step.id, outcome: step.outcome });
    if (step.evidencePath.trim() !== step.evidencePath || step.evidencePath.length === 0) {
      throw new TypeError(`affected result evidence path is invalid for ${step.id}`);
    }
    return Object.freeze({
      id: step.id,
      outcome: step.outcome,
      evidence: Object.freeze({ path: step.evidencePath, present: evidenceExists(step.evidencePath) }),
    });
  });

  const integrity = steps.every(
    (step) => step.evidence === undefined || step.outcome === 'skipped' || step.evidence.present,
  );
  return Object.freeze({
    schema: 'liteship/affected-result-evidence@2',
    lane: input.lane,
    headSha: input.headSha,
    planId: input.planId,
    steps: Object.freeze(steps),
    integrity,
  });
}

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) throw new TypeError(`${label} contains a symbol key`);
  const left = (actual as string[]).sort();
  const right = [...expected].sort();
  if (left.length !== right.length || left.some((key, index) => key !== right[index])) {
    throw new TypeError(`${label} keys must be exactly ${right.join(', ')}`);
  }
}

/** Strictly parse one serialized lane receipt; foreign or stale structure is refused. */
export function parseAffectedResultEvidence(value: unknown): AffectedResultEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('affected result evidence must be an object');
  }
  exactKeys(value, ['schema', 'lane', 'headSha', 'planId', 'steps', 'integrity'], 'affected result evidence');
  const candidate = value as Partial<AffectedResultEvidence>;
  if (
    candidate.schema !== 'liteship/affected-result-evidence@2' ||
    typeof candidate.lane !== 'string' ||
    typeof candidate.headSha !== 'string' ||
    typeof candidate.planId !== 'string' ||
    !Array.isArray(candidate.steps) ||
    typeof candidate.integrity !== 'boolean'
  ) {
    throw new TypeError('affected result evidence envelope is invalid');
  }
  const inputs: AffectedResultStepInput[] = candidate.steps.map((step) => {
    if (step === null || typeof step !== 'object' || Array.isArray(step)) {
      throw new TypeError('affected result step must be an object');
    }
    const record = step as Record<string, unknown>;
    exactKeys(
      record,
      record['evidence'] === undefined ? ['id', 'outcome'] : ['id', 'outcome', 'evidence'],
      'affected result step',
    );
    if (typeof record['id'] !== 'string' || typeof record['outcome'] !== 'string') {
      throw new TypeError('affected result step identity is invalid');
    }
    if (record['evidence'] === undefined)
      return { id: record['id'], outcome: record['outcome'] as AffectedStepOutcome };
    if (record['evidence'] === null || typeof record['evidence'] !== 'object' || Array.isArray(record['evidence'])) {
      throw new TypeError('affected result step evidence is invalid');
    }
    exactKeys(record['evidence'], ['path', 'present'], 'affected result step evidence');
    const evidence = record['evidence'] as Record<string, unknown>;
    if (typeof evidence['path'] !== 'string' || typeof evidence['present'] !== 'boolean') {
      throw new TypeError('affected result step evidence fields are invalid');
    }
    return { id: record['id'], outcome: record['outcome'] as AffectedStepOutcome, evidencePath: evidence['path'] };
  });
  const rebuilt = buildAffectedResultEvidence(
    {
      lane: candidate.lane,
      headSha: candidate.headSha,
      planId: candidate.planId as `sha256:${string}`,
      steps: inputs,
    },
    (path) =>
      candidate.steps!.some(
        (step) => step.evidence !== undefined && step.evidence.path === path && step.evidence.present,
      ),
  );
  if (rebuilt.integrity !== candidate.integrity)
    throw new TypeError('affected result integrity does not match evidence');
  return rebuilt;
}

export interface AffectedResultAdmission {
  readonly schema: 'liteship/affected-result-admission@1';
  readonly headSha: string;
  readonly planId: `sha256:${string}`;
  readonly lanes: readonly string[];
  readonly verdict: 'accepted';
}

/** Admit exactly the execution receipts selected by one addressed affected plan. */
export function admitAffectedResultEvidence(input: {
  readonly headSha: string;
  readonly planId: `sha256:${string}`;
  readonly browserRequired: boolean;
  readonly benchmarkRequired: boolean;
  readonly receipts: readonly AffectedResultEvidence[];
}): AffectedResultAdmission {
  const expected = new Map<string, readonly string[]>([
    ['pr-linux', ['quick', 'vitest', 'benchmark']],
    ['pr-windows', ['vitest']],
    ...(input.browserRequired ? ([['pr-browser', ['vitest', 'e2e']]] as const) : []),
  ]);
  if (input.receipts.length !== expected.size) throw new TypeError('affected result receipt lane set is incomplete');
  const seen = new Set<string>();
  for (const receipt of input.receipts) {
    if (seen.has(receipt.lane)) throw new TypeError(`affected result lane is duplicated: ${receipt.lane}`);
    seen.add(receipt.lane);
    const expectedSteps = expected.get(receipt.lane);
    if (expectedSteps === undefined) throw new TypeError(`affected result lane was not selected: ${receipt.lane}`);
    if (receipt.headSha !== input.headSha)
      throw new TypeError(`affected result lane ${receipt.lane} is stale for head`);
    if (receipt.planId !== input.planId) throw new TypeError(`affected result lane ${receipt.lane} is stale for plan`);
    if (!receipt.integrity) throw new TypeError(`affected result lane ${receipt.lane} failed evidence integrity`);
    if (receipt.steps.map((step) => step.id).join('\0') !== expectedSteps.join('\0')) {
      throw new TypeError(`affected result lane ${receipt.lane} does not match selected steps`);
    }
    for (const step of receipt.steps) {
      const required = receipt.lane !== 'pr-linux' || step.id !== 'benchmark' || input.benchmarkRequired;
      const expectedOutcome = required ? 'success' : 'skipped';
      if (step.outcome !== expectedOutcome) {
        throw new TypeError(
          `affected result lane ${receipt.lane} step ${step.id} is ${step.outcome}, expected ${expectedOutcome}`,
        );
      }
      if (required && step.evidence !== undefined && !step.evidence.present) {
        throw new TypeError(`affected result lane ${receipt.lane} step ${step.id} is missing evidence`);
      }
    }
  }
  for (const lane of expected.keys())
    if (!seen.has(lane)) throw new TypeError(`affected result lane is missing: ${lane}`);
  return Object.freeze({
    schema: 'liteship/affected-result-admission@1',
    headSha: input.headSha,
    planId: input.planId,
    lanes: Object.freeze([...seen].sort()),
    verdict: 'accepted',
  });
}
