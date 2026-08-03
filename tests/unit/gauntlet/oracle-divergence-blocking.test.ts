/**
 * W1.1 — oracle divergences must have blocking teeth at high-assurance sites.
 *
 * Every coverage-class divergence gate compares a structurally fixed CROSS-class
 * oracle pair. A policy that can emit `error` only for SAME-class pairs is
 * unreachable by construction. These fixtures drive every live consumer through
 * the real engine at an L4 site: each gate must retain blocking authority, emit an
 * error, and block the result.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import {
  LITESHIP_ASSURANCE_MAP,
  earlyReturnDivergenceGate,
  levelOf,
  makeRepoIR,
  memoryContext,
  noDefaultExportDivergenceGate,
  noRequireDivergenceGate,
  noVarDivergenceGate,
  propagateAssuranceLevels,
  runGates,
  symbolOrphanDivergenceGate,
  type Fact,
  type Gate,
  type RepoIR,
  type SymbolId,
} from '@liteship/gauntlet';

const HIGH_ASSURANCE_FILE = 'packages/core/src/graph/dag.ts';
const CONSUMER_FILE = 'packages/x/src/consumer.ts';
const PLACEHOLDER = 'placeholder:no-content-address';

const FACTORY_GATES = [
  { gate: noDefaultExportDivergenceGate, property: 'is-default-export' },
  { gate: noVarDivergenceGate, property: 'var-declaration' },
  { gate: noRequireDivergenceGate, property: 'require-call' },
  { gate: earlyReturnDivergenceGate, property: 'early-return-before-expect' },
] as const;

function regexOnlyFact(property: string): Fact {
  return {
    file: HIGH_ASSURANCE_FILE,
    line: 7,
    property,
    value: true,
    oracleId: 'invariant-regex',
    coverageClass: 'text-only',
  };
}

function factoryDivergenceIR(property: string): RepoIR {
  return makeRepoIR({
    files: [{ id: HIGH_ASSURANCE_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/core' }],
    facts: [regexOnlyFact(property)],
  });
}

function symbolOrphanDivergenceIR(): RepoIR {
  const symbolId: SymbolId = `${HIGH_ASSURANCE_FILE}#orphaned`;
  return makeRepoIR({
    files: [
      { id: HIGH_ASSURANCE_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/core' },
      { id: CONSUMER_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/x' },
    ],
    symbols: [
      {
        id: symbolId,
        name: 'orphaned',
        kind: 'const',
        file: HIGH_ASSURANCE_FILE,
        location: { file: HIGH_ASSURANCE_FILE, line: 7 },
      },
    ],
    refs: new Map([[symbolId, [{ fromFile: CONSUMER_FILE, coverageClass: 'file-proxy-only' as const }]]]),
    facts: [
      {
        file: HIGH_ASSURANCE_FILE,
        line: 7,
        property: 'symbol-orphan',
        value: { name: 'orphaned', isOrphan: true, externalReferenceCount: 0 },
        oracleId: 'ts-language-service',
        coverageClass: 'symbol-evidenced',
      },
    ],
  });
}

function engineResult(gate: Gate, ir: RepoIR) {
  const effectiveLevels = propagateAssuranceLevels(ir, (file) => levelOf(file, LITESHIP_ASSURANCE_MAP));
  return runGates([gate], { ...memoryContext({}), ir }, { effectiveLevels });
}

describe.each(FACTORY_GATES)('$gate.id blocks on an L4 cross-class divergence', ({ gate, property }) => {
  it('emits error end-to-end through the engine', () => {
    const result = engineResult(gate, factoryDivergenceIR(property));
    const finding = result.findings.find((candidate) => candidate.ruleId === gate.id);

    expect(finding?.level).toBe('L4');
    expect(finding?.severity).toBe('error');
    expect(result.outcomes[0]?.authority).toBe('blocking');
    expect(result.blocked).toBe(true);
  });
});

describe('symbolOrphanDivergenceGate blocks on an L4 cross-class divergence', () => {
  it('emits error end-to-end through the engine', () => {
    const result = engineResult(symbolOrphanDivergenceGate, symbolOrphanDivergenceIR());
    const finding = result.findings.find((candidate) => candidate.ruleId === symbolOrphanDivergenceGate.id);

    expect(finding?.level).toBe('L4');
    expect(finding?.severity).toBe('error');
    expect(result.outcomes[0]?.authority).toBe('blocking');
    expect(result.blocked).toBe(true);
  });
});
