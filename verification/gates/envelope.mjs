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

// One authority per nominal identity.
//
// TypeScript cannot tell an imported authority from a structurally identical
// local twin, so provenance has to be checked on the source. The check is on
// brand and reference tags rather than names: two homes may lawfully both
// declare `ListenerId` when the brands are realm-scoped, because sibling
// exclusion means those types can never meet. Two homes sharing one brand tag
// is different -- the compiler sees a single type, and unrelated concepts
// become silently interchangeable.
const brands = new Map();
for (const rel of files.filter((f) => f.endsWith('.ts'))) {
  const src = readFileSync(join(REPO, rel), 'utf8');
  for (const m of src.matchAll(/Brand<[^,>]+,\s*'([^']+)'|Reference<\s*'([^']+)'/g)) {
    const tag = m[1] ?? m[2];
    if (!brands.has(tag)) brands.set(tag, new Set());
    brands.get(tag).add(rel);
  }
}
const collisions = [...brands].filter(([, homes]) => homes.size > 1);

const total = Object.values(laws).reduce((a, b) => a + b, 0);
const split = TIERS.map(([t]) => `${laws[t]} ${t}`).filter((s) => !s.startsWith('0 ')).join(' + ');

console.log(`files ${files.length} | lines ${lines} | READMEs ${readmes} | YAML ${yamlOk}/${readmes}`);
console.log(`laws  ${total} = ${split}`);
for (const f of failures) console.log(`  VIOLATION ${f}`);

// Reported, not enforced. These sit in already-ratified layers, and closing one
// is a scoped correction with an owner's ruling behind it -- not something a
// gate should decide by turning red mid-commit. Printed every run so it cannot
// quietly become normal.
for (const [tag, homes] of collisions) {
  console.log(`  FINDING  brand '${tag}' is declared in ${homes.size} homes: ${[...homes].join(', ')}`);
}

const ok = failures.length === 0 && yamlOk === readmes;
console.log(`${ok ? 'PASS' : 'FAIL'} envelope: ${failures.length} hygiene violation(s), ${collisions.length} open finding(s)`);
process.exit(ok ? 0 : 1);
