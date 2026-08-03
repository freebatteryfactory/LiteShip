import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SECURITY_MINIMUMS,
  advisoryFloorFindings,
  blockingAuditFindings,
  parseOverrideEntry,
  parsePnpmAuditReceipt,
  securityMinimumFindings,
  versionAtLeast,
} from '../../scripts/lib/security-audit-contract.js';

const MINIMUMS: Readonly<Record<string, string>> = SECURITY_MINIMUMS;
const POSTCSS_FLOOR = MINIMUMS['postcss']!;

const versionArbitrary = fc
  .tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 50 }))
  .map(([major, minor, patch]) => ({ major, minor, patch, text: `${major}.${minor}.${patch}` }));

const severityArbitrary = fc.constantFrom('info', 'low', 'moderate', 'high', 'critical');

function compareVersion(
  left: { readonly major: number; readonly minor: number; readonly patch: number },
  right: { readonly major: number; readonly minor: number; readonly patch: number },
): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/** A root satisfying EVERY declared minimum, with `postcss` parameterized. */
function root(override: unknown): unknown {
  const overrides: Record<string, unknown> = Object.fromEntries(
    Object.entries(MINIMUMS).map(([name, minimum]) => [name, `>=${minimum} <99`]),
  );
  overrides['postcss'] = override;
  return { pnpm: { overrides } };
}

/** A lockfile resolving every declared minimum at its floor, with postcss parameterized. */
function lockfile(versions: readonly string[]): string {
  const lines = ["lockfileVersion: '9.0'", '', 'packages:', ''];
  for (const [name, minimum] of Object.entries(MINIMUMS)) {
    if (name === 'postcss') continue;
    lines.push(`  ${name}@${minimum}:`, '    resolution: {}');
  }
  for (const version of versions) lines.push(`  postcss@${version}:`, '    resolution: {}');
  return `${lines.join('\n')}\n`;
}

/** A receipt whose counts agree with its advisory list, as the parity obligation demands. */
function receiptOf(entries: readonly { severity: string; module: string; patched: string }[]): unknown {
  const counts: Record<string, number> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  const advisories: Record<string, unknown> = {};
  entries.forEach((entry, index) => {
    counts[entry.severity] = (counts[entry.severity] ?? 0) + 1;
    advisories[`adv-${index}`] = {
      module_name: entry.module,
      severity: entry.severity,
      patched_versions: entry.patched,
      cves: [],
    };
  });
  return { metadata: { vulnerabilities: counts }, advisories };
}

