import { describe, expect, it } from 'vitest';
import {
  SECURITY_MINIMUMS,
  advisoryFloorFindings,
  blockingAuditFindings,
  parseOverrideEntry,
  parsePnpmAuditReceipt,
  securityMinimumFindings,
  versionAtLeast,
} from '../../../scripts/lib/security-audit-contract.js';

const MINIMUMS: Readonly<Record<string, string>> = SECURITY_MINIMUMS;

/**
 * A synthetic root carrying a satisfying override for EVERY declared minimum,
 * with the named package overridden by the case under test. Derived from
 * `SECURITY_MINIMUMS` rather than hand-listed, so enrolling a new minimum does
 * not silently invalidate every fixture in this file.
 */
function root(subject: string, override: string): unknown {
  const overrides = Object.fromEntries(Object.entries(MINIMUMS).map(([name, minimum]) => [name, `>=${minimum} <99`]));
  overrides[subject] = override;
  return { pnpm: { overrides } };
}

/** A lockfile resolving every declared minimum at its floor, plus the case's own versions. */
function lock(subject: string, ...versions: readonly string[]): string {
  const lines = ["lockfileVersion: '9.0'", '', 'packages:', ''];
  for (const [name, minimum] of Object.entries(MINIMUMS)) {
    if (name === subject) continue;
    lines.push(`  ${name}@${minimum}:`, '    resolution: {}');
  }
  for (const version of versions) lines.push(`  ${subject}@${version}:`, '    resolution: {}');
  return `${lines.join('\n')}\n`;
}

/** A receipt whose counts and advisory list agree, as the parity obligation demands. */
function receipt(advisories: readonly { severity: string; module: string; patched?: string }[]): unknown {
  const counts: Record<string, number> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  const records: Record<string, unknown> = {};
  advisories.forEach((advisory, index) => {
    counts[advisory.severity] = (counts[advisory.severity] ?? 0) + 1;
    records[`adv-${index}`] = {
      module_name: advisory.module,
      severity: advisory.severity,
      patched_versions: advisory.patched ?? '>=9.9.9',
      cves: [`CVE-TEST-${index}`],
    };
  });
  return { metadata: { vulnerabilities: counts }, advisories: records };
}

