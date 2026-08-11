// The full verification lane, cheapest first.
//
// Order is deliberate: the static gates finish in under a second and catch the
// structural failures, so a broken tree fails before spending four minutes
// recompiling it three hundred times.

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const LANES = [
  ['envelope', 'gates/envelope.mjs', 'census and hygiene'],
  ['direction', 'gates/direction.mjs', 'waterfall and sibling exclusion'],
  ['direction:self', 'gates/direction.selftest.mjs', 'the gate is capable of failing'],
  ['lanes', 'gates/lanes.mjs', 'declaration output, zero runtime'],
  ['probes', 'probes/run.mjs', 'positive and negative witnesses'],
  ['bank:root', 'banks/root.mjs', '16 mutations'],
  ['bank:v32', 'banks/v32.mjs', '10 mutations'],
  ['bank:hosts', 'banks/hosts.mjs', '82 mutations'],
  ['bank:web', 'banks/web.mjs', '115 mutations'],
  ['bank:hosts3', 'banks/hosts3.mjs', '92 mutations'],
];

const only = process.argv[2];
const selected = only ? LANES.filter(([n]) => n.startsWith(only)) : LANES;
if (selected.length === 0) {
  console.error(`no lane matches "${only}". Known: ${LANES.map(([n]) => n).join(', ')}`);
  process.exit(2);
}

const failed = [];
for (const [name, script, why] of selected) {
  console.log(`\n--- ${name} (${why})`);
  try {
    const out = execFileSync(process.execPath, [join(HERE, script)], { cwd: HERE, encoding: 'utf8' });
    process.stdout.write(out);
  } catch (e) {
    process.stdout.write(e.stdout ?? '');
    process.stderr.write(e.stderr ?? '');
    failed.push(name);
  }
}

console.log(`\n${'='.repeat(60)}`);
if (failed.length === 0) console.log(`PASS -- ${selected.length}/${selected.length} lanes green`);
else console.log(`FAIL -- ${failed.length} lane(s) red: ${failed.join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
