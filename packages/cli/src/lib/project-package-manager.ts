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

export interface PackageManagerInvocation {
  readonly command: ProjectPackageManager;
  readonly args: readonly string[];
}

function managerFromSpecifier(value: unknown): ProjectPackageManager | null {
  if (typeof value !== 'string') return null;
  const name = value.split('@', 1)[0];
  return name === 'npm' || name === 'pnpm' ? name : null;
}

function managerFromUserAgent(value: string | undefined): ProjectPackageManager | null {
  if (value === undefined) return null;
  const name = value.trim().split(/[\s/]/, 1)[0];
  return name === 'npm' || name === 'pnpm' ? name : null;
}

/** Detect the package manager that owns commands in `cwd`. */
export function detectProjectPackageManager(
  cwd: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProjectPackageManager {
  const manifestPath = resolve(cwd, 'package.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly packageManager?: unknown };
    const declared = managerFromSpecifier(manifest.packageManager);
    if (declared !== null) return declared;
  }

  const hasPnpmLock = existsSync(resolve(cwd, 'pnpm-lock.yaml'));
  const hasNpmLock = existsSync(resolve(cwd, 'package-lock.json'));
  if (hasPnpmLock !== hasNpmLock) return hasPnpmLock ? 'pnpm' : 'npm';

  return managerFromUserAgent(env['npm_config_user_agent']) ?? 'npm';
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
