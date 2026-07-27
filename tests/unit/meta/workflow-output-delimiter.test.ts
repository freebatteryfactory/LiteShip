/**
 * $GITHUB_OUTPUT heredoc law — proof harness for compute-then-emit.
 *
 * When the plan step ran `pnpm exec tsx scripts/ci-plan.ts` between
 * `echo "matrix<<PLAN_EOF"` and `echo "PLAN_EOF"`, every planner failure also
 * corrupted $GITHUB_OUTPUT ("Matching delimiter not found 'PLAN_EOF'"),
 * burying the root error under shell fallout (CI runs 30263467365,
 * 30156066346). The authority under test
 * (scripts/lib/workflow-output-contract.ts, applied by
 * scripts/workflow-output-gate.ts) enumerates every output heredoc in
 * `.github/workflows/` and rejects fallible interior commands.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  buildWorkflowOutputReceipt,
  scanWorkflowOutputHeredocs,
} from '../../../scripts/lib/workflow-output-contract.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const RED_WORKFLOW = [
  'jobs:',
  '  plan:',
  '    steps:',
  '      - run: |',
  '          {',
  '            echo "matrix<<PLAN_EOF"',
  '            pnpm exec tsx scripts/ci-plan.ts',
  '            echo "PLAN_EOF"',
  '          } >> "$GITHUB_OUTPUT"',
].join('\n');

const GREEN_WORKFLOW = [
  'jobs:',
  '  plan:',
  '    steps:',
  '      - run: |',
  '          matrix_json="$(pnpm exec tsx scripts/ci-plan.ts)"',
  '          {',
  '            echo "matrix<<PLAN_EOF"',
  '            printf \'%s\\n\' "$matrix_json"',
  '            echo "PLAN_EOF"',
  '          } >> "$GITHUB_OUTPUT"',
].join('\n');

describe('output heredoc classification', () => {
  it('RED (cure packet, run 30156066346): a fallible command inside the delimiters is a finding', () => {
    const { subjects, findings } = scanWorkflowOutputHeredocs('fixture.yml', RED_WORKFLOW);
    expect(subjects).toHaveLength(1);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: 'fallible-interior-command',
      delimiter: 'PLAN_EOF',
      text: 'pnpm exec tsx scripts/ci-plan.ts',
    });
  });

  it('GREEN: compute-then-emit (echo/printf interior only) has no finding', () => {
    const { subjects, findings } = scanWorkflowOutputHeredocs('fixture.yml', GREEN_WORKFLOW);
    expect(subjects).toHaveLength(1);
    expect(findings).toHaveLength(0);
  });

  it('an unterminated heredoc is its own finding kind', () => {
    const text = [
      'jobs:',
      '  j:',
      '    steps:',
      '      - run: |',
      '          echo "matrix<<EOF_X" >> "$GITHUB_OUTPUT"',
    ].join('\n');
    const { findings } = scanWorkflowOutputHeredocs('fixture.yml', text);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('unterminated-heredoc');
  });

  it('comments and blank interior lines stay legal', () => {
    const text = [
      'jobs:',
      '  j:',
      '    steps:',
      '      - run: |',
      '          out="$(true)"',
      '          {',
      '            echo "v<<EOF_Y"',
      '',
      '            # emit the captured value',
      '            echo "$out"',
      '            echo "EOF_Y"',
      '          } >> "$GITHUB_OUTPUT"',
    ].join('\n');
    expect(scanWorkflowOutputHeredocs('fixture.yml', text).findings).toHaveLength(0);
  });

  it('rejects command substitution hidden inside an emitting command', () => {
    const text = [
      'jobs:',
      '  j:',
      '    steps:',
      '      - run: |',
      '          {',
      '            echo "v<<EOF_Z"',
      '            echo "$(pnpm exec tsx scripts/fallible.ts)"',
      '            echo "EOF_Z"',
      '          } >> "$GITHUB_OUTPUT"',
    ].join('\n');
    expect(scanWorkflowOutputHeredocs('fixture.yml', text).findings).toEqual([
      expect.objectContaining({
        kind: 'fallible-interior-command',
        text: 'echo "$(pnpm exec tsx scripts/fallible.ts)"',
      }),
    ]);
  });
});

describe('live tree', () => {
  it('every $GITHUB_OUTPUT write is enumerated and every multiline record is compute-then-emit', () => {
    const receipt = buildWorkflowOutputReceipt(REPO);
    expect(receipt.findings).toEqual([]);
    expect(receipt.writes.length).toBeGreaterThan(0);
    expect(receipt.writes.some((subject) => subject.file === '.github/workflows/ci.yml')).toBe(true);
    // The compact CI matrix deliberately needs no multiline delimiter now.
    expect(receipt.subjects.some((subject) => subject.delimiter === 'PLAN_EOF')).toBe(false);
    expect(receipt.censusDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });
});
