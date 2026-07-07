/**
 * Tier 0.4 guard — every manifest capsule with a classified-real generated bench
 * presamples inputs and its handler runs without throwing (fast meta lane; no
 * `vitest run *.bench.ts` inside the mutating capsule:verify gate).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import * as fc from 'fast-check';
import { classifyBenchSource, schemaToArbitrary } from '@czap/core/harness';
import { getCapsuleManifestPath } from '@czap/command/host';
import { repoRoot, scaledTimeout } from '../../../vitest.shared.ts';

interface ManifestEntry {
  readonly name: string;
  readonly generated: { readonly benchFile: string };
  readonly benchExemption?: { readonly reason: string };
}

interface CapsuleManifest {
  readonly capsules: readonly ManifestEntry[];
}

const PRESAMPLE_RE = /fc\.sample\(\s*arb\s*,\s*\{\s*numRuns:\s*64\s*,\s*seed:\s*0x5eed\s*\}\s*\)/;
const CAP_IMPORT_RE = /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]([^'"]+)['"]/g;
const CAP_BINDING_RE = /const\s+cap\s*=\s*(\w+)\s*;/;
const HANDLER_RE = /const\s+(\w+)\s*=\s*cap\.(\w+)!;/;

function parseCapsuleImport(src: string): { exportName: string; importPath: string } | null {
  for (const match of src.matchAll(CAP_IMPORT_RE)) {
    const [, exportName, importPath] = match;
    if (importPath.includes('vitest') || importPath.includes('fast-check')) continue;
    if (exportName === undefined || importPath === undefined) continue;
    return { exportName, importPath };
  }
  return null;
}

function loadManifest(): CapsuleManifest | null {
  const path = getCapsuleManifestPath(repoRoot);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as CapsuleManifest;
}

function catalogRealPresampleBenches(): readonly { benchFile: string }[] {
  const manifest = loadManifest();
  if (manifest !== null) {
    return manifest.capsules
      .filter((cap) => cap.benchExemption === undefined)
      .map((cap) => cap.generated.benchFile)
      .filter((rel) => {
        const abs = resolve(repoRoot, rel);
        if (!existsSync(abs)) return false;
        const src = readFileSync(abs, 'utf8');
        return classifyBenchSource(src) === 'real' && PRESAMPLE_RE.test(src);
      })
      .map((benchFile) => ({ benchFile }));
  }

  return readdirSync(resolve(repoRoot, 'tests/generated'))
    .filter((name) => name.endsWith('.bench.ts'))
    .map((name) => join('tests/generated', name))
    .filter((rel) => {
      const src = readFileSync(resolve(repoRoot, rel), 'utf8');
      return classifyBenchSource(src) === 'real' && PRESAMPLE_RE.test(src);
    })
    .map((benchFile) => ({ benchFile }));
}

async function invokeHandler(
  cap: Record<string, unknown>,
  handlerKey: string,
  sample: unknown,
): Promise<void> {
  const handler = cap[handlerKey];
  expect(typeof handler).toBe('function');
  if (handlerKey === 'step' && cap.initialState !== undefined) {
    const state = structuredClone(cap.initialState);
    const result = (handler as (s: unknown, e: unknown) => unknown)(state, sample);
    if (result instanceof Promise) await result;
    return;
  }
  const result = (handler as (input: unknown) => unknown)(sample);
  if (result instanceof Promise) await result;
}

async function exercisePresampleBench(benchFile: string): Promise<void> {
  const src = readFileSync(resolve(repoRoot, benchFile), 'utf8');
  const capImport = parseCapsuleImport(src);
  const bindingMatch = CAP_BINDING_RE.exec(src);
  const handlerMatch = HANDLER_RE.exec(src);
  expect(capImport, `${benchFile}: missing capsule import`).not.toBeNull();
  expect(bindingMatch, `${benchFile}: missing cap binding`).not.toBeNull();
  expect(handlerMatch, `${benchFile}: missing handler binding`).not.toBeNull();

  const { exportName, importPath } = capImport!;
  const [, boundName] = bindingMatch!;
  const [, , handlerKey] = handlerMatch!;
  expect(boundName, `${benchFile}: cap binding must match import`).toBe(exportName);

  const mod = (await import(resolve(dirname(resolve(repoRoot, benchFile)), importPath))) as Record<
    string,
    unknown
  >;
  const cap = mod[exportName] as Record<string, unknown>;
  expect(cap, `${benchFile}: capsule export ${exportName}`).toBeDefined();

  const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const samples = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
  expect(samples.length, `${benchFile}: presampled inputs`).toBeGreaterThan(0);

  await invokeHandler(cap, handlerKey!, samples[0]!);
}

describe('generated bench execution — presample + handler smoke', () => {
  const benches = catalogRealPresampleBenches();

  it('catalog is non-empty (at least one real presample bench exists)', () => {
    expect(benches.length).toBeGreaterThan(0);
  });

  it.each(benches.map((b) => [basename(b.benchFile), b.benchFile] as const))(
    '%s presamples inputs and runs its handler once',
    async (_label, benchFile) => {
      await exercisePresampleBench(benchFile);
    },
    scaledTimeout(30_000),
  );
});
