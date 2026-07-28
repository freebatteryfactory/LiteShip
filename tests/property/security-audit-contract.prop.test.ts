import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SECURITY_MINIMUMS,
  blockingAuditFindings,
  parsePnpmAuditReceipt,
  securityMinimumFindings,
  versionAtLeast,
} from '../../scripts/lib/security-audit-contract.js';

const versionArbitrary = fc
  .tuple(
    fc.integer({ min: 0, max: 20 }),
    fc.integer({ min: 0, max: 30 }),
    fc.integer({ min: 0, max: 50 }),
  )
  .map(([major, minor, patch]) => ({ major, minor, patch, text: `${major}.${minor}.${patch}` }));

const receiptArbitrary = fc.record({
  info: fc.nat({ max: 50 }),
  low: fc.nat({ max: 50 }),
  moderate: fc.nat({ max: 50 }),
  high: fc.nat({ max: 50 }),
  critical: fc.nat({ max: 50 }),
});

function compareVersion(
  left: { readonly major: number; readonly minor: number; readonly patch: number },
  right: { readonly major: number; readonly minor: number; readonly patch: number },
): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function root(override: unknown): unknown {
  return { pnpm: { overrides: { postcss: override } } };
}

function lockfile(versions: readonly string[]): string {
  return [
    "lockfileVersion: '9.0'",
    '',
    'packages:',
    '',
    ...versions.flatMap((version) => [`  postcss@${version}:`, '    resolution: {}']),
    '',
  ].join('\n');
}

describe('security audit contract properties', () => {
  it('orders stable semantic versions lexicographically by numeric component', () => {
    fc.assert(
      fc.property(versionArbitrary, versionArbitrary, (actual, minimum) => {
        expect(versionAtLeast(actual.text, minimum.text)).toBe(compareVersion(actual, minimum) >= 0);
      }),
      { numRuns: 500 },
    );
  });

  it('preserves stable ordering for build and prerelease suffixes', () => {
    fc.assert(
      fc.property(
        versionArbitrary,
        fc.constantFrom('-security.0', '-rc.1', '+build.9'),
        (version, suffix) => {
          expect(versionAtLeast(`${version.text}${suffix}`, version.text)).toBe(true);
          expect(versionAtLeast(version.text, `${version.text}${suffix}`)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('fails closed for strings outside the supported stable-version grammar', () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => !/^\d+\.\d+\.\d+(?:[-+].*)?$/u.test(value)),
        (value) => {
          expect(versionAtLeast(value, SECURITY_MINIMUMS.postcss)).toBe(false);
          expect(versionAtLeast(SECURITY_MINIMUMS.postcss, value)).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('admits every explicit major-bounded override whose lower bound is safe', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 18, max: 80 }),
        fc.array(fc.integer({ min: 18, max: 80 }), { minLength: 1, maxLength: 8 }),
        (lowerPatch, installedPatches) => {
          const versions = installedPatches.map((patch) => `8.5.${patch}`);
          expect(securityMinimumFindings(root(`>=8.5.${lowerPatch} <9`), lockfile(versions))).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects every installed version below the floor regardless of order or duplication', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 17 }), { minLength: 1, maxLength: 8 }),
        fc.shuffledSubarray(['8.5.18', '8.6.0', '9.0.0'], { minLength: 0 }),
        (vulnerablePatches, safeVersions) => {
          const vulnerableVersions = vulnerablePatches.map((patch) => `8.5.${patch}`);
          const versions = [...safeVersions, ...vulnerableVersions, ...vulnerableVersions];
          const findings = securityMinimumFindings(root('>=8.5.18 <9'), lockfile(versions));
          for (const version of new Set(vulnerableVersions)) {
            expect(findings).toContain(`pnpm lockfile resolves vulnerable postcss ${version}; require >=8.5.18`);
          }
          expect(findings.filter((finding) => finding.includes('lockfile resolves'))).toHaveLength(
            new Set(vulnerableVersions).size,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects override text that merely embeds the required comparator', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '>=8.5.10 || >=8.5.18',
          '>=8.5.18',
          '>=8.5.18 || <8.5.18',
          'prefix>=8.5.18 <9',
          '>=8.5.18 <9 suffix',
          '>=8.5.18 <=9',
        ),
        (override) => {
          expect(securityMinimumFindings(root(override), lockfile(['8.5.18']))).toContain(
            'root postcss override must require >=8.5.18',
          );
        },
      ),
    );
  });

  it('projects only high and critical audit counts into blocking findings', () => {
    fc.assert(
      fc.property(receiptArbitrary, (counts) => {
        const parsed = parsePnpmAuditReceipt({ metadata: { vulnerabilities: counts } });
        const findings = blockingAuditFindings(parsed);
        expect(findings).toEqual([
          ...(counts.high === 0 ? [] : [`${counts.high} high-severity vulnerability finding(s)`]),
          ...(counts.critical === 0 ? [] : [`${counts.critical} critical-severity vulnerability finding(s)`]),
        ]);
      }),
      { numRuns: 300 },
    );
  });

  it('fails closed for negative, fractional, unsafe, and non-numeric severity counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(-1, -100, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY, '0', null),
        fc.constantFrom('info', 'low', 'moderate', 'high', 'critical'),
        (invalidCount, severity) => {
          const counts: Record<string, unknown> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
          counts[severity] = invalidCount;
          expect(() => parsePnpmAuditReceipt({ metadata: { vulnerabilities: counts } })).toThrow(
            `audit ${severity} count is invalid`,
          );
        },
      ),
    );
  });
});
