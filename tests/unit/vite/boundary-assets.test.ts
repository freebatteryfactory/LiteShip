import { describe, expect, test } from 'vitest';
import { build, type RollupOutput } from 'vite';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Boundary } from '@czap/core';
import { plugin } from '@czap/vite';
import type { BoundaryManifestFile } from '@czap/edge';

describe('emitBoundaryAssets', () => {
  test('emits one content-hashed CSS asset per pooled boundary output and stitches manifest URLs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-boundary-assets-'));
    try {
      const src = join(dir, 'src');
      mkdirSync(src, { recursive: true });
      const boundary = Boundary.make({
        input: 'viewport.width',
        at: [
          [0, 'compact'],
          [768, 'wide'],
        ],
      });
      writeFileSync(
        join(src, 'boundaries.ts'),
        `
export const viewport = {
  _tag: 'BoundaryDef',
  _version: 1,
  id: ${JSON.stringify(boundary.id)},
  input: 'viewport.width',
  thresholds: [0, 768],
  states: ['compact', 'wide'],
};
`,
      );
      writeFileSync(
        join(src, 'styles.css'),
        `
@quantize viewport {
  compact { --gap: 8px; }
  wide { --gap: 24px; }
}
`,
      );
      const entry = join(src, 'entry.js');
      writeFileSync(
        entry,
        "import { boundaries } from 'virtual:czap/boundaries';\n" +
          'globalThis.__CZAP_BOUNDARIES__ = boundaries;\n',
      );

      const result = (await build({
        root: dir,
        base: '/app/',
        logLevel: 'silent',
        plugins: [plugin({ emitBoundaryAssets: true })],
        build: {
          write: false,
          rollupOptions: {
            input: entry,
            output: { format: 'es', entryFileNames: 'entry.js' },
          },
        },
      })) as RollupOutput;

      const output = result.output;
      const cssAssets = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
      expect(cssAssets).toHaveLength(2);
      for (const asset of cssAssets) {
        expect(asset.fileName).toMatch(/^_czap\/[0-9a-f]{8}\/[01]\.[A-Za-z0-9_-]+\.css$/);
      }

      const manifestAsset = output.find(
        (item) => item.type === 'asset' && item.fileName === 'czap-boundary-manifest.json',
      );
      expect(manifestAsset).toBeDefined();
      const manifest = JSON.parse(String(manifestAsset!.source)) as BoundaryManifestFile;
      const entryManifest = manifest.boundaries['viewport']!;
      expect(Object.values(entryManifest.assetUrls ?? {}).sort()).toEqual(
        cssAssets.map((asset) => `/app/${asset.fileName}`).sort(),
      );

      const entryChunk = output.find((item) => item.type === 'chunk' && item.fileName === 'entry.js');
      expect(entryChunk).toBeDefined();
      const code = (entryChunk as Extract<(typeof output)[number], { type: 'chunk' }>).code;
      expect(code).not.toMatch(/ROLLUP_FILE_URL_/);
      expect(code).toContain('_czap/');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
