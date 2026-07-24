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
import { resolve } from 'node:path';

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
  const manifestPath = resolve(cwd, 'package.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly packageManager?: unknown };
    const declared = managerNameFromSpecifier(manifest.packageManager);
    if (declared !== null) return classifyManager(declared, 'packageManager');
  }

  const lockfileManagers = [
    ...(existsSync(resolve(cwd, 'pnpm-lock.yaml')) ? ['pnpm'] : []),
    ...(existsSync(resolve(cwd, 'package-lock.json')) ? ['npm'] : []),
    ...(existsSync(resolve(cwd, 'yarn.lock')) ? ['yarn'] : []),
  ];
  if (lockfileManagers.length === 1) return classifyManager(lockfileManagers[0]!, 'lockfile');

  const invoking = managerNameFromUserAgent(env['npm_config_user_agent']);
  if (invoking !== null) return classifyManager(invoking, 'user-agent');

  return { kind: 'supported', manager: 'npm' };
}

/** One shared refusal text for consumer commands and application checks. */
export function unsupportedProjectPackageManagerMessage(
  detection: Extract<ProjectPackageManagerDetection, { readonly kind: 'unsupported' }>,
): string {
  return `detected unsupported ${detection.manager} project via ${detection.source}; LiteShip 0.19 project delegation supports npm and pnpm`;
}

/** One shared remediation for unsupported consumer project managers. */
export const UNSUPPORTED_PROJECT_PACKAGE_MANAGER_HINT =
  'LiteShip 0.19 supports npm and pnpm project delegation; use one of those managers for this project';

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
