import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveRustfmtSubjects, pinnedRustfmtInvocation, rustfmtArgv } from '../../../scripts/lib/rustfmt-contract.js';

const ROOT = resolve(import.meta.dirname, '../../..');

function writeCrate(root: string, directory: string, sources: readonly string[]): void {
  const crateRoot = resolve(root, 'crates', directory);
  mkdirSync(resolve(crateRoot, 'src'), { recursive: true });
  writeFileSync(
    resolve(crateRoot, 'Cargo.toml'),
    `[package]\nname = "${directory}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n\n[features]\ndefault = []\n`,
    'utf8',
  );
  writeFileSync(
    resolve(crateRoot, 'Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "${directory}"\nversion = "0.1.0"\n`,
    'utf8',
  );
  for (const source of sources) writeFileSync(resolve(crateRoot, 'src', source), 'pub fn planted ( ) { }\n', 'utf8');
}

describe('check/rustfmt derived subjects', () => {
  it('covers every live Rust source through its independently-derived Cargo owner', () => {
    const subjects = deriveRustfmtSubjects(ROOT);
    expect(subjects).toEqual([
      {
        manifestPath: 'crates/liteship-compute/Cargo.toml',
        lockPath: 'crates/liteship-compute/Cargo.lock',
        edition: '2021',
        sourcePaths: [
          'crates/liteship-compute/src/blend.rs',
          'crates/liteship-compute/src/boundary.rs',
          'crates/liteship-compute/src/lib.rs',
          'crates/liteship-compute/src/spring.rs',
        ],
      },
    ]);
    expect(rustfmtArgv(subjects[0]!, true)).toEqual(['--edition', '2021', '--check', ...subjects[0]!.sourcePaths]);
  });

  it('enrolls a planted second crate and otherwise-unreferenced Rust file without an allowlist', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rustfmt-census-'));
    try {
      writeCrate(root, 'alpha', ['lib.rs']);
      writeCrate(root, 'hidden', ['lib.rs', 'orphan.rs']);
      expect(deriveRustfmtSubjects(root).map((subject) => [subject.manifestPath, subject.sourcePaths])).toEqual([
        ['crates/alpha/Cargo.toml', ['crates/alpha/src/lib.rs']],
        ['crates/hidden/Cargo.toml', ['crates/hidden/src/lib.rs', 'crates/hidden/src/orphan.rs']],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('invokes rustfmt only through rustup with the exact channel derived from the supplied toolchain authority', () => {
    const subject = deriveRustfmtSubjects(ROOT)[0]!;
    const invocation = pinnedRustfmtInvocation('[toolchain]\nchannel = "9.8.7"\nprofile = "minimal"\n', subject, true);

    expect(invocation).toEqual({
      command: 'rustup',
      argv: ['run', '9.8.7', 'rustfmt', '--edition', '2021', '--check', ...subject.sourcePaths],
    });
    expect(invocation.command).not.toBe('rustfmt');
    expect(() => pinnedRustfmtInvocation('[toolchain]\nchannel = "stable"\n', subject, true)).toThrow(
      'toolchain.channel must be an exact X.Y.Z version',
    );
  });

  it('fails closed when a discovered Cargo subject owns no Rust source', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'liteship-rustfmt-empty-'));
    try {
      writeCrate(root, 'live', ['lib.rs']);
      writeCrate(root, 'empty', []);
      expect(() => deriveRustfmtSubjects(root)).toThrow('crates/empty/Cargo.toml owns zero Rust source subjects');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