describe('security audit contract', () => {
  it('admits the fixed PostCSS floor and every newer patch/minor', () => {
    expect(versionAtLeast('8.5.18', '8.5.18')).toBe(true);
    expect(versionAtLeast('8.6.0', '8.5.18')).toBe(true);
    expect(securityMinimumFindings(root('postcss', '>=8.5.18 <9'), lock('postcss', '8.5.18'))).toEqual([]);
  });

  it('reds the historical vulnerable override and every vulnerable resolved instance', () => {
    expect(securityMinimumFindings(root('postcss', '>=8.5.10 <9'), lock('postcss', '8.5.15'))).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.15; require >=8.5.18',
      'root override "postcss" floors postcss at 8.5.10; require >=8.5.18',
    ]);
  });

  it('accepts a stricter supported lower bound without pinning one patch forever', () => {
    expect(securityMinimumFindings(root('postcss', '>=8.6.0 <9'), lock('postcss', '8.6.2'))).toEqual([]);
  });

  it('rejects a safe installed version when the root override can still select a vulnerable one', () => {
    expect(securityMinimumFindings(root('postcss', '>=8.5.10 <9'), lock('postcss', '8.5.18'))).toEqual([
      'root override "postcss" floors postcss at 8.5.10; require >=8.5.18',
    ]);
  });

  it('rejects a safe override when any resolved instance remains vulnerable', () => {
    expect(securityMinimumFindings(root('postcss', '>=8.5.18 <9'), lock('postcss', '8.5.18', '8.5.17'))).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.17; require >=8.5.18',
    ]);
  });

  it('recognizes peer-qualified pnpm package keys', () => {
    const peerQualified = lock('postcss').replace('packages:\n', 'packages:\n\n  postcss@8.5.17(peer@1.0.0):\n');
    expect(securityMinimumFindings(root('postcss', '>=8.5.18 <9'), peerQualified)).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.17; require >=8.5.18',
    ]);
  });

  it('does not treat comments or dependency values as resolved package keys', () => {
    const noPackageKey = `${lock('postcss')}  example@1.0.0:\n    dependencies:\n      postcss: 8.5.18\n  # postcss@8.5.18:\n`;
    expect(securityMinimumFindings(root('postcss', '>=8.5.18 <9'), noPackageKey)).toEqual([
      'pnpm lockfile contains no resolved postcss package',
    ]);
  });

  it('refuses an override outside the readable floor grammar rather than skipping it', () => {
    for (const unreadable of ['^8.5.18', 'latest', '>=8.5.18 || <9', 8, null]) {
      const findings = securityMinimumFindings(root('postcss', unreadable as string), lock('postcss', '8.5.18'));
      expect(findings).toContain(
        `root override "postcss" is outside the readable floor grammar (${JSON.stringify(unreadable)})`,
      );
    }
  });

  it('resolves pathed, scoped, and major-selected override keys to the package they govern', () => {
    expect(parseOverrideEntry('picomatch@2', '>=2.3.2 <3')).toMatchObject({ packageName: 'picomatch', major: 2 });
    expect(parseOverrideEntry('parent>@scope/child', '>=1.0.0 <2')).toMatchObject({
      packageName: '@scope/child',
      major: null,
    });
    expect(parseOverrideEntry('@remotion/*', '4.0.484')).toMatchObject({ wildcard: true, lowerBound: '4.0.484' });
    expect(parseOverrideEntry('postcss', '>=8.5.18 <9')?.wildcard).toBe(false);
  });

  it('blocks high/critical advisories and names the module, CVE, and closing floor', () => {
    expect(blockingAuditFindings(parsePnpmAuditReceipt(receipt([])))).toEqual([]);
    expect(
      blockingAuditFindings(
        parsePnpmAuditReceipt(receipt([{ severity: 'high', module: 'undici', patched: '>=7.29.0' }])),
      ),
    ).toEqual(['undici — high (CVE-TEST-0); fixed in >=7.29.0 [advisory adv-0]']);
  });

  it('ignores lower severities for release blocking while retaining validated counts', () => {
    const parsed = parsePnpmAuditReceipt(
      receipt([
        { severity: 'moderate', module: 'left' },
        { severity: 'low', module: 'right' },
      ]),
    );
    expect(parsed.metadata.vulnerabilities.moderate).toBe(1);
    expect(blockingAuditFindings(parsed)).toEqual([]);
  });

  it('fails closed when the severity counts and the advisory list disagree', () => {
    expect(() =>
      parsePnpmAuditReceipt({
        metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 3, critical: 0 } },
        advisories: {},
      }),
    ).toThrow(/claims 3 high finding\(s\) but lists 0/u);
  });

  it('fails closed on a malformed or incomplete registry receipt', () => {
    expect(() => parsePnpmAuditReceipt({ metadata: { vulnerabilities: { high: 0, critical: 0 } } })).toThrow(
      /info count/u,
    );
    for (const candidate of [null, [], {}, { metadata: null }, { metadata: [] }, { metadata: {} }]) {
      expect(() => parsePnpmAuditReceipt(candidate)).toThrow(TypeError);
    }
  });

  it('refuses an advisory whose module declares no security minimum', () => {
    const parsed = parsePnpmAuditReceipt(receipt([{ severity: 'high', module: 'newcomer', patched: '>=2.0.0' }]));
    expect(advisoryFloorFindings(parsed, root('postcss', '>=8.5.18 <9'))).toEqual([
      'newcomer carries advisory adv-0 but declares no security minimum; require >=2.0.0',
    ]);
  });

  it('refuses a declared minimum that the live advisory has already outrun', () => {
    const parsed = parsePnpmAuditReceipt(receipt([{ severity: 'high', module: 'postcss', patched: '>=9.1.0' }]));
    expect(advisoryFloorFindings(parsed, root('postcss', '>=8.5.18 <9'))).toContain(
      `postcss declares minimum ${MINIMUMS['postcss']}; advisory adv-0 requires >=9.1.0`,
    );
  });

  it('reports an unpatched advisory as uncloseable by a floor rather than silently passing', () => {
    const parsed = parsePnpmAuditReceipt({
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
      advisories: {
        'adv-x': { module_name: 'postcss', severity: 'high', patched_versions: '<0.0.0', cves: [] },
      },
    });
    expect(advisoryFloorFindings(parsed, root('postcss', '>=8.5.18 <9'))).toEqual([
      'postcss advisory adv-x has no patched release; a floor cannot close it',
    ]);
  });
});
