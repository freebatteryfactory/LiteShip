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
