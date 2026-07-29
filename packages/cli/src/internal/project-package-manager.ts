/**
 * Consumer-project package-manager selection.
 *
 * Host delegation must use the consumer's own manager, not the manager that
 * happened to build or publish `@liteship/cli`. Authored packageManager metadata
 * wins, then lockfiles, then the invoking user-agent; an unmarked project uses
 * npm because `npm create liteship` is the universal installation route.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type ProjectPackageManager = 'npm' | 'pnpm';

export type ProjectPackageManagerDetection =
  | { readonly kind: 'supported'; readonly manager: ProjectPackageManager }
  | {
      readonly kind: 'unsupported';
      readonly manager: string;
      readonly source: 'packageManager' | 'lockfile' | 'user-agent';
    }
  | { readonly kind: 'invalid-manifest'; readonly manifestPath: string; readonly reason: string };

export type ProjectPackageManagerFailure = Exclude<ProjectPackageManagerDetection, { readonly kind: 'supported' }>;

export interface PackageManagerInvocation {
  readonly command: ProjectPackageManager;
  readonly args: readonly string[];
}

/** One filesystem-independent package-manager ownership observation. */
export type ProjectPackageManagerBoundary =
  | {
      readonly kind: 'boundary';
      readonly ownsNestedProjects: boolean;
      readonly packageManager?: unknown;
      readonly lockfileManagers: readonly string[];
    }
  | Extract<ProjectPackageManagerDetection, { readonly kind: 'invalid-manifest' }>;

const MAX_MANIFEST_FAILURE_REASON_LENGTH = 320;

