import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  scanWorkflowActionPins,
  scanWorkflowCheckoutCredentials,
  scanWorkflowExpressionInjection,
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

describe('expressions in run commands', () => {
  it('the live workflows carry no unallowlisted expression root', () => {
    for (const workflow of WORKFLOWS) {
      expect(scanWorkflowExpressionInjection(workflow.text), workflow.name).toEqual([]);
    }
  });

  it('a github.event pull-request title interpolated into run is a violation', () => {
    const workflow = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: echo "${{ github.event.pull_request.title }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('a quoted run: key cannot smuggle an expression past the reader (Codex review, confirmed P1)', () => {
    const workflow = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - "run": echo "${{ github.event.pull_request.title }}"',
    ].join('\n');

    // The structural reader only recognizes the unquoted spelling, so the
    // quoted key MUST be declared unreadable — a silent [] here is the
    // fail-open the shape allowlist exists to prevent.
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([expect.objectContaining({ reason: 'unreadable-yaml' })]);
  });

  it('a single-quoted mapping key in a plain mapping position is unreadable too', () => {
    const workflow = ['jobs:', '  unsafe:', "    'runs-on': ubuntu-latest", '    steps:', '      - run: echo ok'].join(
      '\n',
    );
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([expect.objectContaining({ reason: 'unreadable-yaml' })]);
  });

  it('a quote that merely begins a scalar VALUE stays legal', () => {
    const workflow = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      - run: echo ok',
      '        name: "quoted name value"',
    ].join('\n');
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([]);
  });

  it('a github.head_ref in a run block scalar is a violation', () => {
    const workflow = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: |',
      '          echo "${{ github.head_ref }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('needs, steps, matrix, inputs, secrets, env, and vars roots are admitted', () => {
    const workflow = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      - run: |',
      '          echo "${{ fromJSON(needs.plan.outputs.matrix).shard }}"',
      '          echo "${{ steps.version.outputs.version }}"',
      '          echo "${{ matrix.browser }}"',
      '          echo "${{ inputs.dry-run }}"',
      '          echo "${{ secrets.TOKEN }}"',
      '          echo "${{ env.MODE }}"',
      '          echo "${{ vars.CHANNEL }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([]);
  });

  it('an unclosed expression is a violation, not a skipped command', () => {
    const workflow = ['jobs:', '  unsafe:', '    steps:', '      - run: echo "${{ inputs.value"'].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('an unknown function cannot launder an otherwise allowed path', () => {
    const workflow = ['jobs:', '  unsafe:', '    steps:', '      - run: echo "${{ evil(inputs.value) }}"'].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('stray punctuation and unbalanced parentheses are refused', () => {
    const stray = ['jobs:', '  unsafe:', '    steps:', '      - run: echo "${{ inputs.value @@@ }}"'].join('\n');
    const unbalanced = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: echo "${{ fromJSON(inputs.value) )) }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(stray)).toEqual([expect.objectContaining({ reason: 'expression-in-run' })]);
    expect(scanWorkflowExpressionInjection(unbalanced)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('one allowed reference cannot hide a github reference in the same expression', () => {
    const workflow = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: echo "${{ fromJSON(inputs.value, github.event.pull_request.title) }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('the closed logical and comparison grammar composes allowed roots', () => {
    const workflow = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      - run: echo "${{ inputs.value || env.DEFAULT }}"',
      '      - run: echo "${{ matrix.shard >= 0 && inputs.enabled != false }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([]);
  });

  it('a leading dot is unsupported syntax, not a safe path', () => {
    const workflow = ['jobs:', '  unsafe:', '    steps:', '      - run: echo "${{ .inputs.value }}"'].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('missing and consecutive operators are unparseable', () => {
    const missing = ['jobs:', '  unsafe:', '    steps:', '      - run: echo "${{ inputs.value env.DEFAULT }}"'].join(
      '\n',
    );
    const consecutive = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: echo "${{ inputs.value || || env.DEFAULT }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(missing)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
    expect(scanWorkflowExpressionInjection(consecutive)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('an expression in a non-run field is outside this scanner', () => {
    const workflow = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      - name: ${{ github.event.pull_request.title }}',
      '        if: ${{ github.head_ref }}',
      '        run: echo safe',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([]);
  });
});

describe('uses: is read as a step field in every spelling', () => {
  const workflowOf = (steps: string): string => `jobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n${steps}`;

  it('a name-bulleted step with a child uses field is scanned', () => {
    const violations = scanWorkflowActionPins(workflowOf('      - name: surprise\n        uses: owner/action@main\n'));
    expect(violations.map((entry) => entry.reason)).toContain('missing-immutable-revision');
  });

  it('a quoted uses value is scanned', () => {
    const violations = scanWorkflowActionPins(workflowOf('      - uses: "owner/action@main"\n'));
    expect(violations.map((entry) => entry.reason)).toContain('missing-immutable-revision');
  });

  it('a flow-collection step is refused as unreadable, never skipped', () => {
    expect(scanWorkflowActionPins(workflowOf('      - { uses: owner/evil@main }\n'))).toEqual([
      expect.objectContaining({ reason: 'unreadable-yaml' }),
    ]);
  });

  it('a ref containing # without preceding whitespace is scanned, not skipped', () => {
    const violations = scanWorkflowActionPins(workflowOf('      - uses: owner/action@main#comment-less-ref\n'));
    expect(violations.map((entry) => entry.reason)).toContain('missing-immutable-revision');
  });

  it('line provenance comes from the jobs mapping, not an identical block-scalar decoy', () => {
    const workflow =
      'decoy: |\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: owner/action@main\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: owner/action@main\n';
    expect(scanWorkflowActionPins(workflow)).toEqual([
      expect.objectContaining({ line: 10, reason: 'missing-immutable-revision' }),
    ]);
  });
});

describe('checkout credentials are read at the with level', () => {
  const sha = 'a'.repeat(40);
  const workflowOf = (steps: string): string => `jobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n${steps}`;

  it('a name-bulleted checkout is scanned', () => {
    expect(
      scanWorkflowCheckoutCredentials(
        workflowOf(
          `      - name: checkout\n        uses: actions/checkout@${sha}\n        with:\n          persist-credentials: false\n`,
        ),
      ),
    ).toEqual([]);
  });

  it('persist-credentials false nested below with does not satisfy the contract', () => {
    expect(
      scanWorkflowCheckoutCredentials(
        workflowOf(
          `      - uses: actions/checkout@${sha}\n        with:\n          options:\n            persist-credentials: false\n`,
        ),
      ),
    ).toEqual([expect.objectContaining({ reason: 'credentials-persisted' })]);
  });

  it('a fragment uses the same direct-child credential rule as a complete workflow', () => {
    expect(
      scanWorkflowCheckoutCredentials(
        `steps:\n  - uses: actions/checkout@${sha}\n    with:\n      options:\n        persist-credentials: false\n`,
      ),
    ).toEqual([expect.objectContaining({ reason: 'credentials-persisted' })]);
  });

  it('a flow-collection checkout step is refused as unreadable', () => {
    expect(scanWorkflowCheckoutCredentials(workflowOf(`      - { uses: actions/checkout@${sha} }\n`))).toEqual([
      expect.objectContaining({ reason: 'unreadable-yaml' }),
    ]);
  });
});
