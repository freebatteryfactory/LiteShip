// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { introBedBeats } from '../../examples/scenes/assets.js';

const cap = introBedBeats;
const fixtureAbs = resolve('examples/scenes/intro-bed.wav');
const fixtureBytes = existsSync(fixtureAbs) ? (readFileSync(fixtureAbs).buffer as ArrayBuffer) : undefined;

bench(`intro-bed:beats — decode throughput (budget p95 ${String(cap.budgets.p95Ms ?? 'n/a')}ms)`, async () => {
  if (fixtureBytes === undefined) {
    throw new Error(
      'intro-bed:beats: canonical fixture missing at ' + fixtureAbs + ' — restore examples/scenes/intro-bed.wav (or fix the asset decl source) and re-run pnpm run capsule:compile',
    );
  }
  if (cap.derive === undefined) {
    throw new Error(
      'intro-bed:beats: capsule has no derive handler — defineAsset should resolve decl.decoder ?? builtinDecoderFor(kind); check packages/assets/src/contract.ts and re-run pnpm run capsule:compile',
    );
  }
  await cap.derive(fixtureBytes as never);
}, { time: 500 });
