[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / PLACEHOLDER\_SKIP\_MARKERS

# Variable: PLACEHOLDER\_SKIP\_MARKERS

> `const` **PLACEHOLDER\_SKIP\_MARKERS**: readonly `string`[]

Defined in: [gauntlet/src/gates/skip-allowlist.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L132)

The PLACEHOLDER-MARKER vocabulary — the tells of an unfinished-work skip (a TODO stub),
which a sign-off can NEVER sanction. This is the SAME family the always-blocking
`gauntlet/no-placeholder` gate flags (TODO / FIXME / XXX / HACK), WIDENED here with the
prose tells that show up in a skip TITLE specifically — "not implemented" /
"unimplemented" / "stub" / "placeholder" / "wip". A genuine capability-gate skip's title
names a CAPABILITY ("ffmpeg libx264 render probe failed", "WASM artifact absent") — never
a placeholder tell — so this list partitions the honest, conditional, owner-signable skip
from the lie a sign-off must never be able to launder past the capability-gate category.

Re-derived here (NOT imported from `no-placeholder.ts`, which keeps its detector private +
comment-anchored): the matcher below is WHOLE-WORD for the single-token markers (so
`SwiPe` / `stubbornly` never false-trip) and a substring for the multi-word phrase
`not implemented`. Case-insensitive. The lean engine stays `@liteship/core`-free — pure regex.
