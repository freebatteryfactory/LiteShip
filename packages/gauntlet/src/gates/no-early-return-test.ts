/**
 * Gate: no early-return test — bare `return;` in a test body before the first
 * `expect(...)` ships green while proving nothing. Use `test.skipIf(capability)`
 * for honest capability gates instead.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stableEvidenceDigest } from '../verdict-cache.js';
import { detectEarlyReturnBeforeExpect, type EarlyReturnMatch } from './early-return-detect.js';

function governedFiles(context: GateContext): readonly string[] {
  const judged = context.files();
  const all = context.allFiles !== undefined ? context.allFiles() : judged;
  const union = new Set<string>([...judged, ...all]);
  return [...union].filter((f) => f.endsWith('.test.ts') && !/(?:^|\/)tests\/generated\//.test(f)).sort();
}

function scan(context: GateContext): readonly Finding[] {
  const detect = context.earlyReturnDetector ?? detectEarlyReturnBeforeExpect;
  const findings: Finding[] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    const hits = detect(text);
    for (const hit of hits) {
      findings.push(
        finding({
          ruleId: 'gauntlet/no-early-return-test',
          severity: 'error',
          level: 'L2',
          title: 'Early return before expect — green while proving nothing',
          detail: `${file}:${hit.line} carries \`return;\` before any \`expect(...)\`. A bare return ships GREEN while asserting nothing — use \`test.skipIf(<capability>)\` and enumerate the skip in the sanctioned-skip allowlist instead.`,
          location: { file, line: hit.line },
          remediation: {
            kind: 'instruction',
            description: 'Replace the silent early return with an honest capability skip or real assertions.',
            steps: [
              'If the test needs a missing capability, rewrite as `test.skipIf(!capability)(...)` and add a sanctioned-skip allowlist entry.',
              'If the test should run, remove the early return and assert real behavior.',
            ],
          },
        }),
      );
    }
  }
  return findings;
}

function evidenceDigest(context: GateContext): string {
  const entries: [string, string][] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text !== undefined) entries.push([file, text]);
  }
  return stableEvidenceDigest(entries);
}

export const noEarlyReturnTestGate: Gate = defineGate({
  id: 'gauntlet/no-early-return-test',
  level: 'L2',
  describe: 'Flags bare `return;` in test bodies before the first `expect(...)` — a silent pass disguised as coverage.',
  run: scan,
  evidenceDigest,
  fixtures: {
    red: {
      name: 'a test that returns before any expect',
      context: memoryContext({
        'tests/unit/widget/silent-pass.test.ts':
          "it('bails silently', () => {\n  if (!process.env.FEATURE) return;\n  expect(1).toBe(1);\n});\n",
      }),
    },
    green: {
      name: 'a test with expect before any guard return',
      context: memoryContext({
        'tests/unit/widget/real.test.ts': "it('asserts first', () => {\n  expect(1).toBe(1);\n});\n",
      }),
    },
    mutation: {
      describe: 'A gate that ignores early returns lets the red fixture escape.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (): readonly Finding[] => [],
      }),
    },
  },
});

export type { EarlyReturnMatch };
