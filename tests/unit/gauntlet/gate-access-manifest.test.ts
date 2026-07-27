// @vitest-environment node
/**
 * Built-in gate access manifests are executable declarations, not prose. Every
 * context surface observed through the recorder must be admitted by the gate's
 * manifest, and every required host fact must exist before any gate executes.
 */

import { describe, expect, it } from 'vitest';
import {
  ABSENT_SUFFIX,
  FACT_CHANNELS,
  LITESHIP_GATES,
  LITESHIP_IR_GATES,
  matchesGlob,
  memoryContext,
  recordingContext,
  runGates,
  type Gate,
  type GateAccessManifest,
  type GateContext,
} from '@liteship/gauntlet';

function uniqueBuiltIns(): readonly Gate[] {
  return [...new Map([...LITESHIP_GATES, ...LITESHIP_IR_GATES].map((gate) => [gate.id, gate])).values()];
}

function isFixtureIrFile(path: string, context: GateContext): boolean {
  if (context.ir !== undefined) return context.ir.files.has(path);
  if (/^packages\/[^/]+\/src\/.*\.tsx?$/u.test(path)) return true;
  return !path.includes('/') && /\.tsx?$/u.test(path);
}

function declaredBy(read: string, manifest: GateAccessManifest, context: GateContext): boolean {
  if (read === 'allFiles') return manifest.allFiles === true;
  if (read === 'ir.facts' || read === 'ir.refs') {
    return manifest.ir?.includes(read === 'ir.facts' ? 'facts' : 'refs') === true;
  }
  const filePrefix = 'readFile:';
  if (read.startsWith(filePrefix)) {
    const path = read.slice(filePrefix.length);
    const allFiles = context.allFiles?.() ?? context.files();
    return (
      isFixtureIrFile(path, context) ||
      (manifest.allFiles === true && allFiles.includes(path)) ||
      manifest.outOfIrGlobs?.some((glob) => matchesGlob(path.replaceAll('\\', '/'), glob)) === true
    );
  }
  const channel = read.endsWith(ABSENT_SUFFIX) ? read.slice(0, -ABSENT_SUFFIX.length) : read;
  if ((FACT_CHANNELS as readonly string[]).includes(channel)) {
    return manifest.facts?.some((fact) => fact.channel === channel) === true;
  }
  return false;
}

function undeclaredReads(gate: Gate, context: GateContext): readonly string[] {
  const recorder = recordingContext(context);
  gate.run(recorder.context);
  const manifest = gate.access ?? {};
  return [...recorder.reads()].filter((read) => !declaredBy(read, manifest, context)).sort();
}

describe('built-in gate access manifests', () => {
  it('are present on every gate in the lean and IR compositions', () => {
    const missing = uniqueBuiltIns()
      .filter((gate) => gate.access === undefined)
      .map((gate) => gate.id);
    expect(missing).toEqual([]);
  });

  it('cover every access observed in each gate-owned red and green world', () => {
    const failures = uniqueBuiltIns().flatMap((gate) =>
      [gate.fixtures.green, gate.fixtures.red].flatMap((fixture) => {
        const missing = undeclaredReads(gate, fixture.context);
        return missing.length === 0 ? [] : [`${gate.id}/${fixture.name}: ${missing.join(', ')}`];
      }),
    );
    expect(failures).toEqual([]);
  });

  it('treats directory-qualified declarations outside packages/*/src as out-of-IR', () => {
    const context = memoryContext({
      'packages/liteship/dist/index.d.ts': 'export declare const rogue: true;\n',
      'scripts/check.ts': 'export const check = true;\n',
      'fixture.ts': 'export const fixture = true;\n',
    });
    const manifest: GateAccessManifest = { outOfIrGlobs: ['packages/liteship/dist/index.d.ts'] };
    expect(declaredBy('readFile:packages/liteship/dist/index.d.ts', manifest, context)).toBe(true);
    expect(declaredBy('readFile:scripts/check.ts', manifest, context)).toBe(false);
    expect(declaredBy('readFile:fixture.ts', manifest, context)).toBe(true);
  });

  it('kills a facade-manifest mutant that drops the declaration-file dependency', () => {
    const gate = uniqueBuiltIns().find((candidate) => candidate.id === 'gauntlet/facade-export-budget');
    expect(gate).toBeDefined();
    const mutant: Gate = {
      ...gate!,
      access: { outOfIrGlobs: ['packages/liteship/package.json'] },
    };
    expect(undeclaredReads(mutant, gate!.fixtures.green.context)).toContain(
      'readFile:packages/liteship/dist/index.d.ts',
    );
  });
});

describe('required fact admission', () => {
  it('rejects a missing required fact before any gate executes', () => {
    let executions = 0;
    const gate: Gate = {
      id: 'gauntlet/__missing-fact-control__',
      level: 'L1',
      describe: 'test-only missing fact control',
      access: { facts: [{ channel: 'benchmarkSubjects', presence: 'required' }] },
      run: () => {
        executions += 1;
        return [];
      },
      fixtures: {
        red: { name: 'red', context: memoryContext({}) },
        green: { name: 'green', context: memoryContext({}) },
        mutation: { describe: 'unused after preflight', mutate: (value) => value },
      },
    };

    expect(() => runGates([gate], memoryContext({}))).toThrow(/requires missing fact channel.*benchmarkSubjects/u);
    expect(executions).toBe(0);
  });
});
