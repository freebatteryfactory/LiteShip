#!/usr/bin/env tsx
/**
 * Docs-bundle emitter (#113) — seals TypeDoc + prose docs behind a
 * content-addressed manifest for agent consumption.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRepoPath } from '@liteship/core';
import { walkFiles } from '@liteship/core/fs-walk';
import { computeBundleId } from '../packages/astro/src/docs-bundle-id.js';

const REPO_ROOT = join(import.meta.dirname, '..');
const DEFAULT_SOURCES = [
  'docs/api',
  'ARCHITECTURE.md',
  'ASTRO-RUNTIME-MODEL.md',
  'GETTING-STARTED.md',
  'PACKAGE-SURFACES.md',
  'GLOSSARY.md',
] as const;

export interface DocsBundleManifestEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface DocsBundleManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly entries: readonly DocsBundleManifestEntry[];
  readonly bundleId: string;
}

async function sha256File(abs: string): Promise<{ sha256: string; bytes: number }> {
  const { createHash } = await import('node:crypto');
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(abs);
  return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

function collectFiles(root: string, relBase: string, out: string[]): void {
  if (!existsSync(root)) return;
  const st = statSync(root);
  if (st.isFile()) {
    out.push(relBase);
    return;
  }
  for (const abs of walkFiles(root, { suffixes: ['.md', '.json'] })) {
    out.push(join(relBase, abs.slice(root.length + 1)));
  }
}

export async function emitDocsBundle(opts: {
  readonly outDir: string;
  readonly sources?: readonly string[];
  readonly version?: string;
}): Promise<DocsBundleManifest> {
  const sources = opts.sources ?? DEFAULT_SOURCES;
  const files: string[] = [];
  for (const source of sources) {
    collectFiles(join(REPO_ROOT, source), source, files);
  }

  const entries: DocsBundleManifestEntry[] = [];
  for (const rel of files.sort()) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    const { sha256, bytes } = await sha256File(abs);
    entries.push({ path: normalizeRepoPath(rel), sha256, bytes });
    mkdirSync(join(opts.outDir, 'files'), { recursive: true });
    writeFileSync(join(opts.outDir, 'files', rel.replace(/[\\/]/g, '__')), readFileSync(abs));
  }

  const version =
    opts.version ??
    JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8') as { version: string }).version;
  const bundleId = computeBundleId(entries);
  const manifest: DocsBundleManifest = {
    version,
    generatedAt: new Date().toISOString(),
    entries,
    bundleId,
  };

  mkdirSync(opts.outDir, { recursive: true });
  writeFileSync(join(opts.outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1]?.endsWith('docs-bundle.ts')) {
  const outDir = process.argv[2] ?? join(REPO_ROOT, 'dist', 'docs-bundle');
  const manifest = await emitDocsBundle({ outDir });
  console.log(`docs:bundle → ${outDir} (${manifest.entries.length} files, bundleId=${manifest.bundleId.slice(0, 12)}…)`);
}
