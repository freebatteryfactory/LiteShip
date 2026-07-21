/**
 * The P17 OBLIGATIONS-LEDGER gate + reconciler — self-proof, real-repo green floor, and
 * the ledger⇔marker reconciliation teeth.
 *
 * `noUnregisteredTodoGate` reds a bare intent-debt directive (TODO / FIXME / HACK) in
 * `packages/x/src` that cites no registered `OBL-<AREA>-<slug>` obligation, while a
 * registered, cited deferral (an `OBLIGATION: OBL-…` marker or a `TODO(OBL-…)` directive)
 * passes, and a keyword inside a string / regex literal is never tripped (the strings-blanked floor).
 * The host reconciler `buildObligationLedger` scans the SAME markers and REQUIRES each to
 * name an obligation declared in `traceability/obligations.yaml` (the head-probe LAW).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isTaggedError } from '@liteship/error';
import { noUnregisteredTodoGate, verifyGate, nodeContext, memoryContext } from '@liteship/gauntlet';
import { buildObligationLedger } from '../../../packages/cli/src/lib/traceability.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const GLOBS = ['packages/*/src/**/*.ts'] as const;

/** Render a finding as a stable `file:line` token. */
function locOf(file: string | undefined, line: number | undefined): string {
  return `${file ?? '<no-file>'}:${line ?? 0}`;
}

describe('gauntlet/no-unregistered-todo — the OBLIGATIONS-LEDGER enforcement teeth', () => {
  it('self-proves (red caught, green clean, mutation killed)', () => {
    expect(verifyGate(noUnregisteredTodoGate).selfProven).toBe(true);
  });

  it('reds a bare `// TODO` that cites no obligation', () => {
    const red = memoryContext({
      'packages/demo/src/x.ts': '// TODO: finish the generator\nexport const x = 1;\n',
    });
    const findings = noUnregisteredTodoGate.run(red);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('gauntlet/no-unregistered-todo');
    expect(findings[0]?.location?.line).toBe(1);
  });

  it('allows a directive that CITES a registered obligation, and a standalone marker', () => {
    const green = memoryContext({
      'packages/demo/src/a.ts': '// OBLIGATION: OBL-FEATURE-ADD\nexport const a = 1;\n',
      'packages/demo/src/b.ts': '// TODO(OBL-FEATURE-ADD): richer generators forthcoming\nexport const b = 2;\n',
    });
    expect(noUnregisteredTodoGate.run(green)).toEqual([]);
  });

  it('does NOT trip on the keyword inside a string or regex literal (the strings-blanked floor)', () => {
    const green = memoryContext({
      // The keyword lives ONLY in a string and a regex — the guardrail-scanner shape.
      'packages/demo/src/scanner.ts':
        'const label = "TODO / FIXME / HACK directive";\nconst pat = /(?:\\/\\/)\\s*(?:TODO|FIXME|HACK)/;\nexport const s = label.length + pat.source.length;\n',
    });
    expect(noUnregisteredTodoGate.run(green)).toEqual([]);
  });

  it('is at a ZERO floor on the real packages/*/src tree (lists any regression)', () => {
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);
    expect(ctx.files().length).toBeGreaterThan(0);
    const findings = noUnregisteredTodoGate.run(ctx);
    const seen = findings.map((f) => locOf(f.location?.file, f.location?.line)).sort();
    const message = [
      `gauntlet/no-unregistered-todo over ${GLOBS.join(', ')} found ${findings.length} finding(s) — the floor is ZERO.`,
      'Each line below is a bare intent-debt marker to register (traceability/obligations.yaml) or finish:',
      ...seen.map((s) => `  + ${s}`),
    ].join('\n');
    expect(seen, message).toEqual([]);
  });

  it('is deterministic — the same tree yields the same findings twice', () => {
    const run = (): readonly string[] =>
      noUnregisteredTodoGate
        .run(nodeContext(REPO_ROOT, [...GLOBS]))
        .map((f) => locOf(f.location?.file, f.location?.line));
    expect(run()).toEqual(run());
  });
});

describe('buildObligationLedger — the ledger⇔marker reconciliation', () => {
  it('reconciles the REAL repo clean — every marker names a registered obligation', () => {
    const ledger = buildObligationLedger(REPO_ROOT);
    // The four registered obligations of the P17 ledger.
    const ids = ledger.obligations.map((o) => o.id).sort();
    expect(ids).toEqual([
      'OBL-DEVOPS-ARTIFACT-REPRO',
      'OBL-FEATURE-ADD',
      'OBL-REACTIVE-SWEEP-3',
      'OBL-TEST-FFMPEG-CODEC',
    ]);
    // The in-source markers (add.ts, zap.ts, composable.ts) were discovered and all resolve.
    const markered = new Set(ledger.markers.flatMap((m) => m.obligationIds));
    expect(markered.has('OBL-FEATURE-ADD')).toBe(true);
    expect(markered.has('OBL-REACTIVE-SWEEP-3')).toBe(true);
    // No marker names an unregistered obligation — the head-probe LAW holds on the real tree.
    expect(ledger.divergences).toEqual([]);
  });

  it('is content-addressed + deterministic (same tree → identical address)', () => {
    expect(buildObligationLedger(REPO_ROOT).ledgerAddress).toBe(buildObligationLedger(REPO_ROOT).ledgerAddress);
  });

  it('reds an unregistered marker as a divergence (the reconciler has teeth)', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-obl-'));
    try {
      mkdirSync(join(root, 'traceability'), { recursive: true });
      mkdirSync(join(root, 'packages', 'demo', 'src'), { recursive: true });
      writeFileSync(
        join(root, 'traceability', 'obligations.yaml'),
        'obligations:\n  - id: OBL-REAL-X\n    class: debt\n    owner: o\n    review-by: "2027-01-01"\n    pointer: packages/demo/src/a.ts\n    note: "a real one"\n',
        'utf8',
      );
      writeFileSync(
        join(root, 'packages', 'demo', 'src', 'a.ts'),
        '// OBLIGATION: OBL-REAL-X\nexport const a = 1;\n',
        'utf8',
      );
      writeFileSync(
        join(root, 'packages', 'demo', 'src', 'b.ts'),
        '// OBLIGATION: OBL-PHANTOM\nexport const b = 2;\n',
        'utf8',
      );
      const ledger = buildObligationLedger(root);
      expect(ledger.divergences).toHaveLength(1);
      expect(ledger.divergences[0]?.kind).toBe('unregistered-obligation');
      expect(ledger.divergences[0]?.obligationId).toBe('OBL-PHANTOM');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails LOUD on a malformed ledger (an unknown class)', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-obl-'));
    try {
      mkdirSync(join(root, 'traceability'), { recursive: true });
      writeFileSync(
        join(root, 'traceability', 'obligations.yaml'),
        'obligations:\n  - id: OBL-BAD\n    class: not-a-class\n    owner: o\n    review-by: "2027-01-01"\n    pointer: x\n    note: "y"\n',
        'utf8',
      );
      let threw = false;
      try {
        buildObligationLedger(root);
      } catch (err) {
        threw = true;
        expect(isTaggedError(err)).toBe(true);
      }
      expect(threw).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
