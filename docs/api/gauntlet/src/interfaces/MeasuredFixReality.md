[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MeasuredFixReality

# Interface: MeasuredFixReality

Defined in: [gauntlet/src/declared-fix.ts:440](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L440)

The HOST's measured reality the verifier checks the [DeclaredFix](DeclaredFix.md) against —
everything the host computed off disk (the gauntlet itself reads nothing). The host
MEASURES the actual change, the before/after standards surfaces (it read the live
surface twice — pre-fix and post-fix), and minted each surface's content address
via the ONE `contentAddressOf` kernel.

## Properties

### actualChange

> `readonly` **actualChange**: [`ActualChange`](ActualChange.md)

Defined in: [gauntlet/src/declared-fix.ts:442](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L442)

The actual change the host measured (changed files + changed lines).

***

### alwaysBlockingRuleIds

> `readonly` **alwaysBlockingRuleIds**: `ReadonlySet`\<`string`\>

Defined in: [gauntlet/src/declared-fix.ts:454](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L454)

The live always-blocking rule ids — a weakening of one can never be signed.

***

### measuredAfterAddress

> `readonly` **measuredAfterAddress**: `string`

Defined in: [gauntlet/src/declared-fix.ts:450](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L450)

The host-minted content address of the AFTER surface (via `contentAddressOf`).

***

### measuredBeforeAddress

> `readonly` **measuredBeforeAddress**: `string`

Defined in: [gauntlet/src/declared-fix.ts:448](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L448)

The host-minted content address of the BEFORE surface (via `contentAddressOf`).

***

### now

> `readonly` **now**: `Date`

Defined in: [gauntlet/src/declared-fix.ts:459](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L459)

The INJECTED wall-clock date the sign-off-expiry is evaluated against (the
two-clock law — the host injects it, never `Date.now()` here).

***

### signoffs

> `readonly` **signoffs**: readonly [`StandardsWaiver`](StandardsWaiver.md)[]

Defined in: [gauntlet/src/declared-fix.ts:452](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L452)

The committed owner sign-offs (the only honest escape) — reused from phase A.

***

### standardsAfter

> `readonly` **standardsAfter**: readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

Defined in: [gauntlet/src/declared-fix.ts:446](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L446)

The standards surface elements AFTER the fix (host-read).

***

### standardsBefore

> `readonly` **standardsBefore**: readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

Defined in: [gauntlet/src/declared-fix.ts:444](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L444)

The standards surface elements BEFORE the fix (host-read).
