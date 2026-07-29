/**
 * Dotted-subcommand arity — the zero-option identities refuse trailing args.
 *
 * The defect class (PR #187 review, Greptile T-Rex-verified): `check
 * invariants --plan` ran the invariant scan and exited 0 while silently
 * discarding `--plan` — an automation typo received a successful receipt for
 * the WRONG gate. The law: every dotted identity with an empty input schema
 * (`audit.floor`, `check.invariants`, `capsule.gate`) refuses any trailing
 * argument with a usage error instead of running.
 *
 * Also pins the REBUTTED sibling claim: a value-taking flag's value is never
 * misread as a subcommand, because `positional()` reads argv[0] only —
 * `audit --profile floor` keeps `floor` as the profile value.
 */
import { describe, expect, it } from 'vitest';
import { run } from '../../../packages/cli/src/dispatch.js';
import { positional } from '../../../packages/cli/src/internal/argv.js';
import { captureCli } from '../../integration/cli/capture.js';

describe('dotted subcommands refuse trailing arguments (PR #187 review)', () => {
  it('check invariants rejects every recognized parent option instead of discarding it', async () => {
    for (const extra of ['--plan', '--profile', '--cure', '--ir']) {
      const { exit, stderr } = await captureCli(async () => run(['check', 'invariants', extra]));
      expect(exit, `check invariants ${extra} must refuse`).toBe(1);
      expect(stderr).toContain('check invariants takes no options');
    }
  });

  it('audit floor rejects trailing options instead of discarding them', async () => {
    const { exit, stderr } = await captureCli(async () => run(['audit', 'floor', '--profile', 'x']));
    expect(exit).toBe(1);
    expect(stderr).toContain('audit floor takes no options');
  });

  it('capsule gate rejects trailing arguments instead of discarding them', async () => {
    const { exit, stderr } = await captureCli(async () => run(['capsule', 'gate', 'extra']));
    expect(exit).toBe(1);
    expect(stderr).toContain('capsule gate takes no options');
  });

  it('a flag value is never a subcommand: positional() reads argv[0] only', () => {
    // `liteship audit --profile floor`: rest[0] is `--profile`, so positional()
    // is undefined and the floor branch cannot fire — `floor` stays the
    // profile value. This is the primitive that refutes the misdispatch claim.
    expect(positional(['--profile', 'floor'])).toBeUndefined();
    expect(positional(['floor', '--profile', 'x'])).toBe('floor');
  });
});
