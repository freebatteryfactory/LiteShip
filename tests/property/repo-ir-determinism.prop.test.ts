// PROVES: INV-REPO-IR-DETERMINISTIC
/**
 * Determinism law — `buildRepoIR` is IDEMPOTENT: building the IR twice over the
 * SAME source corpus yields BYTE-IDENTICAL per-file `contentDigest`s and an
 * identical overall IR fold (files + symbols + facts + imports). This is the
 * keystone the B2 content-addressed verdict cache stands on: if the IR a covered
 * file resolves to is not byte-stable, the cache key built from it would flap and
 * a stale "green" could be served (or a clean re-run needlessly missed). The
 * builder's own module doc PROMISES this ("Building twice over unchanged source
 * yields a byte-stable IR"); this test holds it to the promise.
 *
 * The proof is property-based over a randomized-but-deterministic corpus (a seeded
 * fast-check arbitrary of small TS files): for EVERY generated corpus, two
 * independent `buildRepoIR` passes must agree on every per-file digest and on the
 * canonical IR fold. A non-determinism leak (an mtime/run-id sneaking into a
 * digest, an unsorted table, a `Map` iteration-order dependence) would make the
 * two passes diverge on some seed — the test would catch it.
 *
 * @module
 */

import { describe, it, expect, afterEach } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { buildRepoIR, resolveDevopsProfile, type DevopsProfile } from '@liteship/audit';
import { coverageDigestOf, type RepoIR, type FileId } from '@liteship/gauntlet';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-ir-determinism-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

function acmeProfile(root: string): DevopsProfile {
  return resolveDevopsProfile({
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
  });
}

/** The canonical deterministic fold over an IR — the per-file digest fold (the
 *  SAME order-independent `coverageDigestOf` the verdict cache uses), plus the
 *  symbol/fact/import surfaces folded stably. Two IRs with this same string are
 *  structurally identical for cache-identity purposes. */
function irFold(ir: RepoIR): string {
  const fileIds: FileId[] = [...ir.files.keys()];
  const fileDigests = coverageDigestOf(fileIds, ir);
  const symbols = [...ir.symbols.values()]
    .map((s) => `${s.id}|${s.kind}|${s.location.line}`)
    .sort()
    .join('\n');
  const facts = ir.facts
    .map((f) => `${f.file}|${f.line ?? 0}|${f.oracleId}|${f.property}|${String(f.value)}`)
    .sort()
    .join('\n');
  const imports = ir.imports
    .map((e) => `${e.fromFile}|${e.specifier}|${e.kind}|${e.targetFile ?? ''}`)
    .sort()
    .join('\n');
  return [fileDigests, symbols, facts, imports].join('␞');
}

/** A small, valid-TS source file body — varied enough to exercise symbols/facts. */
const tsFileArb = fc.record({
  name: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
  exportConst: fc.boolean(),
  exportFn: fc.boolean(),
  exportType: fc.boolean(),
  value: fc.integer({ min: 0, max: 999 }),
});

function renderTsFile(spec: {
  name: string;
  exportConst: boolean;
  exportFn: boolean;
  exportType: boolean;
  value: number;
}): string {
  const lines: string[] = ['// generated determinism fixture'];
  if (spec.exportType) lines.push(`export interface T_${spec.name} { readonly n: number; }`);
  if (spec.exportConst) lines.push(`export const c_${spec.name} = ${spec.value};`);
  if (spec.exportFn) lines.push(`export function f_${spec.name}(): number { return ${spec.value}; }`);
  // Always at least one export so the file is non-trivial.
  if (!spec.exportType && !spec.exportConst && !spec.exportFn) {
    lines.push(`export const d_${spec.name} = ${spec.value};`);
  }
  return lines.join('\n') + '\n';
}

describe('buildRepoIR determinism (INV-REPO-IR-DETERMINISTIC)', () => {
  it('builds a BYTE-IDENTICAL IR twice over the same corpus — per-file digests + the full fold', () => {
    fc.assert(
      fc.property(fc.uniqueArray(tsFileArb, { minLength: 1, maxLength: 5, selector: (s) => s.name }), (specs) => {
        const files: Record<string, string> = {
          'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
          'packages/core/package.json': JSON.stringify({
            name: '@acme/core',
            version: '0.0.0',
            dependencies: {},
            exports: { '.': { development: './src/index.ts' } },
          }),
        };
        for (const spec of specs) {
          files[`packages/core/src/mod_${spec.name}.ts`] = renderTsFile(spec);
        }
        const root = makeFixture(files);
        const profile = acmeProfile(root);

        const first = buildRepoIR(profile);
        const second = buildRepoIR(profile);

        // Every per-file digest is identical (no mtime/run-id leaked into it).
        for (const [id, node] of first.files) {
          expect(second.files.get(id)?.contentDigest).toBe(node.contentDigest);
        }
        // The full canonical fold is byte-identical (tables sorted, no Map-order leak).
        expect(irFold(second)).toBe(irFold(first));
      }),
      // Each run spins a full ts.Program over a temp corpus (heavy), so a small
      // seeded run count is the right trade — determinism is a structural law a
      // handful of varied corpora exercises decisively, not a rare-event hunt.
      { numRuns: 6, seed: 0xb2cace },
    );
  }, scaledTimeout(60_000));

  it('a single edited byte CHANGES that file digest (the digest tracks content, the cache-miss trigger)', () => {
    const base = {
      'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
      'packages/core/package.json': JSON.stringify({
        name: '@acme/core',
        version: '0.0.0',
        dependencies: {},
        exports: { '.': { development: './src/index.ts' } },
      }),
      'packages/core/src/index.ts': 'export const x = 1;\n',
    };
    const rootA = makeFixture(base);
    const irA = buildRepoIR(acmeProfile(rootA));

    const rootB = makeFixture({ ...base, 'packages/core/src/index.ts': 'export const x = 2;\n' });
    const irB = buildRepoIR(acmeProfile(rootB));

    const digestA = irA.files.get('packages/core/src/index.ts')?.contentDigest;
    const digestB = irB.files.get('packages/core/src/index.ts')?.contentDigest;
    expect(digestA).toBeDefined();
    expect(digestB).toBeDefined();
    // A content change MUST flip the digest — else a covered edit would cache-hit
    // a stale verdict (the exact B2 anti-lie hazard).
    expect(digestB).not.toBe(digestA);
  });
});
