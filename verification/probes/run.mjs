// Probe lane: compile-time witnesses against the live tree.
//
// A positive probe is a relationship the architecture must keep legal. A
// negative probe is one it must refuse. Both directions matter -- a tree that
// rejects everything satisfies every negative probe and is still worthless.
//
// Negative probes also carry an expected error count. It is not decoration: if a
// probe that used to raise nine errors starts raising three, six escapes have
// reopened while the lane still reports red. Coverage moving is a finding, and
// the number is what makes it visible.

import { copyFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { discard, runTsc, stageWork } from '../harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// Observed at the ratified host-layer closure. A change means coverage moved.
const PROBES = [
  { file: 'probe-positives.ts', expect: 'compiles', why: '28 lawful fixtures, including the provider-form paths' },
  { file: 'probe-h-composition.ts', expect: 'compiles', why: 'exact filesystem stream composes into the media request' },
  { file: 'probe-active.ts', expect: 'rejects', errors: 13, why: 'the C1-C5 witnesses, each a distinct A-versus-B identity' },
  { file: 'probe-h-adapted.ts', expect: 'rejects', errors: 9, why: 'H1-H3 witnesses at current arity, semantic not arity failures' },
  { file: 'probe-h-survivors.ts', expect: 'rejects', errors: 8, why: 'the survivors the provider-path fold closed' },
  { file: 'probe-source-relation-positives.ts', expect: 'compiles', why: 'all three arms inhabited, exact artifacts coexist in the erased catalog' },
  { file: 'probe-source-relation-negatives.ts', expect: 'rejects', errors: 7, why: 'each way the source-map ambiguity could return' },
  { file: 'probe-astro-vite-binding.ts', expect: 'compiles', why: 'the real cross-target join: Vite\'s facility fills Astro\'s hole through BindingsFor, no casts' },
  // Compiles rather than rejects, on purpose. Every negative sits under
  // `@ts-expect-error`, so the file is green only while all nine are still
  // refused, and a directive that stops being needed names its own site
  // instead of moving a total. Verified red by removing the socket constraint:
  // five directives went unused immediately.
  { file: 'probe-astro-vite-negatives.ts', expect: 'compiles', why: 'nine cross-target negatives, each self-verifying via @ts-expect-error' },
  // The umbrella's `direct-composition` arm was compiled in and never consumed.
  // This is the first consumer that takes both producers, so it is the first
  // evidence the claim was true rather than merely representable.
  { file: 'probe-direct-deployment.ts', expect: 'compiles', why: 'framework-produced and host-only-produced applications enter one deployment path, no branch' },
  // The media fold's positive join. It crosses four homes that could not each
  // have proved this alone: the cut reaches two sibling egresses, a graphics
  // frame travels into an encoder that cannot name the graphics home, a draft
  // cut rasterizes without becoming a commit, and all three export dispositions
  // are inhabited including the honest refusal.
  { file: 'probe-media-live-export.ts', expect: 'compiles', why: 'one cut, sibling egresses, rasterize-encode-mux across three homes, draft preview, all three dispositions' },
  // Compiles rather than rejects, for the same reason the cross-target
  // negatives do: each negative names its own site under `@ts-expect-error`.
  { file: 'probe-media-negatives.ts', expect: 'compiles', why: 'fifteen media negatives, each self-verifying via @ts-expect-error' },
];

const known = new Set(PROBES.map((p) => p.file));
for (const f of readdirSync(HERE).filter((f) => f.endsWith('.ts'))) {
  if (!known.has(f)) console.log(`  [!!] ${f} is present but not declared in this runner -- it proves nothing`);
}

let failures = 0;

for (const { file, expect, errors: expected, why } of PROBES) {
  const work = stageWork(`probe-${basename(file, '.ts')}`, { alsoInclude: [file] });
  copyFileSync(join(HERE, file), join(work, file));
  const { ok, errors } = runTsc(work);
  discard(work);

  if (expect === 'compiles') {
    if (ok) console.log(`  [ok] ${file} compiles -- ${why}`);
    else {
      console.log(`  [!!] ${file} MUST compile but raised ${errors.length} error(s) -- ${why}`);
      for (const e of errors.slice(0, 4)) console.log(`       ${e}`);
      failures++;
    }
    continue;
  }

  const count = errors.filter((l) => l.startsWith(file)).length;
  if (ok) {
    console.log(`  [!!] ${file} MUST be refused but compiled clean -- ${why}`);
    failures++;
  } else if (count !== expected) {
    console.log(`  [!!] ${file} raised ${count} error(s), expected ${expected} -- coverage moved, explain before proceeding`);
    failures++;
  } else {
    console.log(`  [ok] ${file} refused, ${count}/${expected} witnesses red -- ${why}`);
  }
}

console.log(`${failures === 0 ? 'PASS' : 'FAIL'} probes: ${PROBES.length - failures}/${PROBES.length} lanes behaved`);
process.exit(failures === 0 ? 0 : 1);
