[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DeclaredFix

# Interface: DeclaredFix

Defined in: [gauntlet/src/declared-fix.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L101)

The agent's DECLARATION of an auto-fix — what it INTENDS to do, the SCOPE it is
allowed to touch, the SIZE it is capped to, and the before/after receipts. Pure
data; content-addressable (the host can content-address the whole record to bind
an apply to its declaration). The agent fills this in BEFORE the verifier checks
the actual change against it.

## Properties

### \_tag

> `readonly` **\_tag**: `"declared-fix"`

Defined in: [gauntlet/src/declared-fix.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L102)

***

### afterReceipt

> `readonly` **afterReceipt**: [`FixReceipt`](FixReceipt.md)

Defined in: [gauntlet/src/declared-fix.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L112)

The content-addressed snapshot of the standards surface + touched files AFTER the fix.

***

### beforeReceipt

> `readonly` **beforeReceipt**: [`FixReceipt`](FixReceipt.md)

Defined in: [gauntlet/src/declared-fix.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L110)

The content-addressed snapshot of the standards surface + touched files BEFORE the fix.

***

### intent

> `readonly` **intent**: `string`

Defined in: [gauntlet/src/declared-fix.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L104)

The human/agent statement of WHAT this fix does + WHY — the intent of record.

***

### scope

> `readonly` **scope**: [`FixScope`](FixScope.md)

Defined in: [gauntlet/src/declared-fix.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L106)

The exact scope the fix is ALLOWED to touch — anything actually changed outside it is scope creep.

***

### sizeCap

> `readonly` **sizeCap**: [`FixSizeCap`](FixSizeCap.md)

Defined in: [gauntlet/src/declared-fix.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L108)

The maximum size the change may reach — anything larger is a bloated, undeclared edit.
