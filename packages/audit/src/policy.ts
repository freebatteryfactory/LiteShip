/**
 * Reusable audit policy contracts and matching primitives.
 *
 * This module deliberately names no LiteShip package, topology, host surface,
 * dynamic exemption, or suppression. Those are host policy injected through a
 * {@link DevopsProfile}; the engine owns only the algebra that consumes them.
 *
 * @module
 */
import { isAbsolute } from 'node:path';
import type { AuditFinding, AuditRuleId } from './types.js';

/** One host-owned suppression rule with an auditable reason. */
export interface AuditAllowlistEntry {
  readonly rule: AuditRuleId;
  /**
   * Package owning the allowlisted file. When set, `filePrefix` is package
   * relative and matching requires a profile-derived package path resolver.
   * Without it, `filePrefix` is repository relative and may never escape the
   * profile root.
   */
  readonly package?: string;
  readonly filePrefix?: string;
  readonly summaryIncludes?: string;
  readonly reason: string;
}

/** A finding file resolved to its owning package + package-relative path. */
export interface PackagePathResolution {
  readonly packageName: string;
  readonly packageRelativePath: string;
}

/** Resolve a repository file to its owning package and package-relative path. */
export type PackagePathResolver = (file: string) => PackagePathResolution | null;

/** Injected import and surface policy for one package. */
export interface PackagePolicy {
  readonly allowedInternalImports: readonly string[];
  readonly kind: 'core' | 'layered' | 'host-adjacent' | 'standalone';
  /** Package-relative source/declaration globs constituting analyzed source. */
  readonly analyzableArtifacts?: readonly string[];
}

/** Generic source-bearing package artifact contract. */
export const defaultAnalyzableArtifacts = ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.d.ts'] as const;

/** Default source globs used only when a host does not narrow audit discovery. */
export const auditSourceGlobs = ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'] as const;

/** Generated and fixture paths excluded from executable-source analysis. */
export const auditIgnoreGlobs = [
  '**/dist/**',
  '**/node_modules/**',
  '**/*.d.ts',
  'coverage/**',
  'reports/**',
  'docs/**',
  'examples/**',
  'benchmarks/**',
  'tests/e2e/fixtures/**',
] as const;

/** Normalize a repository path at the engine boundary. */
export function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function isSafeRepoRelativePath(value: string): boolean {
  const normalized = normalizeRepoPath(value);
  return (
    normalized.length > 0 &&
    !isAbsolute(value) &&
    !normalized.startsWith('/') &&
    normalized !== '..' &&
    !normalized.startsWith('../') &&
    !normalized.includes('/../')
  );
}

/**
 * Match one finding against an explicitly injected allowlist. Package-scoped
 * entries require the profile's resolver. Repository-relative entries refuse
 * absolute and traversal paths so a suppression cannot escape its profile.
 */
export function findAllowlistReason(
  finding: AuditFinding,
  allowlist: readonly AuditAllowlistEntry[],
  resolvePackagePath?: PackagePathResolver,
): string | null {
  const file = finding.location?.file ?? '';
  const resolved = resolvePackagePath?.(file) ?? null;
  for (const entry of allowlist) {
    if (entry.rule !== finding.rule) continue;
    if (entry.package !== undefined) {
      if (resolved === null || resolved.packageName !== entry.package) continue;
      if (entry.filePrefix && !resolved.packageRelativePath.startsWith(entry.filePrefix)) continue;
    } else if (entry.filePrefix) {
      if (!isSafeRepoRelativePath(file) || !file.startsWith(entry.filePrefix)) continue;
    }
    if (entry.summaryIncludes && !finding.summary.includes(entry.summaryIncludes)) continue;
    return entry.reason;
  }
  return null;
}
