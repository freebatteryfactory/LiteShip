import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv;
let version = '';
let out = '';
let changelogPath = 'CHANGELOG.md';
for (let i = 2; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--version') version = argv[++i] ?? '';
  else if (a === '--out') out = argv[++i] ?? '';
  else if (a === '--changelog') changelogPath = argv[++i] ?? changelogPath;
}
// Default to the current release: version from root package.json, out path derived
// from it. Keeps `pnpm run release:notes` correct across version bumps with no
// hardcoded version in the npm script (which had silently lagged before).
if (!version) {
  version = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }).version;
}
if (!out) out = `RELEASE_NOTES_v${version}.md`;
const heading = `## [${version}]`;
const md = readFileSync(resolve(changelogPath), 'utf8');
const idx = md.indexOf(heading);
if (idx === -1) throw new Error(`Missing ${heading}`);
const tail = md.slice(idx);
const lines = tail.split(/\r?\n/);
const acc: string[] = [lines[0]!];
for (let i = 1; i < lines.length; i++) {
  if (lines[i]!.startsWith('## [')) break;
  acc.push(lines[i]!);
}
writeFileSync(resolve(out), `${acc.join('\n').trimEnd()}\n`, 'utf8');
console.log(`Wrote ${out}`);