/** Content-addressed local receipt for an exact successful TypeDoc projection. @module */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { buildTypeDocInputFingerprint } from './typedoc-input-fingerprint.js';

export interface TypeDocProofIdentity {
  readonly schema: 'liteship/typedoc-proof-identity@1';
  readonly proofKey: `sha256:${string}`;
  readonly inputDigest: `sha256:${string}`;
  readonly outputDigest: `sha256:${string}`;
  readonly toolchainDigest: `sha256:${string}`;
  readonly environment: string;
}

export interface TypeDocProofReceipt extends TypeDocProofIdentity {
  readonly status: 'passed';
}

function digestParts(parts: readonly (string | Buffer)[]): `sha256:${string}` {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(typeof part === 'string' ? Buffer.from(part, 'utf8') : part);
    hash.update('\0', 'utf8');
  }
  return `sha256:${hash.digest('hex')}`;
}

function walkFiles(directory: string): readonly string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  visit(directory);
  return files.sort((left, right) => left.localeCompare(right));
}

export function countTypeDocMarkdown(directory: string): number {
  return walkFiles(directory).filter((path) => path.endsWith('.md')).length;
}

/** Refuse an empty or mass-truncated TypeDoc projection, including laundered OOM output. */
export function assertCompleteTypeDocProjection(committedCount: number, freshCount: number): void {
  if (freshCount === 0 || (committedCount > 0 && freshCount < committedCount * 0.9)) {
    throw new Error(
      `the fresh TypeDoc build produced ${freshCount} pages versus ${committedCount} committed; ` +
        'the build did not finish (typically an out-of-memory abort laundered to exit 0)',
    );
  }
}

export function digestTypeDocOutput(repoRoot: string): `sha256:${string}` {
  const outputRoot = resolve(repoRoot, 'docs', 'api');
  return digestParts(
    walkFiles(outputRoot).flatMap((path) => [relative(outputRoot, path).replaceAll('\\', '/'), readFileSync(path)]),
  );
}

export function createTypeDocProofIdentity(input: {
  readonly inputDigest: `sha256:${string}`;
  readonly outputDigest: `sha256:${string}`;
  readonly toolchainDigest: `sha256:${string}`;
  readonly environment: string;
}): TypeDocProofIdentity {
  const normalized = {
    inputDigest: input.inputDigest,
    outputDigest: input.outputDigest,
    toolchainDigest: input.toolchainDigest,
    environment: input.environment,
  } as const;
  const payload = JSON.stringify(normalized);
  return Object.freeze({
    schema: 'liteship/typedoc-proof-identity@1',
    proofKey: digestParts([payload]),
    ...normalized,
  });
}

/** Build a conservative identity over sources, committed output, tools, and host. */
export function buildTypeDocProofIdentity(repoRoot: string): TypeDocProofIdentity {
  const fingerprint = buildTypeDocInputFingerprint(repoRoot);
  const toolchainPaths = [
    'package.json',
    'pnpm-lock.yaml',
    'typedoc.json',
    'scripts/docs-build.ts',
    'scripts/docs-check.ts',
    'scripts/docs-input-fingerprint.ts',
    'scripts/lib/local-resource-profile.ts',
    'scripts/lib/typedoc-build-pipeline.ts',
    'scripts/lib/typedoc-input-fingerprint.ts',
    'scripts/lib/typedoc-proof-cache.ts',
  ];
  const toolchainDigest = digestParts(toolchainPaths.flatMap((path) => [path, readFileSync(resolve(repoRoot, path))]));
  return createTypeDocProofIdentity({
    inputDigest: fingerprint.digest,
    outputDigest: digestTypeDocOutput(repoRoot),
    toolchainDigest,
    environment: `${process.platform}/${process.arch}/node-${process.version}`,
  });
}

function receiptPath(repoRoot: string, proofKey: string): string {
  return resolve(repoRoot, '.liteship', 'cache', 'typedoc', `${proofKey.slice('sha256:'.length)}.json`);
}

function isMatchingReceipt(value: unknown, identity: TypeDocProofIdentity): value is TypeDocProofReceipt {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TypeDocProofReceipt>;
  return (
    candidate.schema === identity.schema &&
    candidate.status === 'passed' &&
    candidate.proofKey === identity.proofKey &&
    candidate.inputDigest === identity.inputDigest &&
    candidate.outputDigest === identity.outputDigest &&
    candidate.toolchainDigest === identity.toolchainDigest &&
    candidate.environment === identity.environment
  );
}

/** Corrupt, missing, or non-file receipts are safe misses, never green guesses. */
export function readTypeDocProofReceipt(repoRoot: string, identity: TypeDocProofIdentity): TypeDocProofReceipt | null {
  const path = receiptPath(repoRoot, identity.proofKey);
  if (!existsSync(path)) return null;
  try {
    if (!statSync(path).isFile()) return null;
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isMatchingReceipt(parsed, identity) ? parsed : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EACCES' || code === 'EPERM' || code === 'EISDIR') return null;
    throw error;
  }
}

export function writeTypeDocProofReceipt(repoRoot: string, identity: TypeDocProofIdentity): TypeDocProofReceipt {
  const receipt: TypeDocProofReceipt = Object.freeze({ ...identity, status: 'passed' });
  const path = receiptPath(repoRoot, identity.proofKey);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
  return receipt;
}
