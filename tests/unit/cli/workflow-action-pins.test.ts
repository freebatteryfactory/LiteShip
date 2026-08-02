import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  scanWorkflowActionPins,
  scanWorkflowCheckoutCredentials,
  scanWorkflowExpressionInjection,
  TRUSTED_ACTION_SOURCES,
  unreadableYamlViolations,
  workflowJobSections,
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
  it('the live workflows interpolate no expression into any run command', () => {
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

  // Codex review round 3 on PR #197, confirmed P1: the job-header reader
  // hardcoded a two-space indent while the shape allowlist admits any
  // consistent block-mapping indentation. A four-space workflow therefore
  // produced an EMPTY section map and every scanner returned [] — a total
  // fail-open on valid YAML, not a missed edge case.
  it.each([
    ['four-space', 4],
    ['three-space', 3],
    ['eight-space', 8],
    ['two-space (regression)', 2],
  ])('%s job indentation is read structurally, so injection still reds', (_name, width) => {
    const pad = (depth: number): string => ' '.repeat(width * depth);
    const workflow = [
      'jobs:',
      `${pad(1)}evil:`,
      `${pad(2)}steps:`,
      `${pad(3)}- run: echo "\${{ github.event.pull_request.title }}"`,
    ].join('\n');
    expect(unreadableYamlViolations(workflow)).toEqual([]);
    expect([...workflowJobSections(workflow).keys()]).toEqual(['evil']);
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('a four-space workflow still enforces action pinning (the sibling scanner fails open the same way)', () => {
    const workflow = ['jobs:', '    evil:', '        steps:', '            - uses: owner/action@main'].join('\n');
    expect(scanWorkflowActionPins(workflow)).toEqual([
      expect.objectContaining({ reason: 'missing-immutable-revision' }),
    ]);
  });

  it('a nested mapping key deeper than the job level is never promoted to a job', () => {
    const workflow = [
      'jobs:',
      '    only:',
      '        env:',
      '            other: value',
      '        steps:',
      '            - run: echo ok',
    ].join('\n');
    expect([...workflowJobSections(workflow).keys()]).toEqual(['only']);
  });

  // Codex review round 4 on PR #197, confirmed P1: the flow-collection
  // refusal enumerated a fixed key list, so `build: { uses: ... }` was
  // admitted by the shape allowlist AND unrecognizable to the section
  // reader — both scanners returned clean for the whole job. The refusal
  // must key on the GRAMMAR (any mapping key followed by a flow collection),
  // never on a subset of key names.
  it.each([
    ['a job-level reusable-workflow call', 'jobs:\n  build: { uses: owner/repo/.github/workflows/ci.yml@main }'],
    ['an arbitrary unlisted key', 'jobs:\n  a:\n    strategy: { matrix: { os: [linux] } }'],
    ['a flow sequence hiding a mapping', 'jobs:\n  a:\n    steps: [{ run: echo }]'],
    ['a flow mapping under an unlisted key', 'jobs:\n  a:\n    container: { image: node }'],
  ])('%s is refused as outside the structural reader grammar', (_name, workflow) => {
    expect(unreadableYamlViolations(workflow).join('\n')).toMatch(/flow collection/u);
    // Fail-closed end to end: the scanners must report unreadable-yaml
    // rather than a clean result they cannot justify.
    expect(scanWorkflowActionPins(workflow)).toEqual([expect.objectContaining({ reason: 'unreadable-yaml' })]);
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([expect.objectContaining({ reason: 'unreadable-yaml' })]);
  });

  it('a plain scalar that merely CONTAINS a brace stays legal', () => {
    const workflow = ['jobs:', '  safe:', '    steps:', '      - run: echo "a{b}c"', '        name: not [a] list'].join(
      '\n',
    );
    expect(unreadableYamlViolations(workflow)).toEqual([]);
  });

  it('a flow sequence of plain scalars stays legal — it hides no structure', () => {
    // The live workflows depend on this: `branches: [main]`,
    // `shard: [1, 2, 3, 4]`, `browser: [chromium, firefox, webkit]`.
    const workflow = [
      'on:',
      '  push:',
      '    branches: [main]',
      'jobs:',
      '  a:',
      '    strategy:',
      '      matrix:',
      '        shard: [1, 2, 3, 4]',
      '    steps:',
      '      - run: echo ok',
    ].join('\n');
    expect(unreadableYamlViolations(workflow)).toEqual([]);
  });

  it('a bullet whose field spacing exceeds one space keeps its sibling fields out of the command', () => {
    // `-   run: |` puts the step's fields at bullet indent + 4, not + 2. The
    // scalar boundary must be derived from the bullet's own prefix or an
    // `if: |` sibling leaks back into the command text (the round-9 defect).
    const workflow = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      -   run: |',
      '            echo ok',
      '          if: |',
      '            contains(github.event.head_commit.message, "x")',
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

  // THE POSITIONAL LAW (Codex review round 2 on PR #197, confirmed P1): no
  // context root is provably safe to splice into shell command text, because
  // provenance is not a property of the root token. `env.TITLE` can be staged
  // from `github.event.pull_request.title`; `matrix.*` can be derived from
  // `fromJSON(inputs.*)`; a `steps.*.outputs.*` value can be whatever an
  // earlier step echoed. Admitting roots is a denylist wearing an allowlist's
  // clothes — each removal invites the next neighbour. The allowlist for the
  // RUN position is therefore EMPTY: stage the value into `env:` (which
  // GitHub evaluates as an expression, never as command text) and let the
  // shell expand it as data.
  it.each([
    ['env staged from event data', 'echo "${{ env.TITLE }}"'],
    ['matrix derived from inputs', 'echo "${{ matrix.browser }}"'],
    ['a step output of unproven provenance', 'echo "${{ steps.version.outputs.version }}"'],
    ['a need output of unproven provenance', 'echo "${{ fromJSON(needs.plan.outputs.matrix).shard }}"'],
    ['a repository secret', 'echo "${{ secrets.TOKEN }}"'],
    ['a repository variable', 'echo "${{ vars.CHANNEL }}"'],
    ['a caller-supplied input', 'echo "${{ inputs.value }}"'],
  ])('%s cannot be interpolated into a run command', (_name, command) => {
    const workflow = ['jobs:', '  unsafe:', '    steps:', `      - run: ${command}`].join('\n');
    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
  });

  it('the laundering hop Codex named is refused at the run position, not at the staging position', () => {
    // Staging IS the sanctioned pattern, so the env: mapping value stays
    // legal even when it names event data — GitHub evaluates it as an
    // expression. The violation is re-interpolating it into command TEXT.
    const laundered = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - env:',
      '          TITLE: ${{ github.event.pull_request.title }}',
      '        run: echo "${{ env.TITLE }}"',
    ].join('\n');
    expect(scanWorkflowExpressionInjection(laundered)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);

    const staged = [
      'jobs:',
      '  safe:',
      '    steps:',
      '      - env:',
      '          TITLE: ${{ github.event.pull_request.title }}',
      '        run: echo "$TITLE"',
    ].join('\n');
    expect(scanWorkflowExpressionInjection(staged)).toEqual([]);
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

  it('a composed expression is refused like any other — composition cannot launder the run position', () => {
    // This arm previously proved the closed logical/comparison grammar
    // ADMITTED composed roots. The allowlist is now empty, so composition is
    // exactly as refused as a bare reference; both spellings stay covered.
    const workflow = [
      'jobs:',
      '  unsafe:',
      '    steps:',
      '      - run: echo "${{ vars.VALUE || env.DEFAULT }}"',
      '      - run: echo "${{ matrix.shard >= 0 && env.ENABLED != false }}"',
    ].join('\n');

    expect(scanWorkflowExpressionInjection(workflow)).toEqual([
      expect.objectContaining({ reason: 'expression-in-run' }),
      expect.objectContaining({ reason: 'expression-in-run' }),
    ]);
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
