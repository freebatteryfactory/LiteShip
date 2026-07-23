/**
 * Wave-3 DX regression guards for @liteship/vite.
 *
 * Each test is a self-documenting LESSON pinning a LAW about the plugin's
 * ergonomic surface — backward-compatible defaults and clear error-contract
 * messages — so a benign refactor cannot silently re-introduce the papercut
 * these changes removed. See testing-philosophy: pin invariants, not exact
 * implementation strings.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Diagnostics, defineBoundary } from '@liteship/core';

import { plugin } from '../../../packages/vite/src/plugin.js';
import * as IndexModule from '../../../packages/vite/src/index.js';
import { resolvePrimitive } from '../../../packages/vite/src/primitive-resolve.js';
import { transformHTML } from '../../../packages/vite/src/html-transform.js';

// These tests simulate consumer projects via temp roots. The packaged-`@liteship/core`
// binary resolves through the module graph (which vitest resolves to the workspace),
// which a temp root cannot model. `plugin`'s second parameter is that resolver's
// injection seam; this stub forces the `'package'` source absent so the "no binary" /
// public-only scenarios are driven entirely by the temp-root fixtures — no mocking.
const noPackagedWasm = (): string | null => null;

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-vite-dx-'));
  tempDirs.push(dir);
  return dir;
}

function writePublicWasm(root: string): void {
  const publicDir = join(root, 'public');
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, 'liteship-compute.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d]));
}

afterEach(() => {
  Diagnostics.reset();
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// #81 — the `liteship` alias is the public name
// ---------------------------------------------------------------------------

describe('LESSON (#81): the import-site rename ritual is gone — `liteship` is exported directly', () => {
  test('`liteship` is exported and is the very same factory as `plugin`', () => {
    // LAW: consumers type `import { liteship } from '@liteship/vite'` with no rename;
    // it must be IDENTICAL to `plugin`, not a thin wrapper that could drift.
    expect(IndexModule.liteship).toBe(IndexModule.plugin);
    expect(typeof IndexModule.liteship).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// #80 — WASM defaults sensibly (auto-detect; flag only forces)
// ---------------------------------------------------------------------------

describe('LESSON (#80): WASM auto-enables when a binary is present — no double opt-in', () => {
  test('omitting `wasm` wires up the compute URL when a binary resolves', () => {
    // LAW: the deterministic 3-step search already makes presence
    // unambiguous, so the default must enable WASM when (and only when) a
    // binary exists — no `{ enabled: true }` ceremony required.
    const root = makeTempDir();
    writePublicWasm(root);

    const vitePlugin = plugin(undefined, noPackagedWasm); // no wasm option at all
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    expect(vitePlugin.load?.('\0virtual:liteship/wasm-url')).toContain('/liteship-compute.wasm');
  });

  test('omitting `wasm` stays silent and disabled when no binary exists', () => {
    // LAW: auto is opt-OUT, not a request — a missing binary in the default
    // mode must neither warn nor wire anything up (back-compat with the old
    // "off unless asked" behaviour for projects without the crate built).
    const root = makeTempDir();
    const vitePlugin = plugin(undefined, noPackagedWasm);
    const warn = vi.fn();

    vitePlugin.configResolved?.({ root, command: 'serve' } as never);
    vitePlugin.buildStart?.call({ warn, emitFile: vi.fn() } as never);

    expect(warn).not.toHaveBeenCalled();
    expect(vitePlugin.load?.('\0virtual:liteship/wasm-url')).toContain('export const wasmUrl = null');
  });

  test('`wasm: false` and `{ enabled: false }` force WASM off even when a binary exists', () => {
    // LAW: `enabled` now exists only to FORCE the decision — an explicit
    // false must beat a resolvable binary.
    const root = makeTempDir();
    writePublicWasm(root);

    for (const off of [false, { enabled: false } as const]) {
      const vitePlugin = plugin({ wasm: off }, noPackagedWasm);
      vitePlugin.configResolved?.({ root, command: 'serve' } as never);
      expect(vitePlugin.load?.('\0virtual:liteship/wasm-url')).toContain('export const wasmUrl = null');
    }
  });

  test('`wasm: true` still warns when explicitly required but no binary resolves', () => {
    // LAW: explicit `on` keeps its error-contract — a required-but-missing
    // binary is loud, unlike the silent auto path.
    const root = makeTempDir();
    const vitePlugin = plugin({ wasm: true }, noPackagedWasm);
    const warn = vi.fn();

    vitePlugin.configResolved?.({ root, command: 'serve' } as never);
    vitePlugin.buildStart?.call({ warn, emitFile: vi.fn() } as never);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('WASM support was enabled, but no liteship-compute binary could be resolved.'),
    );
  });

  test('the missing-binary warning names where it looked AND every escape hatch', () => {
    // LAW (#86): the warning states what happened, where it searched, and the
    // literal next steps (build the crate / copy to public / set wasm.path).
    const root = makeTempDir();
    const vitePlugin = plugin({ wasm: true }, noPackagedWasm);
    const warn = vi.fn();

    vitePlugin.configResolved?.({ root, command: 'serve' } as never);
    vitePlugin.buildStart?.call({ warn, emitFile: vi.fn() } as never);

    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain('Searched:');
    expect(message).toContain('public/liteship-compute.wasm');
    expect(message).toContain('cargo build --target wasm32-unknown-unknown --release');
    expect(message).toContain('wasm: { path:');
  });
});

// ---------------------------------------------------------------------------
// #79 — environments: default applied; misconfig errors early
// ---------------------------------------------------------------------------

describe('LESSON (#79): the environments option defaults sensibly and rejects typos loudly', () => {
  test('omitting environments yields exactly the browser environment', async () => {
    // LAW: the option no longer silently no-ops — omitted means a concrete,
    // documented default of ['browser'].
    const result = (await plugin().config?.()) as { environments: Record<string, unknown> };
    expect(Object.keys(result.environments)).toEqual(['browser']);
  });

  test('every valid environment name is accepted and configured', async () => {
    // LAW: the three layer-aware names round-trip through config() untouched.
    for (const name of ['browser', 'server', 'shader'] as const) {
      const result = (await plugin({ environments: [name] }).config?.()) as { environments: Record<string, unknown> };
      expect(Object.keys(result.environments)).toEqual([name]);
    }
  });

  test('an unknown environment name throws an early, teaching error (property)', async () => {
    // LAW: a typo would otherwise produce a silently-empty / wrong env map
    // that no-ops at build time — instead it must throw, naming the bad value
    // and the supported set. Generated over arbitrary non-valid strings.
    const valid = new Set(['browser', 'server', 'shader']);
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => !valid.has(s)),
        async (bad) => {
          let threw: Error | null = null;
          try {
            // cast: the runtime guard is what we're pinning; TS users get the
            // narrow union, but `as never`-style escapes and JS consumers do not.
            await plugin({ environments: [bad] as never }).config?.();
          } catch (err) {
            threw = err as Error;
          }
          expect(threw).toBeInstanceOf(Error);
          expect(threw?.message).toContain(bad);
          expect(threw?.message).toContain('Supported environments');
        },
      ),
    );
  });

  test('an explicit empty list stays a no-op (no environments configured)', async () => {
    // LAW: `[]` is a legitimate "configure nothing" stance and must not error.
    expect(await plugin({ environments: [] }).config?.()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// #84 / #87 — resolve-utils error contract
// ---------------------------------------------------------------------------

describe('LESSON (#84/#87): resolve failures teach the exact next step', () => {
  test('a wrong-_tag export warns with the factory one-liner and stays unresolved', async () => {
    // LAW (#84): "file found, export found, still unresolved" is the most
    // confusing failure — the message must say it is not a definition AND give
    // the factory call to fix it.
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'tokens.ts'), 'export const primary = { _tag: "NotAToken" };\n');

    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const resolved = await resolvePrimitive('token', 'primary', join(srcDir, 'app.css'), root);
    expect(resolved).toBeNull();

    const mismatch = events.find((e) => e.code === 'export-tag-mismatch');
    expect(mismatch?.message).toContain('Found export "primary"');
    expect(mismatch?.message).toContain('not a token definition');
    expect(mismatch?.message).toContain('defineToken({');
  });

  test('an import failure surfaces the cause inline and the tsc next-step', async () => {
    // LAW (#87): import-failed attaches the cause (good) but must also tell the
    // user the likely reason and the literal command to see the real error.
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'tokens.ts'), 'throw new Error("boom");\n');

    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    await resolvePrimitive('token', 'accent', join(srcDir, 'app.css'), root);

    const failure = events.find((e) => e.code === 'import-failed');
    expect(failure?.message).toContain('boom'); // cause surfaced inline
    expect(failure?.message).toContain('npx tsc --noEmit');
    expect(failure?.cause).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// #88 — boundary-not-found states the consequence
// ---------------------------------------------------------------------------

describe('LESSON (#88): an unresolved HTML boundary spells out the silent consequence', () => {
  test('the warning says the attribute is left untransformed and the element loses reactivity', async () => {
    // LAW: a missing boundary in `data-liteship="..."` silently renders an inert
    // element — the message must name that consequence, not just the search.
    const root = makeTempDir();
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const html = '<main data-liteship="hero">content</main>';
    const result = await transformHTML(html, join(root, 'src', 'index.astro'), root);

    // Untransformed: the attribute is left exactly as-authored.
    expect(result).toBe(html);

    const warning = events.find((e) => e.code === 'boundary-not-found');
    expect(warning?.message).toContain('Could not resolve boundary "hero"');
    expect(warning?.message).toContain('left untransformed');
    expect(warning?.message).toContain('no reactivity');
  });

  test('a resolvable boundary IS transformed (the guard does not fire on the happy path)', async () => {
    // Anti-fragile counterpart: prove the consequence warning is conditioned
    // on a real miss, not emitted unconditionally.
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'expanded'],
      ] as const,
    });
    writeFileSync(join(srcDir, 'boundaries.ts'), `export const hero = ${JSON.stringify(boundary)};\n`);

    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const html = '<main data-liteship="hero">content</main>';
    const result = await transformHTML(html, join(srcDir, 'index.astro'), root);

    expect(result).toContain('data-liteship-boundary=');
    expect(events.some((e) => e.code === 'boundary-not-found')).toBe(false);
  });
});
