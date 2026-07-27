/**
 * Strict loader for replayable escaped-defect fixtures.
 *
 * Historical source bytes are immutable calibration evidence. Lifecycle
 * admission is separate metadata: a case may later become structurally
 * precluded in current product code without rewriting the original reproducer.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { CanonicalCbor, sha256Hex } from '@liteship/canonical';
import type { CureArtifact } from '@liteship/command';
import { IntegrityDigest } from '@liteship/core';

export interface HistoricalDefectCase {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly historicalSourceSha: string;
  readonly owner: string;
  readonly apiDeclarationFile: string;
  readonly sourceFiles: readonly string[];
  readonly expected: {
    readonly connectedSubjects: readonly string[];
    readonly orphanSubjects: readonly string[];
  };
  readonly admission:
    | { readonly kind: 'replayable'; readonly proof: string }
    | { readonly kind: 'structurally-precluded'; readonly replayProof: string; readonly preclusionProof: string };
}

export interface LoadedHistoricalDefect {
  readonly caseFile: HistoricalDefectCase;
  readonly fixturePath: string;
  readonly apiDeclarationFile: string;
  readonly sourceFiles: readonly string[];
  readonly artifacts: readonly CureArtifact[];
  readonly treeDigest: ReturnType<typeof IntegrityDigest>;
}

function plainRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) {
    throw new Error(`${label} keys must be exactly [${expected.join(', ')}], received [${actual.join(', ')}]`);
  }
}

function stringField(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label}.${key} must be a non-empty string`);
  return value;
}

function stringArray(record: Record<string, unknown>, key: string, label: string): readonly string[] {
  const value = record[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === 'string' && entry.trim() !== '')
  ) {
    throw new Error(`${label}.${key} must be a non-empty string array`);
  }
  return Object.freeze([...value]);
}

/** Strictly decode one historical defect case. */
export function decodeHistoricalDefectCase(value: unknown): HistoricalDefectCase {
  const root = plainRecord(value, 'case');
  exactKeys(
    root,
    [
      'schemaVersion',
      'id',
      'historicalSourceSha',
      'owner',
      'apiDeclarationFile',
      'sourceFiles',
      'expected',
      'admission',
    ],
    'case',
  );
  if (root.schemaVersion !== 1) throw new Error('case.schemaVersion must be 1');
  const historicalSourceSha = stringField(root, 'historicalSourceSha', 'case');
  if (!/^[0-9a-f]{40}$/u.test(historicalSourceSha))
    throw new Error('case.historicalSourceSha must be a 40-character git SHA');
  const expected = plainRecord(root.expected, 'case.expected');
  exactKeys(expected, ['connectedSubjects', 'orphanSubjects'], 'case.expected');
  const admission = plainRecord(root.admission, 'case.admission');
  const kind = stringField(admission, 'kind', 'case.admission');
  let decodedAdmission: HistoricalDefectCase['admission'];
  if (kind === 'replayable') {
    exactKeys(admission, ['kind', 'proof'], 'case.admission');
    decodedAdmission = { kind, proof: stringField(admission, 'proof', 'case.admission') };
  } else if (kind === 'structurally-precluded') {
    exactKeys(admission, ['kind', 'replayProof', 'preclusionProof'], 'case.admission');
    decodedAdmission = {
      kind,
      replayProof: stringField(admission, 'replayProof', 'case.admission'),
      preclusionProof: stringField(admission, 'preclusionProof', 'case.admission'),
    };
  } else {
    throw new Error(`case.admission.kind must be replayable or structurally-precluded, received ${kind}`);
  }
  return Object.freeze({
    schemaVersion: 1,
    id: stringField(root, 'id', 'case'),
    historicalSourceSha,
    owner: stringField(root, 'owner', 'case'),
    apiDeclarationFile: stringField(root, 'apiDeclarationFile', 'case'),
    sourceFiles: stringArray(root, 'sourceFiles', 'case'),
    expected: Object.freeze({
      connectedSubjects: stringArray(expected, 'connectedSubjects', 'case.expected'),
      orphanSubjects: stringArray(expected, 'orphanSubjects', 'case.expected'),
    }),
    admission: Object.freeze(decodedAdmission),
  });
}

function safeFixtureFile(repoRoot: string, fixturePath: string, file: string): { absolute: string; relative: string } {
  if (isAbsolute(file)) throw new Error(`historical defect source must be fixture-relative: ${file}`);
  const fixtureRoot = resolve(repoRoot, fixturePath);
  const absolute = resolve(fixtureRoot, file);
  const escape = relative(fixtureRoot, absolute);
  if (escape.startsWith('..') || isAbsolute(escape))
    throw new Error(`historical defect source escapes fixture: ${file}`);
  return { absolute, relative: relative(repoRoot, absolute).split(sep).join('/') };
}

/** Load, address, and normalize one retained escaped-defect case. */
export function loadHistoricalDefect(repoRoot: string, fixturePath: string): LoadedHistoricalDefect {
  const manifestPath = resolve(repoRoot, fixturePath, 'case.json');
  const caseFile = decodeHistoricalDefectCase(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const sourceRecords = caseFile.sourceFiles
    .map((file) => safeFixtureFile(repoRoot, fixturePath, file))
    .sort((a, b) => a.relative.localeCompare(b.relative));
  const artifacts = sourceRecords.map(({ absolute, relative: path }): CureArtifact => ({
    path,
    digest: IntegrityDigest(`sha256:${sha256Hex(readFileSync(absolute))}`),
  }));
  const treeDigest = IntegrityDigest(
    `sha256:${sha256Hex(CanonicalCbor.encode(artifacts.map((artifact) => [artifact.path, artifact.digest])))}`,
  );
  const apiDeclarationFile = safeFixtureFile(repoRoot, fixturePath, caseFile.apiDeclarationFile).relative;
  return Object.freeze({
    caseFile,
    fixturePath,
    apiDeclarationFile,
    sourceFiles: Object.freeze(sourceRecords.map((record) => record.relative)),
    artifacts: Object.freeze(artifacts),
    treeDigest,
  });
}
