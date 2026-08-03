/**
 * CLI render script -- bundles the Remotion project and renders LiteshipDemo to MP4.
 *
 * Usage: tsx render.ts
 *
 * @module
 */

import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const ROOT_ENTRY = path.resolve(import.meta.dirname, 'src/Root.tsx');
const OUTPUT_PATH = path.resolve(import.meta.dirname, 'out/liteship-demo.mp4');

async function main(): Promise<void> {
  process.stdout.write('[liteship] Bundling Remotion project...\n');
  const bundleLocation = await bundle({
    entryPoint: ROOT_ENTRY,
    onProgress: (progress: number) => {
      if (progress % 10 === 0) {
        process.stdout.write(`  bundle: ${progress}%\n`);
      }
    },
  });

  process.stdout.write('[liteship] Selecting composition "LiteshipDemo"...\n');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'LiteshipDemo',
  });

  process.stdout.write(`[liteship] Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...\n`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: OUTPUT_PATH,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) {
        process.stdout.write(`\r  render: ${pct}%`);
      }
    },
  });

  process.stdout.write(`\n[liteship] Done -> ${OUTPUT_PATH}\n`);
}

main().catch((err: unknown) => {
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`[liteship] Render failed: ${detail}\n`);
  process.exit(1);
});
