/**
 * doctor/summary — verdict aggregation + TTY presentation. Pure: folds the
 * per-check bearings into one verdict and renders the summary string. No fs,
 * no spawn, no process I/O. Color is forced OFF (NO_COLOR) so the rendered
 * string is deterministic and assertable byte-for-byte on structure.
 *
 * THE LAWS:
 *  - aggregate: any `fail` ⇒ blocked; else any `warn` ⇒ caution; else ready.
 *    (fail dominates warn dominates ok — monotone severity fold.)
 *  - prettySummary: header + one row per check; a hint row only for non-ok
 *    checks that carry a hint; an "Applied N fix(es)" block iff fixes ran;
 *    a closing verdict sentence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { aggregate, prettySummary } from '../../../../../packages/cli/src/commands/doctor/summary.js';
import type { DoctorCheck, DoctorFix } from '../../../../../packages/cli/src/commands/doctor/types.js';

function check(over: Partial<DoctorCheck> & Pick<DoctorCheck, 'status'>): DoctorCheck {
  return { id: 'x.probe', label: 'X', detail: 'detail', ...over };
}

describe('doctor/summary — aggregate()', () => {
  it('all ok ⇒ ready', () => {
    expect(aggregate([check({ status: 'ok' }), check({ status: 'ok' })])).toBe('ready');
  });

  it('any warn (no fail) ⇒ caution', () => {
    expect(aggregate([check({ status: 'ok' }), check({ status: 'warn' })])).toBe('caution');
  });

  it('any fail ⇒ blocked (fail dominates warn)', () => {
    expect(aggregate([check({ status: 'warn' }), check({ status: 'fail' })])).toBe('blocked');
  });

  it('empty check list is ready (vacuously)', () => {
    expect(aggregate([])).toBe('ready');
  });

  it('fail dominates warn dominates ok, for any multiset of bearings', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('ok', 'warn', 'fail') as fc.Arbitrary<DoctorCheck['status']>), (statuses) => {
        const verdict = aggregate(statuses.map((status) => check({ status })));
        if (statuses.includes('fail')) expect(verdict).toBe('blocked');
        else if (statuses.includes('warn')) expect(verdict).toBe('caution');
        else expect(verdict).toBe('ready');
      }),
    );
  });
});

describe('doctor/summary — prettySummary()', () => {
  beforeEach(() => {
    // Force color OFF so the rendered string is deterministic regardless of
    // the runner's TTY / CI / FORCE_COLOR state (two-clock-style determinism
    // for presentation: no ambient env leaks into the asserted output).
    vi.stubEnv('NO_COLOR', '1');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the header, one row per check, and the verdict sentence', () => {
    const out = prettySummary(
      [
        check({ id: 'node.version', label: 'Node.js', status: 'ok', detail: 'v22.4.0' }),
        check({ id: 'pnpm.version', label: 'pnpm', status: 'ok', detail: '10.0.0' }),
      ],
      'ready',
    );
    expect(out).toContain('czap doctor');
    expect(out).toContain('Node.js');
    expect(out).toContain('v22.4.0');
    expect(out).toContain('pnpm');
    expect(out).toContain('ready to sail');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('renders a hint row for a non-ok check that carries a hint', () => {
    const out = prettySummary(
      [check({ id: 'git.hooks', label: 'git hooks', status: 'warn', detail: 'not rigged', hint: 'rig it now' })],
      'caution',
    );
    expect(out).toContain('not rigged');
    expect(out).toContain('rig it now');
    expect(out).toContain('caution');
  });

  it('does NOT render a hint row for an ok check even if it has a hint', () => {
    const out = prettySummary(
      [check({ id: 'cloudflare.csp', label: 'CSP', status: 'ok', detail: 'advisory', hint: 'secret hint' })],
      'ready',
    );
    expect(out).not.toContain('secret hint');
  });

  it('renders the blocked verdict sentence', () => {
    const out = prettySummary([check({ status: 'fail', detail: 'broken' })], 'blocked');
    expect(out).toContain('blocked');
    expect(out).toContain('fix the failures');
  });

  it('renders the Applied fixes block when fixes ran (lines 50-54)', () => {
    const fixes: readonly DoctorFix[] = [
      { id: 'build', action: 'pnpm run build', status: 'applied' },
      { id: 'git.hooks', action: 'link pre-commit', status: 'failed', detail: 'exit 1' },
    ];
    const out = prettySummary([check({ status: 'ok' })], 'ready', fixes);
    expect(out).toContain('Applied 2 fix(es):');
    expect(out).toContain('build: pnpm run build');
    expect(out).toContain('git.hooks: link pre-commit');
    expect(out).toContain('(exit 1)');
  });

  it('omits the fixes block when the fixes array is empty', () => {
    const out = prettySummary([check({ status: 'ok' })], 'ready', []);
    expect(out).not.toContain('Applied');
  });

  it('emits ANSI codes when color is enabled (FORCE_COLOR path)', () => {
    // NO_COLOR must be truly unset (not '') — the spec treats a present-but-
    // empty NO_COLOR as "disabled", which would mask the FORCE_COLOR path.
    vi.stubEnv('NO_COLOR', undefined);
    vi.stubEnv('FORCE_COLOR', '1');
    const out = prettySummary([check({ id: 'node.version', label: 'Node.js', status: 'ok', detail: 'v22' })], 'ready');
    // The ANSI escape sequence opens with the ESC control char (0x1b).
    expect(out.includes(String.fromCharCode(0x1b))).toBe(true);
  });
});
