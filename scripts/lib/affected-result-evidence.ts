/** Honest execution-state evidence for affected PR test lanes. @module */

export type AffectedStepOutcome = 'success' | 'failure' | 'cancelled' | 'skipped';

export interface AffectedResultStepInput {
  readonly id: string;
  readonly outcome: AffectedStepOutcome;
  readonly evidencePath?: string;
}

export interface AffectedResultEvidence {
  readonly schema: 'liteship/affected-result-evidence@1';
  readonly lane: string;
  readonly headSha: string;
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
    readonly steps: readonly AffectedResultStepInput[];
  },
  evidenceExists: (path: string) => boolean,
): AffectedResultEvidence {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(input.lane)) throw new TypeError('affected result lane is invalid');
  if (!/^[0-9a-f]{40}$/u.test(input.headSha)) throw new TypeError('affected result head SHA is invalid');
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
    schema: 'liteship/affected-result-evidence@1',
    lane: input.lane,
    headSha: input.headSha,
    steps: Object.freeze(steps),
    integrity,
  });
}
