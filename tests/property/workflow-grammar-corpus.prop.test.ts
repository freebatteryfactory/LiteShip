/**
 * THE DIFFERENTIAL GRAMMAR CORPUS — every workflow scanner must FIND the
 * planted defect or DECLARE the document unreadable. Returning clean is never
 * an option.
 *
 * Five of the review findings closed on this branch were one shape: a scanner
 * enumerated a syntactic SUBSET (a two-space indent, an unquoted key spelling,
 * a fixed key list, a root allowlist) while its own shape validator admitted a
 * wider grammar. The two halves disagreed about the same document, so a valid
 * workflow produced an empty section map and every scanner returned `[]` — a
 * fail-open, reported one variant at a time, one review round at a time.
 *
 * This law inverts that. It generates the SAME defect across every legal
 * spelling of the surrounding document and asserts the invariant that actually
 * matters:
 *
 *     found(defect) OR declared-unreadable — never silently clean.
 *
 * A new syntactic variant only has to be added to {@link SPELLINGS} to be
 * enforced across every scanner at once, instead of being discovered as the
 * next P1.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  scanWorkflowActionPins,
  scanWorkflowExpressionInjection,
  scanWorkflowCheckoutCredentials,
  unreadableYamlViolations,
  type WorkflowActionPinViolation,
} from '../../packages/cli/src/internal/workflow-action-pins.js';

/** One planted defect: the step body, and the reason a scanner must report. */
interface PlantedDefect {
  readonly id: string;
  /** Step lines, relative — indentation is applied by the spelling. */
  readonly step: readonly string[];
  /** The scanner that owns this defect. */
  readonly scan: (text: string) => readonly WorkflowActionPinViolation[];
  /** The reason the owning scanner must emit when it finds it. */
  readonly reason: WorkflowActionPinViolation['reason'];
}

const DEFECTS: readonly PlantedDefect[] = Object.freeze([
  Object.freeze({
    id: 'event-title-in-run',
    step: Object.freeze(['- run: echo "${{ github.event.pull_request.title }}"']),
    scan: scanWorkflowExpressionInjection,
    reason: 'expression-in-run' as const,
  }),
  Object.freeze({
    id: 'floating-action-tag',
    step: Object.freeze(['- uses: owner/action@main']),
    scan: scanWorkflowActionPins,
    reason: 'missing-immutable-revision' as const,
  }),
  Object.freeze({
    id: 'untrusted-action-source',
    step: Object.freeze([`- uses: stranger/surprise@${'a'.repeat(40)}`]),
    scan: scanWorkflowActionPins,
    reason: 'untrusted-source' as const,
  }),
  Object.freeze({
    id: 'checkout-persists-credentials',
    step: Object.freeze([`- uses: actions/checkout@${'a'.repeat(40)}`, '  with:', '    fetch-depth: 0']),
    scan: scanWorkflowCheckoutCredentials,
    reason: 'credentials-persisted' as const,
  }),
]);

/** One legal way to spell the document around the defect. */
interface Spelling {
  readonly id: string;
  readonly render: (step: readonly string[]) => string;
}

const indented = (width: number) => (step: readonly string[]) => {
  const pad = (depth: number): string => ' '.repeat(width * depth);
  return ['jobs:', `${pad(1)}subject:`, `${pad(2)}steps:`, ...step.map((line) => `${pad(3)}${line}`)].join('\n');
};

