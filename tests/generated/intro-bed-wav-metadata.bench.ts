// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IoError, ValidationError } from '@czap/error';
import { introBedMetadata } from '../../examples/scenes/assets.js';

const cap = introBedMetadata;
const fixtureAbs = resolve('examples/scenes/intro-bed.wav');
const exactArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const fixtureBytes = existsSync(fixtureAbs) ? exactArrayBuffer(readFileSync(fixtureAbs)) : undefined;

bench(`intro-bed:wav-metadata — decode throughput (budget p95 ${String(cap.budgets.p95Ms ?? 'n/a')}ms)`, async () => {
  if (fixtureBytes === undefined) {
    throw IoError(
      'intro-bed:wav-metadata.fixture',
      'canonical fixture missing at ' + fixtureAbs + ' — restore examples/scenes/intro-bed.wav (or fix the asset decl source) and re-run pnpm run capsule:compile',
      { path: fixtureAbs },
    );
  }
  if (cap.derive === undefined) {
    throw ValidationError(
      'intro-bed:wav-metadata.derive',
      'capsule has no derive handler — defineAsset should resolve decl.decoder ?? builtinDecoderFor(kind); check packages/assets/src/contract.ts and re-run pnpm run capsule:compile',
    );
  }
  await cap.derive(fixtureBytes as never);
}, { time: 500 });
