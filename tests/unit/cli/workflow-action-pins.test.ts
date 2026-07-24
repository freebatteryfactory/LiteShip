import { describe, expect, it } from 'vitest';
import { scanWorkflowActionPins } from '../../../packages/cli/src/lib/workflow-action-pins.js';

describe('workflow action pin law', () => {
  it('accepts immutable third-party SHAs and local reusable workflows', () => {
    expect(
      scanWorkflowActionPins(`
steps:
  - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
jobs:
  call:
    uses: ./.github/workflows/ci.yml
`),
    ).toEqual([]);
  });

  it('rejects floating major, branch, and missing revisions', () => {
    const violations = scanWorkflowActionPins(`
- uses: actions/checkout@v6
- uses: owner/action@main
- uses: owner/action
`);
    expect(violations.map((entry) => entry.line)).toEqual([2, 3, 4]);
  });
});
