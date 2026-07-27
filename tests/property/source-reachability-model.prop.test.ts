/** Model and adversarial laws for source-graph reachability. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import {
  normalizeSourcePath,
  sourceFilesUnder,
  sourceImportClosure,
  unreachableSourceFiles,
} from '../../scripts/lib/source-import-contract.js';

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-reachability-model-'));
  fixtureRoots.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  return root;
}

type EdgeKind = 'dynamic' | 'export' | 'runtime' | 'type';
interface Edge {
  readonly from: number;
  readonly kind: EdgeKind;
  readonly to: number;
}

function reachableModel(nodeCount: number, edges: readonly Edge[]): readonly string[] {
  const queue = [0];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const edge of edges) if (edge.from === node && !visited.has(edge.to)) queue.push(edge.to);
  }
  return [...visited].map((node) => `src/n${node}.ts`).sort();
}

function edgeStatement(edge: Edge): string {
  const suffix = `${edge.from}_${edge.to}`;
  switch (edge.kind) {
    case 'dynamic':
      return `void import('./n${edge.to}.js');`;
    case 'export':
      return `export { value as value_${suffix} } from './n${edge.to}.js';`;
    case 'runtime':
      return `import './n${edge.to}.js';`;
    case 'type':
      return `import type { Model as Model_${suffix} } from './n${edge.to}.js';\ntype Type_${suffix} = Model_${suffix};`;
  }
}

describe('source import closure model', () => {
  it('equals an independent BFS across arbitrary cycles and every static edge syntax', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.array(
          fc.record({
            from: fc.integer({ min: 0, max: 8 }),
            to: fc.integer({ min: 0, max: 8 }),
            kind: fc.constantFrom<EdgeKind>('runtime', 'type', 'export', 'dynamic'),
          }),
          { maxLength: 45 },
        ),
        (nodeCount, candidates) => {
          const root = fixture();
          const byPair = new Map<string, Edge>();
          for (const candidate of candidates) {
            const edge = { ...candidate, from: candidate.from % nodeCount, to: candidate.to % nodeCount };
            byPair.set(`${edge.from}:${edge.to}`, edge);
          }
          const edges = [...byPair.values()];
          for (let node = 0; node < nodeCount; node += 1) {
            const statements = edges.filter((edge) => edge.from === node).map(edgeStatement);
            writeFileSync(
              join(root, 'src', `n${node}.ts`),
              [
                `export interface Model { readonly node: ${node} }`,
                `export const value = ${node};`,
                ...statements,
              ].join('\n'),
            );
          }

          expect(sourceImportClosure(root, ['src/n0.ts'])).toEqual(reachableModel(nodeCount, edges));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('prefers source owners over stale JavaScript and resolves extensionless directories to source indexes', () => {
    const root = fixture();
    mkdirSync(join(root, 'src', 'feature'));
    writeFileSync(join(root, 'src', 'entry.ts'), "import './dep.js';\nimport './feature';\n");
    writeFileSync(join(root, 'src', 'dep.ts'), "import './source-leaf.js';\n");
    writeFileSync(join(root, 'src', 'dep.js'), "import './stale-built-leaf.js';\n");
    writeFileSync(join(root, 'src', 'source-leaf.ts'), 'export const source = true;\n');
    writeFileSync(join(root, 'src', 'stale-built-leaf.ts'), 'export const stale = true;\n');
    writeFileSync(join(root, 'src', 'feature', 'index.ts'), 'export const feature = true;\n');

    expect(sourceImportClosure(root, ['src/entry.ts'])).toEqual([
      'src/dep.ts',
      'src/entry.ts',
      'src/feature/index.ts',
      'src/source-leaf.ts',
    ]);
  });

  it('recursively inventories private sources and never lets an orphan cycle hide behind internal/', () => {
    const root = fixture();
    mkdirSync(join(root, 'src', 'internal', 'nested'), { recursive: true });
    writeFileSync(join(root, 'src', 'entry.ts'), "import './internal/reachable-a.js';\n");
    writeFileSync(join(root, 'src', 'internal', 'reachable-a.ts'), "import './reachable-b.js';\n");
    writeFileSync(join(root, 'src', 'internal', 'reachable-b.ts'), "import './reachable-a.js';\n");
    writeFileSync(join(root, 'src', 'internal', 'nested', 'orphan-a.ts'), "import './orphan-b.js';\n");
    writeFileSync(join(root, 'src', 'internal', 'nested', 'orphan-b.ts'), "import './orphan-a.js';\n");
    writeFileSync(join(root, 'src', 'internal', 'nested', 'notes.txt'), 'not source');

    expect(sourceFilesUnder(root, 'src/internal')).toEqual([
      'src/internal/nested/orphan-a.ts',
      'src/internal/nested/orphan-b.ts',
      'src/internal/reachable-a.ts',
      'src/internal/reachable-b.ts',
    ]);
    expect(unreachableSourceFiles(root, ['src/entry.ts'], ['src/internal'])).toEqual([
      'src/internal/nested/orphan-a.ts',
      'src/internal/nested/orphan-b.ts',
    ]);
  });

  it('normalizes Windows and mixed separators into one portable receipt spelling', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9_-]{1,12}$/u), { minLength: 1, maxLength: 8 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        (segments, separators) => {
          const mixed = segments
            .slice(1)
            .reduce(
              (path, segment, index) => `${path}${separators[index % separators.length] ? '\\' : '/'}${segment}`,
              `C:\\${segments[0]}`,
            );
          expect(normalizeSourcePath(mixed)).toBe(`C:/${segments.join('/')}`);
          expect(normalizeSourcePath(mixed)).not.toContain('\\');
        },
      ),
      { numRuns: 80 },
    );
  });

  it('keeps the live CLI internal cluster recursively reachable from admitted roots', () => {
    const repoRoot = resolve(import.meta.dirname, '../..');
    const scriptRoots = sourceFilesUnder(repoRoot, 'scripts').filter(
      (path) => path.startsWith('scripts/') && !path.slice('scripts/'.length).includes('/'),
    );
    expect(
      unreachableSourceFiles(
        repoRoot,
        ['packages/cli/src/index.ts', 'packages/cli/src/bin.ts', 'packages/cli/src/spawn-helpers.ts', ...scriptRoots],
        ['packages/cli/src/internal'],
      ),
      'internal/ is a privacy boundary, never unreachable-code amnesty',
    ).toEqual([]);
  });
});
