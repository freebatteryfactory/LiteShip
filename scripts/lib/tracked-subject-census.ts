/**
 * One immutable tracked-file snapshot and derived repository subject censuses.
 *
 * @module
 */

import { posix } from 'node:path';
import { ValidationError } from '../../packages/error/src/index.js';
import { spawnArgvCapture, type SpawnCaptureOpts, type SpawnCaptureResult } from './spawn.js';

export interface TrackedFileCensus {
  readonly paths: readonly string[];
  readonly has: (path: string) => boolean;
}

export interface W111SubjectCensus {
  readonly fragments: readonly string[];
  readonly fragmentSources: readonly string[];
  readonly fragmentNonSources: readonly string[];
  readonly shippedBins: readonly string[];
  readonly rootExecutableConfigs: readonly string[];
  readonly governedSources: readonly string[];
}

export const W111_SUBJECT_FLOORS = Object.freeze({
  fragments: 107,
  fragmentSources: 41,
  shippedBins: 2,
  rootExecutableConfigs: 6,
});

export type GitTrackedFileRunner = (
  command: string,
  args: readonly string[],
  options: SpawnCaptureOpts,
) => Promise<SpawnCaptureResult>;

const CLI_FRAGMENT_PREFIX = 'packages/cli/fragments/';
const PACKAGE_MANIFEST = /^packages\/[^/]+\/package\.json$/u;
const JAVASCRIPT_OR_TYPESCRIPT_SOURCE = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u;
const ROOT_EXECUTABLE_CONFIG = /^(?:(?:eslint|liteship|vite)\.config|vitest(?:\.[a-z0-9-]+)*)\.[cm]?[jt]sx?$/u;

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertRepoRelativePath(path: string): void {
  const segments = path.split('/');
  if (
    path.length === 0 ||
    path.includes('\\') ||
    path.startsWith('/') ||
    /^[A-Za-z]:/u.test(path) ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw ValidationError(
      'tracked-subject-census',
      `tracked path must be a normalized repo-relative path: ${JSON.stringify(path)}`,
    );
  }
}

export function createTrackedFileCensus(paths: readonly string[]): TrackedFileCensus {
  const seen = new Set<string>();
  for (const path of paths) {
    assertRepoRelativePath(path);
    if (seen.has(path)) throw ValidationError('tracked-subject-census', `duplicate tracked path: ${path}`);
    seen.add(path);
  }
  const sorted = Object.freeze([...paths].sort(comparePath));
  const members = new Set(sorted);
  return Object.freeze({ paths: sorted, has: (path: string) => members.has(path) });
}

export async function readTrackedFileCensus(
  repoRoot: string,
  run: GitTrackedFileRunner = spawnArgvCapture,
): Promise<TrackedFileCensus> {
  const result = await run('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    timeoutMs: 30_000,
    captureBytes: 4 * 1024 * 1024,
  });
  if (result.timedOut) throw ValidationError('tracked-subject-census', 'git ls-files timed out after 30000ms');
  if (result.exitCode !== 0) {
    throw ValidationError('tracked-subject-census', `git ls-files failed (exit ${result.exitCode}): ${result.stderr}`);
  }
  return createTrackedFileCensus(result.stdout.split('\0').filter((path) => path.length > 0));
}

/**
 * Tracked files that the repository's own ignore rules nevertheless match.
 *
 * Git resolves the conflict in the INDEX's favour, so these files stay
 * committed and plain `git check-ignore` reports nothing about them. Every
 * other tool disagrees: ast-grep, ripgrep, and fast-glob apply the ignore rules
 * WITHOUT consulting the index, so each silently skips the file. The result is
 * a source file governed in git's eyes and by nothing else — invisible
 * precisely because the anchor still reports it as present.
 *
 * Derived from git's own resolution: `--exclude-standard` folds `.gitignore`,
 * `.git/info/exclude`, and the global excludes in their real precedence. The
 * pattern grammar is never re-implemented here — ordering, negation, and
 * directory semantics are exactly the open grammar a restatement loses to.
 */
