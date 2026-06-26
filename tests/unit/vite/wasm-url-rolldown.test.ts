import { describe, it, expect } from 'vitest';
import { build, type RollupOutput } from 'vite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { plugin } from '@czap/vite';

/**
 * Rolldown silent-fallback guard.
 *
 * In a production build the resolved compute-binary URL is emitted as
 * `export const wasmUrl = import.meta.ROLLUP_FILE_URL_<refId>` (plugin.ts) and
 * the bundler is expected to rewrite that Rollup-compat token into the hashed
 * `.wasm` asset URL. Vite 8 swapped its bundler to Rolldown (`vite@8.1.0`
 * depends on `rolldown`, not `rollup`), which only *emulates* the
 * `ROLLUP_FILE_URL_` API — so this is exactly the seam that can break under the
 * upgrade.
 *
 * If the token is left unreplaced (or collapses to `null`), `wasmUrl` is
 * broken and the runtime silently runs the TypeScript kernels. The
 * `rust-wasm-parity` lane CANNOT catch this: parity asserts TS ≡ WASM, which
 * holds *even on the fallback* (the WASM never loads, so there's nothing to
 * diverge). Only the bundled URL exposes it — hence this guard runs a real
 * Rolldown build and asserts the token resolved to a genuine asset.
 *
 * The stub binary's bytes are irrelevant: `resolveWASM` only checks the file
 * exists, and the plugin emits whatever is at the path. We assert URL
 * *plumbing*, not compute correctness (that's the parity lane's job).
 */
describe('wasmUrl survives the Vite 8 / Rolldown bundler', () => {
  it('rewrites import.meta.ROLLUP_FILE_URL_<id> into a real .wasm asset url', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-wasm-url-'));
    try {
      // 8-byte WASM magic header (\0asm + version 1) — well-formed for good
      // hygiene, but the resolver never inspects the bytes.
      const stub = join(dir, 'stub.wasm');
      writeFileSync(stub, Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

      const entry = join(dir, 'entry.js');
      writeFileSync(
        entry,
        // Assigning to a global keeps the import live so the bundler cannot
        // tree-shake the wasm-url module away before the token is rewritten.
        "import { wasmUrl } from 'virtual:czap/wasm-url';\n" + 'globalThis.__CZAP_WASM_URL__ = wasmUrl;\n',
      );

      const result = (await build({
        root: dir,
        logLevel: 'silent',
        plugins: [plugin({ wasm: { enabled: true, path: stub } })],
        build: {
          write: false,
          rollupOptions: {
            input: entry,
            output: { format: 'es', entryFileNames: 'entry.js' },
          },
        },
      })) as RollupOutput;

      const chunks = result.output;
      const wasmAsset = chunks.find((c) => c.type === 'asset' && c.fileName.endsWith('.wasm'));
      const entryChunk = chunks.find((c) => c.type === 'chunk' && c.fileName === 'entry.js');

      expect(wasmAsset, 'the czap-compute binary must be emitted as a build asset').toBeDefined();
      expect(entryChunk, 'an entry chunk must be produced').toBeDefined();

      const code = (entryChunk as Extract<(typeof chunks)[number], { type: 'chunk' }>).code;

      // The Rollup-compat token MUST be rewritten by the bundler.
      expect(code, 'ROLLUP_FILE_URL_ token left unreplaced → silent TS fallback').not.toMatch(/ROLLUP_FILE_URL_/);
      // ...and rewritten WITH a real .wasm reference, not collapsed to null.
      expect(code, 'wasmUrl must resolve to the emitted .wasm asset').toMatch(/\.wasm/);
      expect(code, 'wasmUrl must not be null after a successful emit').not.toMatch(/__CZAP_WASM_URL__\s*=\s*null/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