describe('security audit contract properties', () => {
  it('orders stable semantic versions lexicographically by numeric component', () => {
    fc.assert(
      fc.property(versionArbitrary, versionArbitrary, (actual, minimum) => {
        expect(versionAtLeast(actual.text, minimum.text)).toBe(compareVersion(actual, minimum) >= 0);
      }),
      { seed: 0x5eed, numRuns: 500 },
    );
  });

  it('preserves stable ordering for build and prerelease suffixes', () => {
    fc.assert(
      fc.property(versionArbitrary, fc.constantFrom('-security.0', '-rc.1', '+build.9'), (version, suffix) => {
        expect(versionAtLeast(`${version.text}${suffix}`, version.text)).toBe(true);
        expect(versionAtLeast(version.text, `${version.text}${suffix}`)).toBe(true);
      }),
      { seed: 0x5eed, numRuns: 200 },
    );
  });

  it('fails closed for strings outside the supported stable-version grammar', () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => !/^\d+\.\d+\.\d+(?:[-+].*)?$/u.test(value)),
        (value) => {
          expect(versionAtLeast(value, POSTCSS_FLOOR)).toBe(false);
          expect(versionAtLeast(POSTCSS_FLOOR, value)).toBe(false);
        },
      ),
      { seed: 0x5eed, numRuns: 300 },
    );
  });

  /**
   * The instance obligation is the STRICTER of the override's own bound and the
   * declared minimum, so an installed version below the pin that selected it is
   * a finding even when it clears `SECURITY_MINIMUMS`. The offsets keep every
   * generated instance at or above the generated bound; the companion property
   * below covers the rejecting direction.
   */
  it('admits every explicit major-bounded override whose lower bound is safe', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 18, max: 60 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 1, maxLength: 8 }),
        (lowerPatch, offsets) => {
          const versions = offsets.map((offset) => `8.5.${lowerPatch + offset}`);
          expect(securityMinimumFindings(root(`>=8.5.${lowerPatch} <9`), lockfile(versions))).toEqual([]);
        },
      ),
      { seed: 0x5eed, numRuns: 200 },
    );
  });

  it('rejects an instance below the pin that selected it even when it clears the declared minimum', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (gap) => {
        const bound = `8.5.${18 + gap}`;
        const installed = '8.5.18';
        expect(securityMinimumFindings(root(`>=${bound} <9`), lockfile([installed]))).toEqual([
          `pnpm lockfile resolves vulnerable postcss ${installed}; require >=${bound}`,
        ]);
      }),
      { seed: 0x5eed, numRuns: 100 },
    );
  });

  it('rejects every installed version below the floor regardless of order or duplication', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 17 }), { minLength: 1, maxLength: 8 }),
        fc.shuffledSubarray(['8.5.18', '8.6.0', '8.9.0'], { minLength: 0 }),
        (vulnerablePatches, safeVersions) => {
          const vulnerableVersions = vulnerablePatches.map((patch) => `8.5.${patch}`);
          const versions = [...safeVersions, ...vulnerableVersions, ...vulnerableVersions];
          const findings = securityMinimumFindings(root(`>=${POSTCSS_FLOOR} <9`), lockfile(versions));
          for (const version of new Set(vulnerableVersions)) {
            expect(findings).toContain(
              `pnpm lockfile resolves vulnerable postcss ${version}; require >=${POSTCSS_FLOOR}`,
            );
          }
          expect(findings.filter((finding) => finding.includes('lockfile resolves'))).toHaveLength(
            new Set(vulnerableVersions).size,
          );
        },
      ),
      { seed: 0x5eed, numRuns: 200 },
    );
  });

  it('refuses override text that merely embeds the required comparator', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '>=8.5.10 || >=8.5.18',
          '>=8.5.18 || <8.5.18',
          'prefix>=8.5.18 <9',
          '>=8.5.18 <9 suffix',
          '>=8.5.18 <=9',
        ),
        (override) => {
          expect(securityMinimumFindings(root(override), lockfile(['8.5.18']))).toContain(
            `root override "postcss" is outside the readable floor grammar (${JSON.stringify(override)})`,
          );
        },
      ),
      { seed: 0x5eed, numRuns: 50 },
    );
  });

  /**
   * THE INVERSION PROPERTY. The old contract read only the counts, so any receipt
   * with a nonzero high/critical count produced a finding no reader could act on.
   * Every blocking line must now NAME the module it is about.
   */
  it('names the owning module on every blocking finding it emits', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            severity: severityArbitrary,
            module: fc.constantFrom('alpha', 'beta', 'gamma'),
            patched: fc.constant('>=1.2.3'),
          }),
          { maxLength: 8 },
        ),
        (entries) => {
          const parsed = parsePnpmAuditReceipt(receiptOf(entries));
          const findings = blockingAuditFindings(parsed);
          const blocking = entries.filter((entry) => entry.severity === 'high' || entry.severity === 'critical');
          expect(findings).toHaveLength(blocking.length);
          for (const finding of findings) {
            expect(blocking.some((entry) => finding.startsWith(`${entry.module} — `))).toBe(true);
          }
        },
      ),
      { seed: 0x5eed, numRuns: 300 },
    );
  });

  it('fails closed whenever the severity counts and the advisory list disagree', () => {
    fc.assert(
      fc.property(severityArbitrary, fc.integer({ min: 1, max: 9 }), (severity, claimed) => {
        const counts: Record<string, number> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
        counts[severity] = claimed;
        expect(() => parsePnpmAuditReceipt({ metadata: { vulnerabilities: counts }, advisories: {} })).toThrow(
          /counts and advisories disagree/u,
        );
      }),
      { seed: 0x5eed, numRuns: 100 },
    );
  });

  it('fails closed for negative, fractional, unsafe, and non-numeric severity counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(-1, -100, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY, '0', null),
        severityArbitrary,
        (invalidCount, severity) => {
          const counts: Record<string, unknown> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
          counts[severity] = invalidCount;
          expect(() => parsePnpmAuditReceipt({ metadata: { vulnerabilities: counts } })).toThrow(
            `audit ${severity} count is invalid`,
          );
        },
      ),
      { seed: 0x5eed, numRuns: 200 },
    );
  });

  /**
   * THE ANCHOR PROPERTY. The receipt decides which packages need a floor. Any
   * module the feed reports that carries no declared minimum must red, whatever
   * its name or severity — this is what keeps the table from falling behind.
   */
  it('refuses any blocking-severity advisory module that declares no security minimum', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 12 })
          .filter((name) => name.trim().length > 0 && MINIMUMS[name] === undefined),
        fc.constantFrom('high', 'critical'),
        (moduleName, severity) => {
          const parsed = parsePnpmAuditReceipt(receiptOf([{ severity, module: moduleName, patched: '>=4.5.6' }]));
          expect(advisoryFloorFindings(parsed, root(`>=${POSTCSS_FLOOR} <9`))).toEqual([
            `${moduleName} carries advisory adv-0 but declares no security minimum; require >=4.5.6`,
          ]);
        },
      ),
      { seed: 0x5eed, numRuns: 300 },
    );
  });

  /**
   * THE POLARITY COMPANION. Demanding a declared floor for every severity would
   * make a `low` advisory against a transitive dev package fail the build, which
   * widens what blocks beyond this gate's authority. The currency obligation
   * stops exactly where the verdict does.
   */
  it('demands no declared floor for a severity that does not block', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }).filter((name) => name.trim().length > 0),
        fc.constantFrom('info', 'low', 'moderate'),
        (moduleName, severity) => {
          const parsed = parsePnpmAuditReceipt(receiptOf([{ severity, module: moduleName, patched: '>=4.5.6' }]));
          expect(advisoryFloorFindings(parsed, root(`>=${POSTCSS_FLOOR} <9`))).toEqual([]);
          expect(blockingAuditFindings(parsed)).toEqual([]);
        },
      ),
      { seed: 0x5eed, numRuns: 200 },
    );
  });

  it('resolves an override key to its governed package across every supported spelling', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('postcss', '@scope/name', 'parent>child', 'parent>@scope/child'),
        fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
        (key, major) => {
          const spelled = major === undefined ? key : `${key}@${major}`;
          const entry = parseOverrideEntry(spelled, '>=1.2.3 <9');
          expect(entry).not.toBeNull();
          expect(entry!.packageName).toBe(key.slice(key.lastIndexOf('>') + 1));
          expect(entry!.major).toBe(major ?? null);
          expect(entry!.lowerBound).toBe('1.2.3');
        },
      ),
      { seed: 0x5eed, numRuns: 200 },
    );
  });
});
