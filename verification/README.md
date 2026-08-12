# verification

The falsification harness. **Not part of the specification it checks.**

It lives outside `00_core/`, `01_hosts/`, `02_targets/`, `02_wires/` and `system/`
for two reasons. It is executable JavaScript, which those roots forbid. And it
mutates the architecture and requires compilation to fail, so it cannot be a
member of the tree it rewrites.

It is also not `system/assurance`. That names obligations about **LiteShip** that
local types cannot reach — meaningful pixels, encoded-byte determinism,
`response-commit-request-agreement`. This directory proves something one level
up: that the architecture's own laws are falsifiable.

## Running it

```sh
npm install          # once
node run.mjs         # every lane, cheapest first (~4 min)
node run.mjs bank    # just the mutation banks
node run.mjs direction
```

Every lane prints `PASS`/`FAIL` and exits non-zero on failure.

## What each lane proves

| Lane | Proves |
|---|---|
| `gates/envelope.mjs` | Census (files, lines, laws by tier, READMEs, YAML) and hygiene: no explicit `any`, no runtime export, no wildcard re-export, no non-type import, no ambient module. |
| `gates/direction.mjs` | Every import is strictly upstream, and no realm child imports a sibling — not hosts, not targets, not across the targets/wires tier. Unclassifiable imports are refused. |
| `gates/direction.selftest.mjs` | The direction gate can actually fail. Eight forbidden trees must be refused for their stated reason, and one lawful tree must pass. |
| `gates/authority.mjs` | Three narrow rules. No nominal tag in two homes; a name repeats across homes only when each declaration carries its own distinct tag; and a listed canonical authority is declared once and reached by its consumers through an import. The third rule catches private and inline twins, which no type law can see — to the compiler a twin and the original are the same type. It does **not** catch a structurally identical authority copied under a different name; that needs normalised structural comparison and belongs to the derived authority index in system assurance. |
| `gates/authority.selftest.mjs` | The authority gate can fail: private twin, inline copy, exported twin, divergent twin, shared brand, and shared reference kind are all refused, while realm-scoped brands sharing a name pass. |
| `gates/lanes.mjs` | Both declaration lanes type-check, differ by exactly the laws file, and emit zero JavaScript. |
| `probes/run.mjs` | Lawful relationships still compile; forbidden ones still don't — at the expected error counts. |
| `banks/*.mjs` | Every bank file in `banks/`, discovered rather than listed. Each mutation rewrites one exact span of the live tree and must die on a **named** law. The runner prints the total; this file deliberately does not, because a number written here is a second population that goes stale silently. |

## Two properties worth preserving

**Nothing here holds a copy of the architecture.** Every lane resolves the tree
from `harness.mjs`'s own location and stages it into a temp directory. The
predecessor harness kept private snapshots; when a fold moved the source, banks
silently reported `PATTERN-NOT-FOUND` and the totals still looked like results.
A bank whose anchor text is absent now reports `MISSING` and fails.

**Both directions are tested.** A gate that refuses everything satisfies every
negative fixture and is worthless; a bank whose mutations all die of unused-symbol
noise has proved nothing about meaning. Lawful fixtures must stay green, and a
mutation only counts as caught when a named law fires.

## Adding to the banks

An entry is `[label, repoRelativeFile, findExactly, replaceWith]`. The anchor
must match exactly once. Write the mutation while designing the law, not after —
a bank written afterward grades what got built instead of shaping it.
