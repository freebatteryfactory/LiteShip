import { describe, it, expect } from 'vitest';
import { packageSlug, selectTargets, observedLifecycleScripts, deriveBuildEnv, readPackageManagerVersion } from '@liteship/command';
import type { WorkspacePackage } from '@liteship/command';

function pkg(relativePath: string, name: string, isPrivate = false): WorkspacePackage {
  return {
    absolutePath: `/repo/${relativePath}`,
    relativePath,
    packageJsonBytes: new Uint8Array(),
    packageJson: { name, version: '1.0.0', private: isPrivate },
  };
}

describe('@liteship/command ship planning (pure)', () => {
  it('packageSlug maps @scope/name → scope-name and leaves plain names', () => {
    expect(packageSlug('@liteship/_spine')).toBe('liteship-_spine');
    expect(packageSlug('liteship')).toBe('liteship');
  });

  it('selectTargets without filter excludes private packages', () => {
    const ws = [pkg('packages/core', '@liteship/core'), pkg('packages/secret', '@liteship/secret', true)];
    expect(selectTargets(ws, undefined).map((p) => p.packageJson.name)).toEqual(['@liteship/core']);
  });

  it('selectTargets matches by relative path or package name', () => {
    const ws = [pkg('packages/core', '@liteship/core'), pkg('packages/cli', '@liteship/cli')];
    expect(selectTargets(ws, './packages/core/').map((p) => p.relativePath)).toEqual(['packages/core']);
    expect(selectTargets(ws, '@liteship/cli').map((p) => p.relativePath)).toEqual(['packages/cli']);
  });

  it('observedLifecycleScripts reports only present lifecycle scripts', () => {
    expect(observedLifecycleScripts({ scripts: { prepack: 'x', build: 'y' } })).toEqual(['prepack']);
    expect(observedLifecycleScripts({})).toEqual([]);
  });

  it('readPackageManagerVersion parses pnpm@x.y.z (+integrity suffix)', () => {
    expect(readPackageManagerVersion({ packageManager: 'pnpm@10.32.1' })).toBe('10.32.1');
    expect(readPackageManagerVersion({ packageManager: 'pnpm@10.32.1+sha512.abc' })).toBe('10.32.1');
    expect(readPackageManagerVersion({})).toBe('unknown');
  });

  it('deriveBuildEnv validates os/arch and returns a BuildEnv', () => {
    const env = deriveBuildEnv({ os: 'linux', arch: 'x64', nodeVersion: 'v22.0.0', pmVersion: '10.32.1' });
    expect(env).toEqual({ node_version: 'v22.0.0', pnpm_version: '10.32.1', os: 'linux', arch: 'x64' });
  });

  it('deriveBuildEnv throws on an unmodeled platform/arch', () => {
    expect(() => deriveBuildEnv({ os: 'sunos', arch: 'x64', nodeVersion: 'v22', pmVersion: '1' })).toThrow(/platform/);
    expect(() => deriveBuildEnv({ os: 'linux', arch: 'mips', nodeVersion: 'v22', pmVersion: '1' })).toThrow(/arch/);
  });
});
