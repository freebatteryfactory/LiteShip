// The repo-as-spec prose gate.
//
// The repository is the specification. That has a consequence the type system
// cannot enforce: a README may not carry a section describing work that has not
// happened. "Remaining work", "TODO", "Deferred", "Open questions" — each is a
// promise stored in prose, and a promise stored in prose is the one part of the
// spec no compiler, no law, and no mutation can hold to account.
//
// The rule is not that unfinished work is forbidden. It is that unfinished work
// must be either an implementation obligation the architecture already
// authorizes (which belongs under `## Implementation boundary`), a decision
// nobody has made (which must be made), or stale prose (which goes). A section
// heading is not one of those three things.
//
// This gate reads headings, not sentences. A sentence saying "this home owns no
// replication; adding one is an explicit reopening" is a boundary statement and
// stays. A heading saying `## Remaining work` is a bucket, and buckets fill.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allArchitectureFiles, REPO } from '../harness.mjs';

/**
 * Headings that store unfinished work rather than stating a boundary.
 *
 * Matched at heading position only. `## Implementation boundary` may say
 * "implementation must port the old behaviour" all it likes — that is a scope
 * statement under a heading that means "none of this exists yet". What it may
 * not do is open a second section whose whole purpose is to hold things nobody
 * has decided.
 */
const FORBIDDEN_HEADINGS = [
  /^#{1,6}\s+remaining\s+work\b/i,
  /^#{1,6}\s+todo\b/i,
  /^#{1,6}\s+to\s+do\b/i,
  /^#{1,6}\s+deferred\b/i,
  /^#{1,6}\s+future\s+work\b/i,
  /^#{1,6}\s+open\s+(questions?|items?|before)\b/i,
  /^#{1,6}\s+pending\b/i,
  /^#{1,6}\s+next\s+steps?\b/i,
  /^#{1,6}\s+(not\s+yet|unfinished|outstanding)\b/i,
];

/** Every heading that stores work instead of stating a boundary. */
export function checkProse(root = REPO, files = null) {
  const violations = [];
  const roster = files ?? allArchitectureFiles().filter((f) => f.endsWith('.md'));

  for (const rel of roster) {
    let text;
    try {
      text = readFileSync(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    let fenced = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // A fenced block may legitimately contain the word in an example.
      if (/^\s*```/.test(line)) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      for (const pattern of FORBIDDEN_HEADINGS) {
        if (pattern.test(line)) {
          violations.push(
            `${rel}:${i + 1}: work stored in a heading -- "${line.trim()}". ` +
              'Classify it: an authorized implementation obligation belongs under ' +
              '`## Implementation boundary`, an undecided question must be decided, ' +
              'and stale prose goes.',
          );
        }
      }
    }
  }
  return violations;
}

if (process.argv[1]?.endsWith('prose.mjs')) {
  const violations = checkProse();
  for (const v of violations) console.log(`  [!!] ${v}`);
  console.log(`${violations.length === 0 ? 'PASS' : 'FAIL'} prose: ${violations.length} violation(s)`);
  process.exit(violations.length === 0 ? 0 : 1);
}
