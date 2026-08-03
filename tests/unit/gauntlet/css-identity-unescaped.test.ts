/**
 * The CSS-identity surface has a BLOCKING consumer: an unescaped interpolation
 * fact folded from the IR is an error finding, never an unread record.
 *
 * Codex review on PR #197, confirmed P1: `cssIdentitySurfaceOracle` emitted
 * `css-identity-unescaped` facts that no gate or audit pass consumed —
 * production without consumption, the scope-vs-claim failure mode this whole
 * batch exists to kill.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { LITESHIP_IR_GATES, cssIdentityUnescapedGate, verifyGate } from '@liteship/gauntlet';

describe('the css-identity-unescaped fact has a blocking consumer', () => {
  it('the gate is enrolled in the IR-host composition', () => {
    expect(LITESHIP_IR_GATES.map((gate) => gate.id)).toContain('gauntlet/css-identity-unescaped');
  });

  it('an unescaped fact folds into a BLOCKING error finding carrying the site evidence', () => {
    const findings = cssIdentityUnescapedGate.run(cssIdentityUnescapedGate.fixtures!.red.context);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'gauntlet/css-identity-unescaped',
      severity: 'error',
      location: { file: 'bad.ts', line: 341 },
    });
    expect(findings[0]!.detail).toContain('component.name');
  });

  it('anchor receipts do not fold, and the property-blind mutant is killed by the ratchet', () => {
    expect(cssIdentityUnescapedGate.run(cssIdentityUnescapedGate.fixtures!.green.context)).toEqual([]);
    expect(() => verifyGate(cssIdentityUnescapedGate)).not.toThrow();
  });
});