const SPELLINGS: readonly Spelling[] = Object.freeze([
  Object.freeze({ id: 'two-space', render: indented(2) }),
  Object.freeze({ id: 'three-space', render: indented(3) }),
  Object.freeze({ id: 'four-space', render: indented(4) }),
  Object.freeze({ id: 'eight-space', render: indented(8) }),
  Object.freeze({
    id: 'trailing-comment-on-jobs',
    render: (step: readonly string[]) => indented(2)(step).replace('jobs:', 'jobs: # the CI jobs'),
  }),
  Object.freeze({
    id: 'comment-between-jobs-and-header',
    render: (step: readonly string[]) => indented(2)(step).replace('jobs:\n', 'jobs:\n  # a note\n'),
  }),
  Object.freeze({
    id: 'blank-lines-throughout',
    render: (step: readonly string[]) => indented(2)(step).replaceAll('\n', '\n\n'),
  }),
  Object.freeze({
    id: 'crlf-line-endings',
    render: (step: readonly string[]) => indented(2)(step).replaceAll('\n', '\r\n'),
  }),
  Object.freeze({
    id: 'quoted-step-key',
    render: (step: readonly string[]) =>
      indented(2)(step).replace('- run:', '- "run":').replace('- uses:', '- "uses":'),
  }),
  Object.freeze({
    id: 'flow-mapping-job-body',
    render: (step: readonly string[]) => `jobs:\n  subject: { steps: [${JSON.stringify(step.join(' '))}] }`,
  }),
  Object.freeze({
    id: 'yaml-alias-in-body',
    render: (step: readonly string[]) => `${indented(2)(step)}\n    timeout-minutes: *shared`,
  }),
  Object.freeze({
    id: 'sibling-job-after-subject',
    render: (step: readonly string[]) => `${indented(2)(step)}\n  neighbour:\n    runs-on: ubuntu-latest`,
  }),
  Object.freeze({
    id: 'preceding-top-level-key',
    render: (step: readonly string[]) => `name: CI\non:\n  push:\n    branches: [main]\n${indented(2)(step)}`,
  }),
]);

/** The verdict a scanner reached about one document. */
type Verdict = 'found' | 'unreadable' | 'silently-clean';

function verdictFor(defect: PlantedDefect, text: string): Verdict {
  // A throw is a refusal, which is a form of declaring the document
  // unreadable — never a clean result, so it satisfies the invariant.
  let findings: readonly WorkflowActionPinViolation[];
  try {
    findings = defect.scan(text);
  } catch {
    return 'unreadable';
  }
  if (findings.some((finding) => finding.reason === defect.reason)) return 'found';
  if (findings.some((finding) => finding.reason === 'unreadable-yaml')) return 'unreadable';
  if (unreadableYamlViolations(text).length > 0) return 'unreadable';
  return 'silently-clean';
}

describe('differential grammar corpus — no spelling makes a defect invisible', () => {
  const cases = DEFECTS.flatMap((defect) =>
    SPELLINGS.map((spelling) => [`${defect.id} / ${spelling.id}`, defect, spelling] as const),
  );

  it('the corpus is non-vacuous in both dimensions', () => {
    expect(DEFECTS.length).toBeGreaterThanOrEqual(4);
    expect(SPELLINGS.length).toBeGreaterThanOrEqual(13);
    expect(cases.length).toBe(DEFECTS.length * SPELLINGS.length);
  });

  it.each(cases)('%s is found or declared unreadable, never silently clean', (_label, defect, spelling) => {
    const text = spelling.render(defect.step);
    expect(verdictFor(defect, text)).not.toBe('silently-clean');
  });

  it('the corpus has TEETH: a defect-free document in every spelling stays clean', () => {
    // Without this the law would pass trivially if every scanner reported
    // everything. The benign step must produce no finding in the spellings
    // that are inside the admitted grammar.
    const benign = Object.freeze(['- run: echo ok']);
    const admitted = SPELLINGS.filter(
      (spelling) => !['quoted-step-key', 'flow-mapping-job-body', 'yaml-alias-in-body'].includes(spelling.id),
    );
    expect(admitted.length).toBeGreaterThanOrEqual(10);
    for (const spelling of admitted) {
      const text = spelling.render(benign);
      expect(unreadableYamlViolations(text), spelling.id).toEqual([]);
      expect(scanWorkflowExpressionInjection(text), spelling.id).toEqual([]);
      expect(scanWorkflowActionPins(text), spelling.id).toEqual([]);
    }
  });

  it('generated indentation widths never make a defect invisible (seeded)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (width) => {
        const text = indented(width)(['- run: echo "${{ github.event.pull_request.title }}"']);
        const defect = DEFECTS[0]!;
        return verdictFor(defect, text) !== 'silently-clean';
      }),
      { seed: 0x9a11d0c5, numRuns: 120 },
    );
  });
});
