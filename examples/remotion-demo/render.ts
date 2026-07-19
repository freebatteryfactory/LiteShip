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
  console.log('[liteship] Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: ROOT_ENTRY,
    onProgress: (progress: number) => {
      if (progress % 10 === 0) {
        console.log(`  bundle: ${progress}%`);
      }
    },
  });

  console.log('[liteship] Selecting composition "LiteshipDemo"...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'LiteshipDemo',
  });

  console.log(`[liteship] Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`);
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

  console.log(`\n[liteship] Done -> ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('[liteship] Render failed:', err);
  process.exit(1);
});
