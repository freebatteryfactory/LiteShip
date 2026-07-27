import { describe, it, expect } from 'vitest';
import { classifyBenchSource, benchHonestyError } from '@liteship/core/harness';

// Pins the real-vs-placeholder semantics the capsule:verify receipt is built
// on. The integration test derives its expected receipt from this classifier,
// so this is the one place that asserts the classification against literal
// sources rather than generated files.
describe('classifyBenchSource', () => {
  it('classifies a bench with an executable closure body as real', () => {
    const src = [
      "import { bench } from 'vitest';",
      "bench('demo — decode throughput', async () => {",
      '  await cap.derive(bytes);',
      '}, { time: 500 });',
    ].join('\n');
    expect(classifyBenchSource(src)).toBe('real');
  });

  it('classifies a comment-only closure body as placeholder', () => {
    const src = [
      "import { bench } from 'vitest';",
      "bench('demo — decode throughput', () => {",
      '  // TODO: invoke the derive handler (harness-handlers epic)',
      '  /* placeholder until real invocations land */',
      '}, { time: 500 });',
    ].join('\n');
    expect(classifyBenchSource(src)).toBe('placeholder');
  });

  it('classifies an empty closure body as placeholder', () => {
    expect(classifyBenchSource("bench('x', () => {});")).toBe('placeholder');
  });

  it('classifies a file with no bench call as placeholder', () => {
    expect(classifyBenchSource('// GENERATED — no benches yet\n')).toBe('placeholder');
  });

  it('one real closure among placeholders makes the file real', () => {
    const src = ["bench('a', () => {", '  // comment only', '});', "bench('b', () => {", '  doWork();', '});'].join(
      '\n',
    );
    expect(classifyBenchSource(src)).toBe('real');
  });

  it('survives nested braces in the body (truncated capture is still non-empty)', () => {
    const src = "bench('n', () => { if (x) { y(); } });";
    expect(classifyBenchSource(src)).toBe('real');
  });
});

// The gate the capsule:verify bench lane earns its blocking authority from: a
// bench is honest iff it is a REAL measurement, or a TYPED not-applicable
// exemption (marker line + premise-guard body + a matching manifest reason).
// Everything else — a comment-only placeholder, or marker↔manifest drift — fails.
describe('benchHonestyError', () => {
  const NA = '// BENCH-NOT-APPLICABLE: spawns an external test process; no pure core';
  const NA_REASON = 'spawns an external test process; no pure core';
  const guardBody = "bench('demo', () => { if (!structuralFact) throw new Error('premise'); });";

  it('REAL bench (real body, no marker, no exemption) is honest → null', () => {
    expect(benchHonestyError('demo', "bench('demo', () => { cap.derive(bytes); });", undefined)).toBeNull();
  });

  it('TYPED not-applicable (marker + premise-guard + matching manifest reason) is honest → null', () => {
    expect(benchHonestyError('demo', `${NA}\n${guardBody}`, { reason: NA_REASON })).toBeNull();
  });

  it('normalizes marker and manifest reason whitespace before comparing', () => {
    const marker = '// BENCH-NOT-APPLICABLE: spawns   an external   test process; no pure core';
    expect(
      benchHonestyError('demo', `${marker}\n${guardBody}`, {
        reason: '  spawns an external test process; no pure core  ',
      }),
    ).toBeNull();
  });

  it('LAZY placeholder (comment-only, no marker) FAILS', () => {
    expect(benchHonestyError('demo', "bench('demo', () => { /* nothing */ });", undefined)).toMatch(/measures nothing/);
  });

  it('a marker with NO manifest record FAILS (silent drift)', () => {
    expect(benchHonestyError('demo', `${NA}\n${guardBody}`, undefined)).toMatch(/marker but no manifest/);
  });

  it('a manifest record with NO marker FAILS (silent drift)', () => {
    expect(benchHonestyError('demo', guardBody, { reason: NA_REASON })).toMatch(/benchExemption but no .*marker/);
  });

  it('a marker reason disagreeing with the manifest reason FAILS', () => {
    expect(benchHonestyError('demo', `${NA}\n${guardBody}`, { reason: 'a different reason' })).toMatch(/disagrees/);
  });
});
