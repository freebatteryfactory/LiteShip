/**
 * doctor — verdict aggregation + presentation. Pure: folds the per-check
 * bearings into one verdict, and renders the TTY summary string. No fs, no
 * spawn, no process I/O (the caller decides where the string goes).
 *
 * @module
 */

import { arrow, bearingGlyph, color, colorEnabled, header } from '../../lib/ansi.js';
import type { DoctorCheck, DoctorFix, DoctorVerdict } from './types.js';

export function aggregate(checks: readonly DoctorCheck[]): DoctorVerdict {
  if (checks.some((c) => c.status === 'fail')) return 'blocked';
  if (checks.some((c) => c.status === 'warn')) return 'caution';
  return 'ready';
}

const VERDICT_SENTENCE: Record<DoctorVerdict, string> = {
  ready: 'Environment check: ready — you can proceed.',
  caution: 'Environment check: caution — non-blocking warnings, but you can proceed.',
  blocked: 'Environment check: blocked — fix the failures before proceeding.',
};

const VERDICT_COLOR: Record<DoctorVerdict, 'green' | 'yellow' | 'red'> = {
  ready: 'green',
  caution: 'yellow',
  blocked: 'red',
};

export function prettySummary(
  checks: readonly DoctorCheck[],
  verdict: DoctorVerdict,
  fixes?: readonly DoctorFix[],
): string {
  const on = colorEnabled();
  const lines: string[] = [];
  lines.push(header('liteship doctor — preflight environment check', on));
  lines.push('');
  const widest = Math.max(...checks.map((c) => c.label.length));
  for (const c of checks) {
    const glyph = bearingGlyph(c.status, on);
    const pad = c.label.padEnd(widest, ' ');
    const detail = c.status === 'ok' ? color('dim', c.detail, on) : c.detail;
    lines.push(`  ${glyph}  ${pad}  ${detail}`);
    if (c.hint && c.status !== 'ok') {
      lines.push(`      ${' '.repeat(widest)}  ${arrow(on)} ${color('dim', c.hint, on)}`);
    }
  }
  if (fixes && fixes.length > 0) {
    lines.push('');
    lines.push(color('cyan', `Applied ${fixes.length} fix(es):`, on));
    for (const f of fixes) {
      const glyph = bearingGlyph(f.status === 'applied' ? 'ok' : 'fail', on);
      lines.push(`  ${glyph}  ${f.id}: ${f.action}${f.detail ? color('dim', `  (${f.detail})`, on) : ''}`);
    }
  }
  lines.push('');
  lines.push(color(VERDICT_COLOR[verdict], VERDICT_SENTENCE[verdict], on));
  return lines.join('\n') + '\n';
}
