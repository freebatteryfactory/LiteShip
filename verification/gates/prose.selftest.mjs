// Anti-vacuity fixtures for the prose gate.
//
// The gate reports zero violations against the real tree. That is only evidence
// if it is also capable of reporting one. Each forbidden fixture is a document
// the repo-as-spec rule refuses; the lawful fixtures guard the other direction,
// because a gate that refuses every README is exactly as useless as one that
// refuses none.
//
// The lawful fixtures matter more than usual here. This gate reads prose, and
// prose is where a denylist most easily becomes a thesaurus hunt — the boundary
// statements below use the same *words* as the forbidden headings and must
// survive, or the gate would push real scope statements out of the spec.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { checkProse } from './prose.mjs';

const build = (files) => {
  const root = mkdtempSync(join(os.tmpdir(), 'liteship-prose-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
};

const LAWFUL = {
  'README.md': `# A Home

## Implementation boundary

Specified. No runtime exists or is authorized. Porting the old behaviour and
qualifying its cost are implementation obligations this architecture already
authorizes.

This home owns no replication: adding one would be an explicit architecture
reopening, not an unstated obligation. Bytecode is deferred in the same sense —
it does not exist here, and introducing it is a decision, not a chore.

## Laws

- Nothing pending here is stored as a heading.
`,
  'other.md': `# Another

## Proof obligations

That the remaining sources settle before the deadline is a runtime claim. The
work remaining at runtime is not this document's business.

\`\`\`yaml
home:
  notes:
  - "## Remaining work"
\`\`\`
`,
};

const FORBIDDEN = [
  ['a remaining-work section', /remaining work/i, { 'README.md': '# H\n\n## Remaining work\n\nPort the old thing.\n' }],
  ['a TODO section', /todo/i, { 'README.md': '# H\n\n### TODO\n\nDecide the roster.\n' }],
  ['a deferred section', /deferred/i, { 'README.md': '# H\n\n## Deferred\n\nReplication.\n' }],
  ['an open-questions section', /open questions/i, { 'README.md': '# H\n\n## Open questions\n\nWhich codec?\n' }],
  ['an open-before section', /open before/i, { 'README.md': '# H\n\n## Open before children are authored\n\nThe roster.\n' }],
  ['a future-work section', /future work/i, { 'README.md': '# H\n\n## Future work\n\nA fleet registry.\n' }],
  ['a next-steps section', /next steps/i, { 'README.md': '# H\n\n## Next steps\n\nSeal the roster.\n' }],
  ['a pending section', /pending/i, { 'README.md': '# H\n\n## Pending\n\nThe wires layer.\n' }],
  ['an outstanding section', /outstanding/i, { 'README.md': '# H\n\n## Outstanding\n\nThe tag.\n' }],
];

let failures = 0;
const roster = ['README.md', 'other.md'];

const lawfulRoot = build(LAWFUL);
const lawfulViolations = checkProse(lawfulRoot, roster);
rmSync(lawfulRoot, { recursive: true, force: true });
if (lawfulViolations.length === 0) {
  console.log('  [ok] lawful tree passes (boundary statements using the same words survive)');
} else {
  console.log(`  [!!] LAWFUL TREE REFUSED -- ${lawfulViolations.length} violation(s)`);
  for (const v of lawfulViolations) console.log(`       ${v}`);
  failures++;
}

for (const [label, pattern, files] of FORBIDDEN) {
  const root = build(files);
  const violations = checkProse(root, ['README.md']);
  rmSync(root, { recursive: true, force: true });
  const matched = violations.some((v) => pattern.test(v));
  if (matched) console.log(`  [ok] refused -- ${label}`);
  else {
    console.log(`  [!!] NOT REFUSED -- ${label}; got: ${violations.join(' | ') || '(none)'}`);
    failures++;
  }
}

const total = FORBIDDEN.length + 1;
console.log(`${failures === 0 ? 'PASS' : 'FAIL'} prose self-test: ${total - failures}/${total} fixtures behaved`);
process.exit(failures === 0 ? 0 : 1);
