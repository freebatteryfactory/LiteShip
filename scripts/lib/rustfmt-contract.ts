/** Derived all-crate, all-Rust formatting subjects. @module */

import { dirname } from 'node:path';
import fg from 'fast-glob';
import { deriveRustCrateCensus, deriveRustToolchainChannel } from './devcontainer-pins.js';

export interface RustfmtSubject {
  readonly manifestPath: string;
  readonly lockPath: string;
  readonly edition: string;
  readonly sourcePaths: readonly string[];
}

export interface PinnedRustfmtInvocation {
  readonly command: 'rustup';
  readonly argv: readonly string[];
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Derive every formatter subject from the live Cargo and Rust file census.
 * A new crate or source file enrolls automatically; an empty crate fails closed.
 */
export function deriveRustfmtSubjects(repoRoot: string): readonly RustfmtSubject[] {
  const crates = deriveRustCrateCensus(repoRoot);
  const rustSources = fg
    .sync('crates/**/*.rs', {
      cwd: repoRoot,
      onlyFiles: true,
      unique: true,
      ignore: ['crates/*/target/**'],
    })
    .map((path) => path.replaceAll('\\', '/'))
    .sort(codeUnitCompare);
  if (rustSources.length === 0) throw new TypeError('Rust formatting census discovered zero crates/**/*.rs subjects');

  const claimed = new Set<string>();
  const subjects = crates.map((crate) => {
    const crateRoot = `${dirname(crate.manifestPath).replaceAll('\\', '/')}/`;
    const sourcePaths = rustSources.filter((path) => path.startsWith(crateRoot));
    if (sourcePaths.length === 0) throw new TypeError(`${crate.manifestPath} owns zero Rust source subjects`);
    for (const path of sourcePaths) {
      if (claimed.has(path)) throw new TypeError(`Rust source subject ${path} is claimed by multiple Cargo manifests`);
      claimed.add(path);
    }
    return Object.freeze({
      manifestPath: crate.manifestPath,
      lockPath: crate.lockPath,
      edition: crate.edition,
      sourcePaths: Object.freeze(sourcePaths),
    });
  });

  const unclaimed = rustSources.filter((path) => !claimed.has(path));
  if (unclaimed.length > 0) {
    throw new TypeError(`Rust source subjects have no crates/* Cargo owner: ${unclaimed.join(', ')}`);
  }
  return Object.freeze(subjects);
}

/** Exact shell-free rustfmt argv for one derived Cargo subject. */
export function rustfmtArgv(subject: RustfmtSubject, check: boolean): readonly string[] {
  return Object.freeze(['--edition', subject.edition, ...(check ? ['--check'] : []), ...subject.sourcePaths]);
}

/** Bind one formatter invocation to the channel derived from rust-toolchain.toml. */
export function pinnedRustfmtInvocation(
  rustToolchainSource: string,
  subject: RustfmtSubject,
  check: boolean,
): PinnedRustfmtInvocation {
  return Object.freeze({
    command: 'rustup',
    argv: Object.freeze([
      'run',
      deriveRustToolchainChannel(rustToolchainSource),
      'rustfmt',
      ...rustfmtArgv(subject, check),
    ]),
  });
}
