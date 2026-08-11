// Static census and hygiene gate.
//
// Counts what the tree is, and refuses the shapes the specification forbids.
// The zeros are the point: this repository is a compiler-checked specification,
// so a single runtime export or wildcard re-export is a category violation, not
// a style preference.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { REPO, VERIFICATION, allArchitectureFiles } from '../harness.mjs';

const yaml = createRequire(import.meta.url)(join(VERIFICATION, 'node_modules', 'js-yaml'));

const TIERS = [
  ['root', (f) => f === 'types.d.ts' || f === 'types.laws.ts'],
  ['core', (f) => f.startsWith('00_core/')],
  ['hosts.shared', (f) => f === '01_hosts/types.ts'],
  ['hosts.web', (f) => f.startsWith('01_hosts/web/')],
  ['hosts.worker', (f) => f.startsWith('01_hosts/worker/')],
  ['hosts.edge', (f) => f.startsWith('01_hosts/edge/')],
  ['hosts.server', (f) => f.startsWith('01_hosts/server/')],
  ['targets', (f) => f.startsWith('02_targets/')],
  ['wires', (f) => f.startsWith('02_wires/')],
  ['system', (f) => f.startsWith('system/')],
];

const files = allArchitectureFiles();
const laws = Object.fromEntries(TIERS.map(([t]) => [t, 0]));
const failures = [];
let lines = 0, readmes = 0, yamlOk = 0;

for (const rel of files) {
  const src = readFileSync(join(REPO, rel), 'utf8');
  lines += src.split('\n').length - (src.endsWith('\n') ? 1 : 0);

  if (rel.endsWith('README.md')) {
    readmes++;
    const block = src.match(/```yaml\n([\s\S]*?)```/);
    if (!block) failures.push(`${rel}: no architecture YAML block`);
    else { try { yaml.load(block[1]); yamlOk++; } catch (e) { failures.push(`${rel}: YAML does not parse -- ${e.message}`); } }
  }

  if (!rel.endsWith('.ts')) continue;

  const tier = TIERS.find(([, match]) => match(rel));
  const count = (src.match(/^export type \w+ = Assert</gm) ?? []).length;
  if (tier) laws[tier[0]] += count;

  if (/:\s*any\b|<any>|\bas any\b/.test(src)) failures.push(`${rel}: explicit any`);
  for (const line of src.split('\n')) {
    if (/^import (?!type )/.test(line)) failures.push(`${rel}: non-type import -- ${line.trim()}`);
    if (/^export \*/.test(line)) failures.push(`${rel}: wildcard export -- ${line.trim()}`);
    if (/^export (const|function|class|let|var) /.test(line)) failures.push(`${rel}: runtime export -- ${line.trim()}`);
    if (/^declare module /.test(line)) failures.push(`${rel}: ambient module declaration -- ${line.trim()}`);
  }
}

const total = Object.values(laws).reduce((a, b) => a + b, 0);
const split = TIERS.map(([t]) => `${laws[t]} ${t}`).filter((s) => !s.startsWith('0 ')).join(' + ');

console.log(`files ${files.length} | lines ${lines} | READMEs ${readmes} | YAML ${yamlOk}/${readmes}`);
console.log(`laws  ${total} = ${split}`);
for (const f of failures) console.log(`  VIOLATION ${f}`);
console.log(`${failures.length === 0 && yamlOk === readmes ? 'PASS' : 'FAIL'} envelope: ${failures.length} hygiene violation(s)`);
process.exit(failures.length === 0 && yamlOk === readmes ? 0 : 1);
