import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  scanWorkflowActionPins,
  scanWorkflowCheckoutCredentials,
  TRUSTED_ACTION_SOURCES,
} from '../../../packages/cli/src/internal/workflow-action-pins.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const WORKFLOWS = readdirSync(resolve(ROOT, '.github/workflows'))
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, text: readFileSync(resolve(ROOT, '.github/workflows', name), 'utf8') }));

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
    expect(violations.map((entry) => [entry.line, entry.reason])).toEqual([
      [2, 'missing-immutable-revision'],
      [3, 'missing-immutable-revision'],
      [4, 'missing-immutable-revision'],
    ]);
  });

  it('does not allow YAML quoting to bypass source or revision policy', () => {
    expect(
      scanWorkflowActionPins(`- uses: "actions/checkout@v6"\n- uses: 'stranger/action@${'a'.repeat(40)}'`),
    ).toEqual([
      { line: 1, content: '- uses: "actions/checkout@v6"', reason: 'missing-immutable-revision' },
      {
        line: 2,
        content: `- uses: 'stranger/action@${'a'.repeat(40)}'`,
        reason: 'untrusted-source',
      },
    ]);
  });

  it('rejects an immutable SHA from an action repository outside the reviewed source set', () => {
    expect(scanWorkflowActionPins(`- uses: stranger/surprise@${'a'.repeat(40)}`)).toEqual([
      {
        line: 1,
        content: `- uses: stranger/surprise@${'a'.repeat(40)}`,
        reason: 'untrusted-source',
      },
    ]);
  });

  it('admits every live workflow action and mutating every trusted family to a tag is caught', () => {
    for (const workflow of WORKFLOWS) expect(scanWorkflowActionPins(workflow.text), workflow.name).toEqual([]);
    for (const source of TRUSTED_ACTION_SOURCES) {
      expect(scanWorkflowActionPins(`- uses: ${source}@v999`)).toEqual([
        {
          line: 1,
          content: `- uses: ${source}@v999`,
          reason: 'missing-immutable-revision',
        },
      ]);
    }
  });

  it('requires every checkout in every workflow to disable credential persistence explicitly', () => {
    for (const workflow of WORKFLOWS) {
      expect(scanWorkflowCheckoutCredentials(workflow.text), workflow.name).toEqual([]);
    }
    expect(
      scanWorkflowCheckoutCredentials(
        `steps:\n  - uses: actions/checkout@${'a'.repeat(40)}\n    with:\n      fetch-depth: 0\n`,
      ),
    ).toHaveLength(1);
    expect(
      scanWorkflowCheckoutCredentials(
        `steps:\n  - uses: actions/checkout@${'a'.repeat(40)}\n    with:\n      persist-credentials: true\n`,
      ),
    ).toHaveLength(1);
  });
});
