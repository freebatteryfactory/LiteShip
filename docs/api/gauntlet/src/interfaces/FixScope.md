[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FixScope

# Interface: FixScope

Defined in: [gauntlet/src/declared-fix.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L122)

The scope a [DeclaredFix](DeclaredFix.md) is permitted to touch — repo-relative file GLOBS
(the files it may edit) and the standards-element KEYS it may legitimately change
(so a fix that declares it touches a floor can change that floor's element, but a
fix that declares no standards keys must not change ANY standards element). Both
lists are explicit allow-lists: empty = the fix may touch NOTHING of that kind.

## Properties

### fileGlobs

> `readonly` **fileGlobs**: readonly `string`[]

Defined in: [gauntlet/src/declared-fix.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L129)

The repo-relative file globs the fix may edit (e.g. `packages/core/src/evidence/fnv.ts`,
`packages/astro/src/**`). A `*` matches within a path segment; `**` matches across
segments (the same minimal glob shape the assurance map uses). An actually-changed
file matching NONE of these is scope creep.

***

### standardsElementKeys

> `readonly` **standardsElementKeys**: readonly `string`[]

Defined in: [gauntlet/src/declared-fix.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L137)

The [StandardsElement](../type-aliases/StandardsElement.md) keys (`surfaceElementKey`) the fix is ALLOWED to
change — its declared standards footprint. A standards element that CHANGED but is
not in this list is an undeclared standards edit (caught even when it is a
strengthen — the agent must declare its standards footprint, not just avoid
weakening). Empty = the fix declares it touches NO standards element.