export async function readIgnoredTrackedFiles(
  repoRoot: string,
  run: GitTrackedFileRunner = spawnArgvCapture,
): Promise<readonly string[]> {
  const result = await run('git', ['ls-files', '-z', '--cached', '--ignored', '--exclude-standard'], {
    cwd: repoRoot,
    timeoutMs: 30_000,
    captureBytes: 4 * 1024 * 1024,
  });
  if (result.timedOut) {
    throw ValidationError('tracked-subject-census', 'git ls-files --ignored timed out after 30000ms');
  }
  if (result.exitCode !== 0) {
    throw ValidationError(
      'tracked-subject-census',
      `git ls-files --ignored failed (exit ${result.exitCode}): ${result.stderr}`,
    );
  }
  const paths = result.stdout.split('\0').filter((path) => path.length > 0);
  for (const path of paths) assertRepoRelativePath(path);
  return Object.freeze([...paths].sort(comparePath));
}

function packageBinTargets(manifestPath: string, text: string): readonly string[] {
  let manifest: unknown;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw ValidationError(
      'tracked-subject-census',
      `cannot parse tracked package manifest ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    throw ValidationError(
      'tracked-subject-census',
      `tracked package manifest ${manifestPath} must contain a JSON object`,
    );
  }
  const bin = (manifest as { readonly bin?: unknown }).bin;
  if (bin === undefined) return [];
  if (typeof bin === 'string') return [bin];
  if (typeof bin !== 'object' || bin === null || Array.isArray(bin)) {
    throw ValidationError(
      'tracked-subject-census',
      `tracked package manifest ${manifestPath} has an invalid bin declaration`,
    );
  }
  const targets = Object.values(bin);
  if (targets.some((target) => typeof target !== 'string')) {
    throw ValidationError(
      'tracked-subject-census',
      `tracked package manifest ${manifestPath} has a non-string bin target`,
    );
  }
  return targets as readonly string[];
}

function resolveTrackedBin(manifestPath: string, target: string, tracked: TrackedFileCensus): string {
  if (target.length === 0 || target.includes('\\') || target.startsWith('/') || /^[A-Za-z]:/u.test(target)) {
    throw ValidationError(
      'tracked-subject-census',
      `bin target in ${manifestPath} must be package-relative: ${JSON.stringify(target)}`,
    );
  }
  const packageRoot = posix.dirname(manifestPath);
  const resolved = posix.normalize(posix.join(packageRoot, target));
  if (!resolved.startsWith(`${packageRoot}/`)) {
    throw ValidationError(
      'tracked-subject-census',
      `bin target in ${manifestPath} escapes its package: ${JSON.stringify(target)}`,
    );
  }
  if (!tracked.has(resolved)) {
    throw ValidationError(
      'tracked-subject-census',
      `bin target ${resolved} from ${manifestPath} is not present in the tracked census`,
    );
  }
  return resolved;
}

function frozenSorted(paths: Iterable<string>): readonly string[] {
  return Object.freeze([...paths].sort(comparePath));
}

export function buildW111SubjectCensus(
  tracked: TrackedFileCensus,
  readText: (path: string) => string,
): W111SubjectCensus {
  const fragments = tracked.paths.filter((path) => path.startsWith(CLI_FRAGMENT_PREFIX));
  const fragmentSources = fragments.filter((path) => JAVASCRIPT_OR_TYPESCRIPT_SOURCE.test(path));
  const fragmentSourceSet = new Set(fragmentSources);
  const fragmentNonSources = fragments.filter((path) => !fragmentSourceSet.has(path));

  const shippedBins = new Set<string>();
  for (const manifestPath of tracked.paths.filter((path) => PACKAGE_MANIFEST.test(path))) {
    for (const target of packageBinTargets(manifestPath, readText(manifestPath))) {
      shippedBins.add(resolveTrackedBin(manifestPath, target, tracked));
    }
  }

  const rootExecutableConfigs = tracked.paths.filter(
    (path) => !path.includes('/') && ROOT_EXECUTABLE_CONFIG.test(path),
  );
  const governedSources = new Set([...fragmentSources, ...shippedBins, ...rootExecutableConfigs]);

  return Object.freeze({
    fragments: frozenSorted(fragments),
    fragmentSources: frozenSorted(fragmentSources),
    fragmentNonSources: frozenSorted(fragmentNonSources),
    shippedBins: frozenSorted(shippedBins),
    rootExecutableConfigs: frozenSorted(rootExecutableConfigs),
    governedSources: frozenSorted(governedSources),
  });
}
