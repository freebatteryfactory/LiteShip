/**
 * The HOST traceability state machine (`packages/cli/src/lib/traceability.ts`) —
 * the deterministic lifecycle fold that parses `traceability/*.yaml`, scans the
 * corpus for `// PROVES:` headers, and resolves each invariant's state.
 *
 * Pins (over an isolated temp repo so the corpus + ledger are fully controlled):
 *  - DETERMINISM: the same ledger + corpus + injected date → byte-identical facts.
 *  - the lifecycle: PROVEN / WAIVED / EXPIRED / UNTRACED resolve correctly.
 *  - the TWO-CLOCK LAW: waiver expiry is a wallClock calendar comparison — flipping
 *    the injected date across the expiry flips WAIVED → EXPIRED.
 *  - the head-probe LAW: a ledger claim with no matching live header is an
 *    `unbacked-claim` divergence; a header naming an undeclared INV is an
 *    `undeclared-proof` divergence; a ledger ref to an absent test is `missing-test`.
 *  - content-addressing: a resolved-state change re-addresses the ledger.
 *  - FAIL-LOUD: a malformed ledger / a trace for an undeclared invariant throws.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isTaggedError } from '@czap/error';
import { buildTraceabilityFacts } from '../../../../packages/cli/src/lib/traceability.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-trace-'));
  mkdirSync(join(root, 'traceability'), { recursive: true });
  mkdirSync(join(root, 'tests', 'property'), { recursive: true });
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeInvariants(body: string): void {
  writeFileSync(join(root, 'traceability', 'invariants.yaml'), body, 'utf8');
}
function writeLedger(body: string): void {
  writeFileSync(join(root, 'traceability', 'testing-ledger.yaml'), body, 'utf8');
}
function writeTest(rel: string, proves: string): void {
  writeFileSync(join(root, rel), `// PROVES: ${proves}\nimport { test } from 'vitest';\n`, 'utf8');
}

const DATE = new Date('2026-06-22T00:00:00.000Z');

describe('traceability state machine — the lifecycle fold', () => {
  it('resolves PROVEN when the claimed test exists and carries a matching header', () => {
    writeInvariants(
      `invariants:\n  - id: INV-A\n    law: "a law"\n    level: L4\n    category: crdt\n`,
    );
    writeLedger(
      `traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::proves a"\n`,
    );
    writeTest('tests/property/a.test.ts', 'INV-A');
    const facts = buildTraceabilityFacts(root, DATE);
    expect(facts.invariants).toHaveLength(1);
    expect(facts.invariants[0]!.state._tag).toBe('proven');
    expect(facts.divergences).toHaveLength(0);
  });

  it('resolves WAIVED before expiry and EXPIRED after — the two-clock calendar comparison', () => {
    writeInvariants(`invariants:\n  - id: INV-W\n    law: "a law"\n    level: L4\n    category: crdt\n`);
    writeLedger(
      `traces:\n  - id: INV-W\n    waiver:\n      owner: o\n      justification: "deferred"\n      expiry: "2026-12-31"\n`,
    );
    const before = buildTraceabilityFacts(root, new Date('2026-06-22'));
    expect(before.invariants[0]!.state._tag).toBe('waived');
    const after = buildTraceabilityFacts(root, new Date('2027-01-01'));
    expect(after.invariants[0]!.state._tag).toBe('expired');
    // The resolved-state change re-addresses the ledger (content-addressing bites).
    expect(before.ledgerAddress).not.toBe(after.ledgerAddress);
  });

  it('resolves UNTRACED when an invariant is declared with no trace entry', () => {
    writeInvariants(`invariants:\n  - id: INV-U\n    law: "a law"\n    level: L4\n    category: meta\n`);
    writeLedger(`traces:\n  - id: INV-U\n    waiver:\n      owner: o\n      justification: "x"\n      expiry: "2999-01-01"\n`);
    // Remove the trace by re-writing an unrelated (but valid) ledger: declare a 2nd
    // invariant and trace ONLY it, leaving INV-U untraced.
    writeInvariants(
      `invariants:\n  - id: INV-U\n    law: "a law"\n    level: L4\n    category: meta\n  - id: INV-T\n    law: "traced"\n    level: L4\n    category: meta\n`,
    );
    writeLedger(`traces:\n  - id: INV-T\n    tests:\n      - "tests/property/t.test.ts::t"\n`);
    writeTest('tests/property/t.test.ts', 'INV-T');
    const facts = buildTraceabilityFacts(root, DATE);
    const u = facts.invariants.find((i) => i.id === 'INV-U')!;
    expect(u.state._tag).toBe('untraced');
  });
});

describe('traceability state machine — determinism + content-addressing', () => {
  it('is deterministic: same ledger + corpus + date → byte-identical facts', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n`);
    writeTest('tests/property/a.test.ts', 'INV-A');
    const a = buildTraceabilityFacts(root, DATE);
    const b = buildTraceabilityFacts(root, DATE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.ledgerAddress).toMatch(/^fnv1a:[0-9a-f]+$/);
  });
});

describe('traceability state machine — the head-probe / bidirectional-trace divergences', () => {
  it('UNBACKED-CLAIM: a ledger ref whose test exists but does not name the invariant', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n`);
    // The test exists but its header names a DIFFERENT invariant.
    writeTest('tests/property/a.test.ts', 'INV-OTHER');
    const facts = buildTraceabilityFacts(root, DATE);
    expect(facts.divergences.some((d) => d.kind === 'unbacked-claim' && d.invariantId === 'INV-A')).toBe(true);
    // …and the invariant falls to UNTRACED (never a silent green on a stale claim).
    expect(facts.invariants[0]!.state._tag).toBe('untraced');
  });

  it('MISSING-TEST: a ledger ref pointing at a test absent from the corpus', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-A\n    tests:\n      - "tests/property/ghost.test.ts::a"\n`);
    const facts = buildTraceabilityFacts(root, DATE);
    expect(facts.divergences.some((d) => d.kind === 'missing-test' && d.invariantId === 'INV-A')).toBe(true);
  });

  it('IGNORES a PROVES token that is NOT a leading comment header or NOT an INV-* id (no phantom divergence)', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n`);
    // The file carries the REAL header AND prose/string mentions of the token that
    // must NOT register (the false-positive the real corpus scan caught): a
    // backtick-wrapped doc mention, a mid-line string literal, and a non-INV tail.
    writeFileSync(
      join(root, 'tests/property/a.test.ts'),
      [
        '// PROVES: INV-A',
        '// This file scans for `// PROVES:` headers and writes `// PROVES: ${x}` literals.',
        "const s = 'prefix // PROVES: NOT-AN-INV-ID, also-bogus';",
        "import { test } from 'vitest';",
      ].join('\n'),
      'utf8',
    );
    const facts = buildTraceabilityFacts(root, DATE);
    // Only the real INV-A header registered → INV-A is proven, ZERO divergences.
    expect(facts.invariants[0]!.state._tag).toBe('proven');
    expect(facts.divergences).toHaveLength(0);
  });

  it('UNDECLARED-PROOF: a header naming an INV the register never declared', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n`);
    writeTest('tests/property/a.test.ts', 'INV-A, INV-GHOST');
    const facts = buildTraceabilityFacts(root, DATE);
    expect(facts.divergences.some((d) => d.kind === 'undeclared-proof' && d.invariantId === 'INV-GHOST')).toBe(true);
    // INV-A still resolves proven (its own header is present).
    expect(facts.invariants.find((i) => i.id === 'INV-A')!.state._tag).toBe('proven');
  });
});

describe('traceability state machine — fail-loud parsing', () => {
  it('throws a tagged error when a trace references an undeclared invariant', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(`traces:\n  - id: INV-NOPE\n    tests:\n      - "tests/property/a.test.ts::a"\n`);
    try {
      buildTraceabilityFacts(root, DATE);
      expect.unreachable('expected a tagged throw');
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });

  it('throws when a trace entry carries BOTH tests and a waiver', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n    category: crdt\n`);
    writeLedger(
      `traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n    waiver:\n      owner: o\n      justification: "x"\n      expiry: "2999-01-01"\n`,
    );
    expect(() => buildTraceabilityFacts(root, DATE)).toThrow();
  });

  it('throws when an invariant entry is missing a required field', () => {
    writeInvariants(`invariants:\n  - id: INV-A\n    law: "a"\n    level: L4\n`); // no category
    writeLedger(`traces:\n  - id: INV-A\n    waiver:\n      owner: o\n      justification: "x"\n      expiry: "2999-01-01"\n`);
    expect(() => buildTraceabilityFacts(root, DATE)).toThrow();
  });

  it('throws when the ledger files are absent (fail-closed, never a silent empty trace)', () => {
    // No ledger files written.
    expect(() => buildTraceabilityFacts(root, DATE)).toThrow();
  });
});
