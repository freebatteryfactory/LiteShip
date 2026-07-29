/**
 * Deterministic source-layout census for governed domain directories.
 *
 * A directory facade is an entry surface, not a content module. A governed
 * domain directory therefore needs at least two non-facade source modules.
 * Keeping the classifier pure lets tests prove the law with synthetic trees
 * while the gate applies the same code to the live repository.
 *
 * @module
 */

import { existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';

const SOURCE_MODULE = /\.(?:[cm]?ts|tsx)$/;
const DECLARATION_MODULE = /\.d\.[cm]?ts$/;
const FACADE_MODULE = /^index\.(?:[cm]?ts|tsx)$/;

/** One governed domain directory and the content modules that earn it. */
export interface DomainDirectoryLayout {
  readonly directory: string;
  readonly facade: string | null;
  readonly contentModules: readonly string[];
}

/** A domain directory whose facade is backed by fewer than two content modules. */
export interface DomainDirectoryGraduationFinding extends DomainDirectoryLayout {
  readonly code: 'singleton-domain-directory';
}

/** Complete current-head subject coverage for the source-layout authority. */
export interface SourceLayoutReceipt {
  readonly enumerator: 'immediate-package-source-directories';
  readonly censusDigest: `sha256:${string}`;
  readonly subjects: readonly DomainDirectoryLayout[];
  readonly findings: readonly DomainDirectoryGraduationFinding[];
}

const portable = (path: string): string => path.split(sep).join('/').replaceAll('\\', '/');

/** Classify source paths without counting any `index.*` facade as content. */
export function domainContentModules(paths: readonly string[]): readonly string[] {
  return Object.freeze(
    paths
      .map(portable)
      .filter((path) => SOURCE_MODULE.test(path))
      .filter((path) => !DECLARATION_MODULE.test(path))
      .filter((path) => !FACADE_MODULE.test(path.split('/').at(-1) ?? path))
      .sort(),
  );
}

/** Apply the two-content-module graduation law to one already-enumerated domain. */
export function evaluateDomainDirectory(layout: DomainDirectoryLayout): DomainDirectoryGraduationFinding | undefined {
  const contentModules = domainContentModules(layout.contentModules);
  if (contentModules.length >= 2) return undefined;
  return Object.freeze({
    code: 'singleton-domain-directory',
    directory: portable(layout.directory),
    facade: layout.facade === null ? null : portable(layout.facade),
    contentModules,
  });
}

function sourceFilesBelow(directory: string): readonly string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

/** Enumerate every non-empty immediate package source directory. */
export function enumerateDomainDirectoryLayouts(repoRoot: string): readonly DomainDirectoryLayout[] {
  const root = resolve(repoRoot);
  const packagesRoot = join(root, 'packages');
  if (!existsSync(packagesRoot)) return Object.freeze([]);

  const layouts: DomainDirectoryLayout[] = [];
  for (const packageEntry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const sourceRoot = join(packagesRoot, packageEntry.name, 'src');
    if (!existsSync(sourceRoot)) continue;
    for (const domainEntry of readdirSync(sourceRoot, { withFileTypes: true })) {
      if (!domainEntry.isDirectory()) continue;
      const directory = join(sourceRoot, domainEntry.name);
      const facade = join(directory, 'index.ts');
      const contentModules = domainContentModules(sourceFilesBelow(directory).map((file) => relative(directory, file)));
      // Empty local directories are not Git subjects and carry no source claim.
      if (contentModules.length === 0 && !existsSync(facade)) continue;
      layouts.push(
        Object.freeze({
          directory: portable(relative(root, directory)),
          facade: existsSync(facade) ? portable(relative(root, facade)) : null,
          contentModules,
        }),
      );
    }
  }
  return Object.freeze(layouts.sort((left, right) => left.directory.localeCompare(right.directory)));
}

/** Build the complete, content-addressed current-head source-layout receipt. */
export function buildSourceLayoutReceipt(repoRoot: string): SourceLayoutReceipt {
  const subjects = enumerateDomainDirectoryLayouts(repoRoot);
  const findings = subjects
    .map((layout) => evaluateDomainDirectory(layout))
    .filter((finding): finding is DomainDirectoryGraduationFinding => finding !== undefined);
  const censusDigest = `sha256:${createHash('sha256').update(JSON.stringify(subjects)).digest('hex')}` as const;
  return Object.freeze({
    enumerator: 'immediate-package-source-directories',
    censusDigest,
    subjects,
    findings: Object.freeze(findings),
  });
}

/** Return every violation from the same complete receipt used by the gate. */
export function findDomainDirectoryGraduationFindings(repoRoot: string): readonly DomainDirectoryGraduationFinding[] {
  return buildSourceLayoutReceipt(repoRoot).findings;
}
