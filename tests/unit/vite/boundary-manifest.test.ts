/**
 * Build-side boundary manifest derivation tests.
 *
 * `collectBoundaryManifest` scans a project for boundary definition
 * modules and `@quantize` CSS blocks, then derives the manifest behind
 * `virtual:czap/boundaries`: real `Boundary.make` content addresses plus
 * precompiled outputs for the full (motion x design) tier grid.
 */

import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';
import { tmpdir } from 'node:os';
import { Boundary, Diagnostics } from '@czap/core';
import { enumerateTierKeys, tierKey } from '@czap/edge';
import { collectBoundaryManifest } from '../../../packages/vite/src/boundary-manifest.js';
import { plugin } from '../../../packages/vite/src/plugin.js';
import { loadVirtualModule } from '../../../packages/vite/src/virtual-modules.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'czap-manifest-'));
  tempDirs.push(dir);
  return dir;
}

function writeModule(dir: string, fileName: string, source: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), source);
}

afterEach(() => {
  Diagnostics.reset();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

/**
 * Reference boundary mirroring the fixture module below -- the manifest
 * id must equal this minted address (ADR-0003 identity law).
 */
const referenceBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});

const BOUNDARY_MODULE = `
const states = ['compact', 'wide'];
export const viewport = {
  _tag: 'BoundaryDef',
  _version: 1,
  id: ${JSON.stringify(referenceBoundary.id)},
  input: 'viewport.width',
  thresholds: [0, 768],
  states,
};
`;

const QUANTIZE_CSS = `
@quantize viewport {
  compact {
    --gap: 8px;
  }
  wide {
    --gap: 24px;
  }
}
`;

describe('collectBoundaryManifest', () => {
  test('derives entries with minted ids and full tier-grid outputs from boundary modules + @quantize CSS', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);

    const manifest = await collectBoundaryManifest(root);

    expect(Object.keys(manifest)).toEqual(['viewport']);
    const entry = manifest['viewport']!;
    // Identity is derived, never hand-typed: same address Boundary.make mints.
    expect(entry.id).toBe(referenceBoundary.id);
    expect(entry.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);

    // Outputs cover the full finite tier grid.
    expect(Object.keys(entry.outputsByTier).sort()).toEqual([...enumerateTierKeys()].sort());

    const standard = entry.outputsByTier[tierKey({ motionTier: 'transitions', designTier: 'standard' })]!;
    expect(standard.containerQueries).toContain('@container');
    expect(standard.containerQueries).toContain('width >= 768px');
    // Manifest-served CSS reaches the page WITHOUT the vite transform's
    // sheet-level containment — the outputs must carry their own :root
    // container declaration or the @container queries match nothing.
    expect(standard.containerQueries).toContain(':root');
    expect(standard.containerQueries).toContain('container-type: inline-size');
    expect(standard.propertyRegistrations).toContain('@property --gap');
    expect(standard.css).toContain(standard.propertyRegistrations);
    expect(standard.css).toContain(standard.containerQueries);

    // Reduced motion (`none`) omits @property registrations -- they exist
    // solely to enable GPU-interpolated transitions.
    const reduced = entry.outputsByTier[tierKey({ motionTier: 'none', designTier: 'standard' })]!;
    expect(reduced.propertyRegistrations).toBe('');
    expect(reduced.containerQueries).toBe(standard.containerQueries);
    expect(reduced.css).not.toContain('@property');
  });

  test('boundary without a @quantize block still gets an id entry (empty outputs)', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'boundaries.ts', BOUNDARY_MODULE);

    const manifest = await collectBoundaryManifest(root);

    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
    expect(manifest['viewport']!.outputsByTier).toEqual({});
  });

  test('skips node_modules and dist while scanning', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'node_modules', 'dep'), 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(join(root, 'dist'), 'styles.css', QUANTIZE_CSS);

    const manifest = await collectBoundaryManifest(root);

    expect(manifest).toEqual({});
  });

  test('honors the boundaryDir override outside the walked tree', async () => {
    const root = makeTempDir();
    const defs = makeTempDir();
    writeModule(defs, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(join(root, 'src'), 'styles.css', QUANTIZE_CSS);

    const manifest = await collectBoundaryManifest(root, { boundaryDir: defs });

    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
    expect(Object.keys(manifest['viewport']!.outputsByTier)).toHaveLength(enumerateTierKeys().length);
  });

  test('scan terminates on circular directory symlinks and still derives the right entries', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);
    try {
      // Circular link: src/loop -> root, so a walk without a visited set
      // would recurse root -> src -> loop -> src -> ... forever.
      symlinkSync(root, join(srcDir, 'loop'), 'dir');
    } catch {
      // Windows without symlink privilege -- the plain walks above cover the scan.
      return;
    }

    const manifest = await collectBoundaryManifest(root);

    expect(Object.keys(manifest)).toEqual(['viewport']);
    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
    expect(Object.keys(manifest['viewport']!.outputsByTier)).toHaveLength(enumerateTierKeys().length);
  });

  test('follows symlinked directories to boundary definitions outside the project tree', async () => {
    const root = makeTempDir();
    const external = makeTempDir();
    writeModule(external, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(join(root, 'src'), 'styles.css', QUANTIZE_CSS);
    try {
      symlinkSync(external, join(root, 'src', 'defs'), 'dir');
    } catch {
      // Windows without symlink privilege -- the boundaryDir override test covers external defs.
      return;
    }

    const manifest = await collectBoundaryManifest(root);

    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
  });

  test('@quantize block referencing an unknown boundary is skipped with a diagnostic, not crashed on', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'styles.css', QUANTIZE_CSS.replace('viewport', 'ghost'));

    const manifest = await collectBoundaryManifest(root);

    expect(manifest).toEqual({});
  });
});

