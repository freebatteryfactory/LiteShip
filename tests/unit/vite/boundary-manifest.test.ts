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
import type { ContentAddress } from '@czap/core';
import { Boundary, Diagnostics } from '@czap/core';
import { createBoundaryCache, enumerateTierKeys, resolveOutputsByTier, tierKey } from '@czap/edge';
import type { KVNamespace } from '@czap/edge';
import {
  collectBoundaryManifest,
  collectBoundaryManifestFromScan,
  scanProject,
  serializeBoundaryOutput,
} from '../../../packages/vite/src/boundary-manifest.js';
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
  test('serializeBoundaryOutput emits the canonical compiled css payload without re-prepending sections', () => {
    expect(
      serializeBoundaryOutput({
        propertyRegistrations: '@property --gap { syntax: "<length>"; inherits: false; initial-value: 0px; }',
        containerQueries: '@container viewport-width (width >= 768px) { .x { --gap: 2rem; } }',
        css: [
          '@property --gap { syntax: "<length>"; inherits: false; initial-value: 0px; }',
          '@container viewport-width (width >= 768px) { .x { --gap: 2rem; } }',
          '.x { gap: var(--gap); }',
        ].join('\n\n'),
      }),
    ).toBe(
      [
        '@property --gap { syntax: "<length>"; inherits: false; initial-value: 0px; }',
        '@container viewport-width (width >= 768px) { .x { --gap: 2rem; } }',
        '.x { gap: var(--gap); }',
      ].join('\n\n'),
    );
  });

  test('collectBoundaryManifestFromScan derives over the PASSED scan, not a fresh disk walk', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'styles.css', QUANTIZE_CSS);

    // Full walk: viewport carries @quantize outputs from styles.css.
    const full = await collectBoundaryManifest(root);
    expect((full['viewport']?.outputs ?? []).length).toBeGreaterThan(0);

    // A scan that OMITS the stylesheet -> the shared-scan variant must reflect it (no
    // outputs), proving it derives from the PASSED scan and never re-walks disk. If it
    // ignored the scan and re-scanned, viewport would still pick up styles.css.
    const scan = scanProject(root);
    const withoutCss = await collectBoundaryManifestFromScan(root, { ...scan, cssFiles: [] });
    expect((withoutCss['viewport']?.outputs ?? []).length).toBe(0);
  });

  test('@aria blocks compile into CompiledOutputs.aria via the dispatch caster', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(
      srcDir,
      'styles.css',
      `
@quantize viewport {
  compact {
    --gap: 8px;
    @aria { aria-expanded: "false"; }
  }
  wide {
    --gap: 24px;
    @aria { aria-expanded: "true"; }
  }
}
`,
    );

    const manifest = await collectBoundaryManifest(root);
    const entry = manifest['viewport']!;
    // ARIA is tier-invariant, so the authored stateAttributes ride every pooled
    // output that carries them — fully keyed by ARIACompiler.
    const withAria = entry.outputs.find((o) => o.aria);
    expect(withAria?.aria).toEqual({
      compact: { 'aria-expanded': 'false' },
      wide: { 'aria-expanded': 'true' },
    });
  });

  test('@glsl blocks round-trip authoring → dispatch → CompiledOutputs.glsl → KV serialize/deserialize', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(
      srcDir,
      'styles.css',
      `
@quantize viewport {
  compact {
    --gap: 8px;
    @glsl { blur: 0.5; brightness: 1.0; }
  }
  wide {
    --gap: 24px;
    @glsl { blur: 0.0; brightness: 1.2; }
  }
}
`,
    );

    // Authoring → manifest → dispatch(GLSLCompiler) → CompiledOutputs.glsl.
    const manifest = await collectBoundaryManifest(root);
    const entry = manifest['viewport']!;
    const withGlsl = entry.outputs.find((o) => o.glsl);
    expect(withGlsl?.glsl).toBeDefined();
    // The GLSL cast carries the compiled shader preamble + default uniforms,
    // keyed by the GLSL uniform identifiers the compiler declares (`u_*`).
    expect(withGlsl!.glsl!.declarations).toContain('uniform');
    expect(withGlsl!.glsl!.declarations).toContain('u_blur');
    expect(withGlsl!.glsl!.uniformValues).toMatchObject({ u_blur: 0, u_brightness: 1.2, u_state: 0 });

    // CompiledOutputs.glsl → KV serialize → deserialize (the edge storage seam).
    const store = new Map<string, string>();
    const kv: KVNamespace = {
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value) {
        store.set(key, value);
      },
    };
    const cache = createBoundaryCache(kv);
    const tierResult = {
      capTier: 'reactive' as const,
      motionTier: 'animations' as const,
      designTier: 'enhanced' as const,
    };
    await cache.putCompiledOutputs(entry.id as ContentAddress, tierResult, withGlsl!);
    const restored = await cache.getCompiledOutputs(entry.id as ContentAddress, tierResult);
    expect(restored!.glsl).toEqual(withGlsl!.glsl);
  });

  test('@wgsl parses the generic vec2<f32>(...) form and drops a malformed vector loudly', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(
      srcDir,
      'styles.css',
      `
@quantize viewport {
  compact {
    @wgsl {
      res: vec2<f32>(1, 2);
      bad: vec3f(1, 2);
      junk: 10px;
    }
  }
}
`,
    );

    const { manifest, events } = await captureDiagnosticsAsync(async ({ events: captured }) => ({
      manifest: await collectBoundaryManifest(root),
      events: [...captured],
    }));

    const withWgsl = manifest['viewport']!.outputs.find((output) => output.wgsl);
    // The generic constructor's declared type (`<f32>`) must NOT leak into the
    // numeric scan: vec2<f32>(1, 2) is [1, 2], never [2, 32, 1, 2].
    expect(withWgsl!.wgsl!.bindingValues['res']).toEqual([1, 2]);
    // A component count that disagrees with the declared vecN (vec3f with 2 args)
    // is dropped, not silently reshaped -- and the drop is loud.
    expect(withWgsl!.wgsl!.bindingValues).not.toHaveProperty('bad');
    expect(events.some((event) => event.code === 'wgsl-cast-value-malformed:bad')).toBe(true);
    // Arbitrary text with stray digits (`10px`) must NOT scan into a false uniform;
    // it is dropped and warned, not compiled as a scalar `10`.
    expect(withWgsl!.wgsl!.bindingValues).not.toHaveProperty('junk');
    expect(events.some((event) => event.code === 'wgsl-cast-value-malformed:junk')).toBe(true);
  });

  test('@wgsl blocks parse scalar and vec2/vec3/vec4 values into manifest stateBindings', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    const authoredWgsl = {
      compact: {
        uv: [0.25, 0.5],
        normal: [1, 2, 3],
        color: [0.1, 0.2, 0.3, 0.4],
      },
      wide: {
        uv: [0.75, 1],
        normal: [4, 5, 6],
        color: [0.5, 0.6, 0.7, 0.8],
      },
    } as const;
    const renderValue = (value: number | readonly number[]): string =>
      Array.isArray(value) ? `vec${value.length}f(${value.join(', ')})` : String(value);
    writeModule(
      srcDir,
      'styles.css',
      `
@quantize viewport {
${Object.entries(authoredWgsl)
  .map(
    ([state, attrs]) => `  ${state} {
    @wgsl {
${Object.entries(attrs)
  .map(([name, value]) => `      ${name}: ${renderValue(value)};`)
  .join('\n')}
    }
  }`,
  )
  .join('\n')}
}
`,
    );

    const manifest = await collectBoundaryManifest(root);
    const withWgsl = manifest['viewport']!.outputs.find((output) => output.wgsl);
    expect(withWgsl?.wgsl?.stateBindings).toEqual(authoredWgsl);
    expect(withWgsl!.wgsl!.bindingValues['color']).toEqual(authoredWgsl.wide.color);

    const struct = /struct\s+\w+\s*\{([\s\S]*?)\}/.exec(withWgsl!.wgsl!.declarations);
    const fieldTypes = new Map(
      [...(struct?.[1] ?? '').matchAll(/([A-Za-z_]\w*)\s*:\s*([A-Za-z_][\w<>]*)/g)].map((match) => [
        match[1]!,
        match[2]!,
      ]),
    );
    const expectedTypes = Object.fromEntries(
      Object.entries(authoredWgsl.compact).map(([key, value]) => [
        key,
        value.length === 2 ? 'vec2f' : value.length === 3 ? 'vec3f' : 'vec4f',
      ]),
    );
    for (const [field, expectedType] of Object.entries(expectedTypes)) {
      expect(fieldTypes.get(field)).toBe(expectedType);
    }
  });

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

    // Tier-invariant CSS is pooled, not stored per cell: two distinct
    // outputs (motion `none` vs the rest), so the serialized entry is
    // strictly smaller than the pre-dedupe per-cell format.
    expect(entry.outputs).toHaveLength(2);
    const resolved = resolveOutputsByTier(entry);
    expect(JSON.stringify(entry).length).toBeLessThan(JSON.stringify({ id: entry.id, outputsByTier: resolved }).length);

    const standard = resolved[tierKey({ motionTier: 'transitions', designTier: 'standard' })]!;
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
    const reduced = resolved[tierKey({ motionTier: 'none', designTier: 'standard' })]!;
    expect(reduced.propertyRegistrations).toBe('');
    expect(reduced.containerQueries).toBe(standard.containerQueries);
    expect(reduced.css).not.toContain('@property');
  });

  test('viewport.height boundaries carry their own :root size containment and (height ...) queries', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    const heightBoundary = Boundary.make({
      input: 'viewport.height',
      at: [
        [0, 'short'],
        [600, 'tall'],
      ],
    });
    writeModule(
      srcDir,
      'boundaries.ts',
      `
const states = ['short', 'tall'];
export const drawer = {
  _tag: 'BoundaryDef',
  _version: 1,
  id: ${JSON.stringify(heightBoundary.id)},
  input: 'viewport.height',
  thresholds: [0, 600],
  states,
};
`,
    );
    writeModule(srcDir, 'styles.css', '@quantize drawer {\n  short { --rows: 1; }\n  tall { --rows: 3; }\n}');

    const manifest = await collectBoundaryManifest(root);
    // v2 manifest: cells are pool indices — resolve before reading.
    const outputs = Object.values(resolveOutputsByTier(manifest['drawer']!))[0]!;

    expect(outputs.containerQueries).toContain('@container viewport-height (height >= 600px)');
    // Height queries are block-axis: inline-size containment cannot
    // evaluate them, so the inline :root rule must declare size
    // containment with a pinned viewport block size.
    expect(outputs.containerQueries).toContain(
      ':root {\n  container-type: size;\n  block-size: 100dvh;\n  container-name: viewport-height;\n}',
    );
  });

  test('boundary without a @quantize block still gets an id entry (empty outputs)', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'boundaries.ts', BOUNDARY_MODULE);

    const manifest = await collectBoundaryManifest(root);

    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
    expect(manifest['viewport']!.outputs).toEqual([]);
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

    // A new definition file appears; hotUpdate must drop the cached manifest AND the
    // shared project scan (its file list changed), and invalidate the virtual module so
    // importers reload. A newly-appearing file is a `create` in Vite's hotUpdate hook.
    writeModule(srcDir, 'extra.boundaries.ts', BOUNDARY_MODULE.replace('viewport', 'sidebar'));
    const { invalidated, moduleGraph } = makeModuleGraphMock();
    (
      vitePlugin.hotUpdate as (
        this: unknown,
        options: { type: string; file: string; modules: unknown[] },
      ) => unknown
    ).call(
      { environment: { moduleGraph } },
      { type: 'create', file: join(srcDir, 'extra.boundaries.ts'), modules: [] },
    );
    expect(invalidated).toContain('\0virtual:czap/boundaries');

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('sidebar');
    expect(second).toContain('viewport');
  });

  test('@quantize inside .astro <style> blocks contributes to the manifest', async () => {
    // The repo examples author @quantize in component styles — a project
    // doing ONLY that must not get empty outputsByTier.
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(
      srcDir,
      'Page.astro',
      '---\nconst x = 1;\n---\n<div class="grid" />\n<style>\n@quantize viewport {\n  compact { .grid { gap: 4px; } }\n}\n</style>\n',
    );

    const manifest = await collectBoundaryManifest(root);
    const outputs = manifest['viewport']!.outputs[0]!;
    expect(outputs.containerQueries).toContain('gap: 4px');
    expect(outputs.containerQueries).toContain('@container');
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

    const outputs = manifest['viewport']!.outputs[0]!;
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

  test('duplicate NESTED-selector declarations across files also warn on conflicts', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    writeModule(srcDir, 'a.css', '@quantize viewport { compact { .grid { gap: 4px; } } }');
    writeModule(srcDir, 'b.css', '@quantize viewport { compact { .grid { gap: 9px; } } }');

    const { events } = await captureDiagnosticsAsync(async ({ events: captured }) => ({
      manifest: await collectBoundaryManifest(root),
      events: [...captured],
    }));

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-declaration-conflict',
          message: expect.stringContaining('.grid'),
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
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'boundaries.ts').replace(/\\/g, '/'), modules: [] },
    );

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('fnv1a:00009999');
    expect(second).not.toContain(referenceBoundary.id);
  });

  test('hotUpdate on a .astro style edit invalidates the boundary manifest virtual module', async () => {
    // .astro components feed the manifest scan; editing one must drop the
    // cached manifest AND invalidate the virtual module, same as CSS.
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'boundaries.ts', BOUNDARY_MODULE);
    const page = '---\n---\n<div />\n<style>\n@quantize viewport {\n  compact { .grid { gap: 4px; } }\n}\n</style>\n';
    writeModule(srcDir, 'Page.astro', page);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const first = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(first).toContain('gap: 4px');

    writeModule(srcDir, 'Page.astro', page.replace('4px', '9px'));
    const { invalidated, moduleGraph } = makeModuleGraphMock();
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'Page.astro').replace(/\\/g, '/'), modules: [] },
    );
    expect(invalidated).toContain('\0virtual:czap/boundaries');

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/boundaries',
    );
    expect(second).toContain('9px');
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
    const affected = (
      vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown
    ).call({ environment: { moduleGraph } }, { file: join(srcDir, 'styles.css'), modules: [] });
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
