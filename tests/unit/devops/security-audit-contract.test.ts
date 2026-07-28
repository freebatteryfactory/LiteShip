import { describe, expect, it } from 'vitest';
import {
  blockingAuditFindings,
  parsePnpmAuditReceipt,
  securityMinimumFindings,
  versionAtLeast,
} from '../../../scripts/lib/security-audit-contract.js';

const root = (override: string) => ({ pnpm: { overrides: { postcss: override } } });
const lock = (version: string) => `lockfileVersion: '9.0'\n\npackages:\n\n  postcss@${version}:\n    resolution: {}\n`;
const receipt = (high: number, critical: number) => ({
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical } },
});

describe('security audit contract', () => {
  it('admits the fixed PostCSS floor and every newer patch/minor', () => {
    expect(versionAtLeast('8.5.18', '8.5.18')).toBe(true);
    expect(versionAtLeast('8.6.0', '8.5.18')).toBe(true);
    expect(securityMinimumFindings(root('>=8.5.18 <9'), lock('8.5.18'))).toEqual([]);
  });

  it('reds the historical vulnerable override and every vulnerable resolved instance', () => {
    expect(securityMinimumFindings(root('>=8.5.10 <9'), lock('8.5.15'))).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.15; require >=8.5.18',
      'root postcss override must require >=8.5.18',
    ]);
  });

  it('blocks high/critical findings while preserving lower-severity evidence', () => {
    expect(blockingAuditFindings(parsePnpmAuditReceipt(receipt(0, 0)))).toEqual([]);
    expect(blockingAuditFindings(parsePnpmAuditReceipt(receipt(2, 1)))).toEqual([
      '2 high-severity vulnerability finding(s)',
      '1 critical-severity vulnerability finding(s)',
    ]);
  });

  it('fails closed on a malformed or incomplete registry receipt', () => {
    expect(() => parsePnpmAuditReceipt({ metadata: { vulnerabilities: { high: 0, critical: 0 } } })).toThrow(
      /info count/u,
    );
  });

  it('accepts a stricter supported lower bound without pinning one patch forever', () => {
    expect(securityMinimumFindings(root('>=8.6.0 <9'), lock('8.6.2'))).toEqual([]);
  });

  it('rejects a safe installed version when the root override can still select a vulnerable one', () => {
    expect(securityMinimumFindings(root('>=8.5.10 <9'), lock('8.5.18'))).toEqual([
      'root postcss override must require >=8.5.18',
    ]);
  });

  it('rejects a safe override when any resolved PostCSS instance remains vulnerable', () => {
    const mixedLock = [
      "lockfileVersion: '9.0'",
      '',
      'packages:',
      '',
      '  postcss@8.5.18:',
      '    resolution: {}',
      '  postcss@8.5.17:',
      '    resolution: {}',
      '',
      'snapshots:',
      '',
      '  postcss@8.5.17: {}',
    ].join('\n');
    expect(securityMinimumFindings(root('>=8.5.18 <9'), mixedLock)).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.17; require >=8.5.18',
    ]);
  });

  it('recognizes peer-qualified pnpm package keys', () => {
    const peerQualifiedLock = [
      "lockfileVersion: '9.0'",
      '',
      'packages:',
      '',
      '  postcss@8.5.17(peer@1.0.0):',
      '    resolution: {}',
    ].join('\n');
    expect(securityMinimumFindings(root('>=8.5.18 <9'), peerQualifiedLock)).toEqual([
      'pnpm lockfile resolves vulnerable postcss 8.5.17; require >=8.5.18',
    ]);
  });

  it('does not treat comments or dependency values as resolved package keys', () => {
    const noPackageKey = [
      "lockfileVersion: '9.0'",
      '',
      'packages:',
      '',
      '  example@1.0.0:',
      '    dependencies:',
      '      postcss: 8.5.18',
      '  # postcss@8.5.18:',
    ].join('\n');
    expect(securityMinimumFindings(root('>=8.5.18 <9'), noPackageKey)).toEqual([
      'pnpm lockfile contains no resolved postcss package',
    ]);
  });

  it('rejects missing audit structure at every admission boundary', () => {
    for (const candidate of [null, [], {}, { metadata: null }, { metadata: [] }, { metadata: {} }]) {
      expect(() => parsePnpmAuditReceipt(candidate)).toThrow(TypeError);
    }
  });

  it('ignores lower severities for release blocking while retaining validated counts', () => {
    const parsed = parsePnpmAuditReceipt({
      metadata: { vulnerabilities: { info: 7, low: 5, moderate: 3, high: 0, critical: 0 } },
    });
    expect(parsed.metadata.vulnerabilities).toEqual({ info: 7, low: 5, moderate: 3, high: 0, critical: 0 });
    expect(blockingAuditFindings(parsed)).toEqual([]);
  });
});
