/** Host-injection and negative-space laws for the reusable audit policy engine. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DEVOPS_PROFILE_KEYS, resolveDevopsProfile, withRepoRoot, type DevopsProfile } from '@liteship/audit';
import { findAllowlistReason, type AuditAllowlistEntry } from '../../packages/audit/src/policy.js';
import type { AuditFinding } from '../../packages/audit/src/types.js';

function finding(file: string, summary = 'console call in executable source'): AuditFinding {
  return {
    id: `integrity/console-call/${file}`,
    section: 'integrity',
    rule: 'console-call',
    severity: 'warning',
    title: 'Console call',
    summary,
    location: { file },
  };
}

function profile(overrides: Partial<DevopsProfile> = {}): DevopsProfile {
  return resolveDevopsProfile({
    repoRoot: 'fixture',
    internalPackagePrefix: '@acme/',
    ...overrides,
  });
}

const segmentArbitrary = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 12 })
  .map((parts) => parts.join(''));

describe('audit host-policy isolation', () => {
  it('defaults every policy-bearing collection to conservative empty authority', () => {
    const resolved = profile();
    expect(resolved.packageTopology).toEqual({});
    expect([...resolved.dynamicImportExemptions]).toEqual([]);
    expect(resolved.surfacePolicy).toEqual({});
    expect(resolved.allowlist).toEqual([]);
    expect(resolved.sourceEntrypoints).toBeUndefined();
    expect(resolved.packageRoots).toBeUndefined();
    expect(resolved.foundationalPackages).toBeUndefined();
  });

  it('pins all nine injected profile axes exactly once', () => {
    expect(DEVOPS_PROFILE_KEYS).toEqual([
      'repoRoot',
      'internalPackagePrefix',
      'packageTopology',
      'foundationalPackages',
      'dynamicImportExemptions',
      'surfacePolicy',
      'allowlist',
      'sourceEntrypoints',
      'packageRoots',
    ]);
    expect(new Set(DEVOPS_PROFILE_KEYS).size).toBe(DEVOPS_PROFILE_KEYS.length);
  });

  it('never suppresses a finding without an explicitly injected matching entry', () => {
    const observed = finding('packages/app/src/index.ts');
    expect(findAllowlistReason(observed, [])).toBeNull();
    expect(
      findAllowlistReason(observed, [
        { rule: 'default-export', filePrefix: 'packages/app/', reason: 'wrong rule' },
        { rule: 'console-call', filePrefix: 'packages/other/', reason: 'wrong path' },
        { rule: 'console-call', summaryIncludes: 'not present', reason: 'wrong summary' },
      ]),
    ).toBeNull();
  });

  it('makes package ownership and package-relative path jointly necessary', () => {
    const entry: AuditAllowlistEntry = {
      rule: 'console-call',
      package: '@acme/app',
      filePrefix: 'src/diagnostics/',
      reason: 'the injected diagnostics adapter owns this console boundary',
    };
    const observed = finding('workspace/packages/app/src/diagnostics/console.ts');
    expect(
      findAllowlistReason(observed, [entry], () => ({
        packageName: '@acme/app',
        packageRelativePath: 'src/diagnostics/console.ts',
      })),
    ).toBe(entry.reason);
    expect(
      findAllowlistReason(observed, [entry], () => ({
        packageName: '@other/app',
        packageRelativePath: 'src/diagnostics/console.ts',
      })),
    ).toBeNull();
    expect(
      findAllowlistReason(observed, [entry], () => ({
        packageName: '@acme/app',
        packageRelativePath: 'src/runtime/console.ts',
      })),
    ).toBeNull();
    expect(findAllowlistReason(observed, [entry])).toBeNull();
  });

  it('keeps repository-relative prefixes inside the audited profile root', () => {
    const entry: AuditAllowlistEntry = {
      rule: 'console-call',
      filePrefix: 'packages/app/',
      reason: 'repo-owned console adapter',
    };
    expect(findAllowlistReason(finding('packages/app/src/index.ts'), [entry])).toBe(entry.reason);
    for (const unsafe of [
      '/packages/app/src/index.ts',
      'C:\\packages\\app\\src\\index.ts',
      '../packages/app/src/index.ts',
      'packages/app/../../secrets.ts',
      '',
    ]) {
      expect(findAllowlistReason(finding(unsafe), [entry])).toBeNull();
    }
  });

  it('does not let a filePrefix-only entry leak into an unrelated repository path', () => {
    fc.assert(
      fc.property(segmentArbitrary, segmentArbitrary, (owner, foreign) => {
        fc.pre(owner !== foreign);
        const entry: AuditAllowlistEntry = {
          rule: 'console-call',
          filePrefix: `packages/${owner}/`,
          reason: `owned by ${owner}`,
        };
        expect(findAllowlistReason(finding(`packages/${owner}/src/index.ts`), [entry])).toBe(entry.reason);
        expect(findAllowlistReason(finding(`packages/${foreign}/src/index.ts`), [entry])).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('requires every requested summary fragment and preserves first-match precedence', () => {
    const observed = finding('packages/app/src/index.ts', 'console call at the command diagnostics boundary');
    const entries: AuditAllowlistEntry[] = [
      {
        rule: 'console-call',
        summaryIncludes: 'diagnostics boundary',
        reason: 'narrow diagnostics match',
      },
      {
        rule: 'console-call',
        reason: 'broad fallback that must not hide the narrow owner',
      },
    ];
    expect(findAllowlistReason(observed, entries)).toBe('narrow diagnostics match');
    expect(findAllowlistReason(finding('packages/app/src/index.ts', 'different summary'), entries)).toBe(
      'broad fallback that must not hide the narrow owner',
    );
  });

  it('preserves all explicitly injected downstream policy without adding LiteShip defaults', () => {
    const allowlist: AuditAllowlistEntry[] = [
      { rule: 'console-call', package: '@acme/app', reason: 'downstream diagnostics' },
    ];
    const topology = {
      '@acme/core': { allowedInternalImports: [], kind: 'core' as const },
      '@acme/app': { allowedInternalImports: ['@acme/core'], kind: 'layered' as const },
    };
    const resolved = profile({
      packageTopology: topology,
      foundationalPackages: ['@acme/error'],
      dynamicImportExemptions: new Set(['@acme/app -> @acme/plugin']),
      surfacePolicy: { vitePackage: '@acme/vite', viteVirtualModules: ['virtual:acme/config'] },
      allowlist,
      sourceEntrypoints: { '@acme/app': { '.': 'packages/app/src/index.ts' } },
      packageRoots: { '@acme/app': 'fixture/node_modules/@acme/app' },
    });
    expect(resolved.packageTopology).toBe(topology);
    expect(resolved.allowlist).toBe(allowlist);
    expect(resolved.foundationalPackages).toEqual(['@acme/error']);
    expect([...resolved.dynamicImportExemptions]).toEqual(['@acme/app -> @acme/plugin']);
    expect(resolved.surfacePolicy).toEqual({
      vitePackage: '@acme/vite',
      viteVirtualModules: ['virtual:acme/config'],
    });
    expect(JSON.stringify(resolved)).not.toContain('@liteship/');
  });

  it('changes only the normalized repository root when retargeting a profile', () => {
    const original = profile({
      packageTopology: { '@acme/app': { allowedInternalImports: [], kind: 'layered' } },
      allowlist: [{ rule: 'console-call', reason: 'explicit host policy' }],
    });
    const retargeted = withRepoRoot(original, 'other\\repository\\root');
    expect(retargeted.repoRoot).toBe('other/repository/root');
    expect({ ...retargeted, repoRoot: original.repoRoot }).toEqual(original);
  });
});
