/**
 * The early-return oracle-divergence gate: the parser-backed host oracle and
 * lean token oracle must report the same `return;` site in an individual test.
 * Suite callbacks are outside the property by construction through TEST_ROOTS.
 *
 * @module
 */

import type { Gate } from '../gate.js';
import { makeOracleDivergenceGate } from './make-oracle-divergence-gate.js';

/** Triangulates parser and token observations of early returns before assertions. */
export const earlyReturnDivergenceGate: Gate = makeOracleDivergenceGate({
  gateId: 'gauntlet/early-return-divergence',
  property: 'early-return-before-expect',
  excludedMarkerProperty: 'early-return-check-excluded',
  level: 'L2',
  subject: 'early return before an assertion',
  describe:
    'Reports a divergence when the parser-backed and lean token oracles disagree on an early return before expect in an individual test callback.',
  astSawWhy:
    'the parser-backed oracle resolved an individual test callback or control-flow shape that the lean token oracle did not recognize',
  astSawStep:
    'Prefer the parser-backed result and extend the lean fallback only when the same grammar can be recognized without weakening its fail-closed boundary.',
});