function boundedManifestFailureReason(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const normalized = raw.replace(/\s+/gu, ' ').trim() || 'unknown package manifest failure';
  return normalized.length <= MAX_MANIFEST_FAILURE_REASON_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_MANIFEST_FAILURE_REASON_LENGTH - 1)}…`;
}

/** Preserve a bounded cause when a project manifest cannot be admitted. */
export function invalidProjectManifestFailure(
  manifestPath: string,
  error: unknown,
): Extract<ProjectPackageManagerDetection, { readonly kind: 'invalid-manifest' }> {
  return Object.freeze({
    kind: 'invalid-manifest',
    manifestPath,
    reason: boundedManifestFailureReason(error),
  });
}

function managerNameFromSpecifier(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().split('@', 1)[0]?.toLowerCase();
  return name === undefined || name.length === 0 ? null : name;
}

function managerNameFromUserAgent(value: string | undefined): string | null {
  if (value === undefined) return null;
  const name = value.trim().split(/[\s/]/, 1)[0]?.toLowerCase();
  return name === undefined || name.length === 0 ? null : name;
}

function classifyManager(
  manager: string,
  source: 'packageManager' | 'lockfile' | 'user-agent',
): ProjectPackageManagerDetection {
  return manager === 'npm' || manager === 'pnpm'
    ? { kind: 'supported', manager }
    : { kind: 'unsupported', manager, source };
}

/**
 * Fold nearest-first ownership observations into one package-manager verdict.
 *
 * The filesystem adapter below owns discovery. This pure fold owns precedence,
 * ambiguity, unsupported-manager refusal, and user-agent fallback so those laws
 * can be exercised exhaustively without making property tests depend on host
 * filesystem or antivirus latency.
 */
export function selectProjectPackageManager(
  boundaries: Iterable<ProjectPackageManagerBoundary>,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProjectPackageManagerDetection {
  for (const boundary of boundaries) {
    if (boundary.kind === 'invalid-manifest') return boundary;
    if (!boundary.ownsNestedProjects) continue;

    const declared = managerNameFromSpecifier(boundary.packageManager);
    if (declared !== null) return classifyManager(declared, 'packageManager');

    const lockfileManagers = [...new Set(boundary.lockfileManagers)];
    if (lockfileManagers.length === 1) return classifyManager(lockfileManagers[0]!, 'lockfile');
    if (lockfileManagers.length > 1) {
      return {
        kind: 'unsupported',
        manager: `conflicting lockfiles (${lockfileManagers.sort().join(', ')})`,
        source: 'lockfile',
      };
    }
  }

  const invoking = managerNameFromUserAgent(env['npm_config_user_agent']);
  if (invoking !== null) return classifyManager(invoking, 'user-agent');

  return { kind: 'supported', manager: 'npm' };
}

function* projectPackageManagerBoundaries(cwd: string): Iterable<ProjectPackageManagerBoundary> {
  let directory = resolve(cwd);
  let first = true;
  for (;;) {
    const manifestPath = resolve(directory, 'package.json');
    let manifest: { readonly packageManager?: unknown; readonly workspaces?: unknown } | undefined;
    if (existsSync(manifestPath)) {
      try {
        const candidate: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
          yield invalidProjectManifestFailure(manifestPath, 'package.json must contain a JSON object');
          return;
        }
        manifest = candidate;
      } catch (error) {
        yield invalidProjectManifestFailure(manifestPath, error);
        return;
      }
    }
    const ownsNestedProjects =
      first ||
      existsSync(resolve(directory, 'pnpm-workspace.yaml')) ||
      (manifest !== undefined &&
        (Array.isArray(manifest.workspaces) ||
          (typeof manifest.workspaces === 'object' && manifest.workspaces !== null)));
    yield {
      kind: 'boundary',
      ownsNestedProjects,
      ...(manifest === undefined ? {} : { packageManager: manifest.packageManager }),
      lockfileManagers: ownsNestedProjects
        ? [
            ...(existsSync(resolve(directory, 'pnpm-lock.yaml')) ? ['pnpm'] : []),
            ...(existsSync(resolve(directory, 'package-lock.json')) ? ['npm'] : []),
            ...(existsSync(resolve(directory, 'yarn.lock')) ? ['yarn'] : []),
          ]
        : [],
    };

    const parent = dirname(directory);
    if (parent === directory) return;
    directory = parent;
    first = false;
  }
}

/** Detect the package manager that owns commands in `cwd`, including unsupported authored managers. */
export function detectProjectPackageManager(
  cwd: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProjectPackageManagerDetection {
  return selectProjectPackageManager(projectPackageManagerBoundaries(cwd), env);
}

/** One shared refusal text for consumer commands and application checks. */
export function unsupportedProjectPackageManagerMessage(
  detection: Extract<ProjectPackageManagerDetection, { readonly kind: 'unsupported' }>,
): string {
  return `detected unsupported ${detection.manager} project via ${detection.source}; LiteShip project delegation supports npm and pnpm`;
}

/** One shared remediation for unsupported consumer project managers. */
export const UNSUPPORTED_PROJECT_PACKAGE_MANAGER_HINT =
  'LiteShip supports npm and pnpm project delegation; use one of those managers for this project';

/** One structured failure message for every package-manager ownership refusal. */
export function projectPackageManagerFailureMessage(detection: ProjectPackageManagerFailure): string {
  return detection.kind === 'unsupported'
    ? unsupportedProjectPackageManagerMessage(detection)
    : `could not read a valid package manifest at ${detection.manifestPath}: ${detection.reason}`;
}

/** Remediation paired with {@link projectPackageManagerFailureMessage}. */
export function projectPackageManagerFailureHint(detection: ProjectPackageManagerFailure): string {
  return detection.kind === 'unsupported'
    ? UNSUPPORTED_PROJECT_PACKAGE_MANAGER_HINT
    : 'Repair the nearest package.json so it contains a readable JSON object, then retry the LiteShip command';
}

/** Build the manager-specific argv that executes one project-local binary. */
export function projectBinaryInvocation(
  manager: ProjectPackageManager,
  binary: string,
  args: readonly string[],
): PackageManagerInvocation {
  return manager === 'pnpm'
    ? { command: 'pnpm', args: ['exec', binary, ...args] }
    : { command: 'npm', args: ['exec', '--', binary, ...args] };
}
