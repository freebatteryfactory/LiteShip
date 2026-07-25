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
    };

export interface PackageManagerInvocation {
  readonly command: ProjectPackageManager;
  readonly args: readonly string[];
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

/** Detect the package manager that owns commands in `cwd`, including unsupported authored managers. */
export function detectProjectPackageManager(
  cwd: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProjectPackageManagerDetection {
  let directory = resolve(cwd);
  let first = true;
  for (;;) {
    const manifestPath = resolve(directory, 'package.json');
    let manifest: { readonly packageManager?: unknown; readonly workspaces?: unknown } | undefined;
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        readonly packageManager?: unknown;
        readonly workspaces?: unknown;
      };
    }
    const ownsNestedProjects =
      first ||
      existsSync(resolve(directory, 'pnpm-workspace.yaml')) ||
      (manifest !== undefined &&
        (Array.isArray(manifest.workspaces) ||
          (typeof manifest.workspaces === 'object' && manifest.workspaces !== null)));
    if (ownsNestedProjects && manifest !== undefined) {
      const declared = managerNameFromSpecifier(manifest.packageManager);
      if (declared !== null) return classifyManager(declared, 'packageManager');
    }

    const lockfileManagers = ownsNestedProjects
      ? [
          ...(existsSync(resolve(directory, 'pnpm-lock.yaml')) ? ['pnpm'] : []),
          ...(existsSync(resolve(directory, 'package-lock.json')) ? ['npm'] : []),
          ...(existsSync(resolve(directory, 'yarn.lock')) ? ['yarn'] : []),
        ]
      : [];
    if (lockfileManagers.length === 1) return classifyManager(lockfileManagers[0]!, 'lockfile');
    if (lockfileManagers.length > 1) {
      return {
        kind: 'unsupported',
        manager: `conflicting lockfiles (${lockfileManagers.sort().join(', ')})`,
        source: 'lockfile',
      };
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
    first = false;
  }

  const invoking = managerNameFromUserAgent(env['npm_config_user_agent']);
  if (invoking !== null) return classifyManager(invoking, 'user-agent');

  return { kind: 'supported', manager: 'npm' };
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