describe('plugin virtual:czap/boundaries wiring', () => {
  function makeModuleGraphMock() {
    const invalidated: string[] = [];
    const manifestModule = { id: '\0virtual:czap/boundaries' };
    return {
      invalidated,
      moduleGraph: {
        idToModuleMap: new Map<string, { id: string }>(),
        getModuleById(id: string) {
          return id === manifestModule.id ? manifestModule : undefined;
        },
        invalidateModule(mod: { id: string }) {
          invalidated.push(mod.id);
        },
      },
    };
  }

  test('plugin load serves the collected manifest and hotUpdate refreshes it after definition changes', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const first = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(first).toContain(referenceBoundary.id);
    expect(first).not.toBe('export const boundaries = {};');

    // A new definition file appears; hotUpdate must drop the cached
    // manifest and invalidate the virtual module so importers reload.
    writeModule(srcDir, 'extra.boundaries.ts', BOUNDARY_MODULE.replace('viewport', 'sidebar'));
    const { invalidated, moduleGraph } = makeModuleGraphMock();
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'extra.boundaries.ts') },
    );
    expect(invalidated).toContain('\0virtual:czap/boundaries');

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('sidebar');
    expect(second).toContain('viewport');
  });

  test('duplicate declarations across CSS files merge deterministically and warn on conflicts', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    // Sorted path order: a.css before b.css — b's conflicting value wins
    // deterministically, and the conflict surfaces as a teaching warning.
    writeModule(srcDir, 'a.css', '@quantize viewport { compact { gap: 4px; color: red; } }');
    writeModule(srcDir, 'b.css', '@quantize viewport { compact { color: blue; } }');

    const { manifest, events } = await captureDiagnosticsAsync(async ({ events: captured }) => ({
      manifest: await collectBoundaryManifest(root),
      events: [...captured],
    }));

    const outputs = Object.values(manifest['viewport']!.outputsByTier)[0]!;
    expect(outputs.containerQueries).toContain('color: blue');
    expect(outputs.containerQueries).toContain('gap: 4px');
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-declaration-conflict',
          message: expect.stringContaining('"color"'),
        }),
      ]),
    );
  });

  test('editing an EXISTING boundaries module busts the ESM import cache on reload', async () => {
    // Native ESM caches dynamic imports by URL; re-collecting after an
    // edit to the SAME file must not serve the stale exports (Codex P2).
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const first = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(first).toContain(referenceBoundary.id);

    // Rewrite the SAME module with a different id literal (the fixture
    // pre-mints its id, so the id field IS the freshness signal),
    // future-dating the mtime so the cache-bust query provably changes.
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE.replace(referenceBoundary.id, 'fnv1a:00009999'));
    utimesSync(join(srcDir, 'boundaries.ts'), new Date(), new Date(Date.now() + 5_000));
    const { moduleGraph } = makeModuleGraphMock();
    // Vite's hook contract delivers NORMALIZED (forward-slash) paths —
    // a raw platform join() broke the suffix match on Windows.
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'boundaries.ts').replace(/\\/g, '/') },
    );

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('fnv1a:00009999');
    expect(second).not.toContain(referenceBoundary.id);
  });

  test('hotUpdate on @quantize CSS invalidates the virtual module so importers see recompiled outputs', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const first = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(first).toContain('24px');
    expect(first).not.toContain('64px');

    // The CSS edit changes the compiled outputs; hotUpdate must invalidate
    // the virtual module (not just the cached manifest promise), otherwise
    // dev-server importers keep serving the stale outputsByTier.
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS.replace('--gap: 24px', '--gap: 64px'));
    const { invalidated, moduleGraph } = makeModuleGraphMock();
    const affected = (vitePlugin.hotUpdate as (this: unknown, options: { file: string }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'styles.css') },
    );
    expect(invalidated).toContain('\0virtual:czap/boundaries');
    expect(affected).toContainEqual(expect.objectContaining({ id: '\0virtual:czap/boundaries' }));

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('64px');
  });
});

describe('loadVirtualModule boundaries data', () => {
  test('serializes a provided manifest into the virtual module source', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);
    const manifest = await collectBoundaryManifest(root);

    const source = loadVirtualModule('\0virtual:czap/boundaries', { boundaries: manifest });

    expect(source).toContain('export const boundaries = ');
    expect(source).toContain(referenceBoundary.id);
    expect(source).toContain('outputsByTier');
  });

  test('degrades to the empty-object stub without data (type-checker / bare-bundler path)', () => {
    expect(loadVirtualModule('\0virtual:czap/boundaries')).toBe('export const boundaries = {};');
  });
});
