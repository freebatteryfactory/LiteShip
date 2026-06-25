[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FixReceipt

# Interface: FixReceipt

Defined in: [gauntlet/src/declared-fix.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L67)

A content-addressed RECEIPT of the standards surface + the touched files at one
moment (before OR after the fix). The HOST mints it through the ONE
`contentAddressOf` kernel; this module only COMPARES two receipts for consistency
(a forged/missing receipt is the raccoon claiming a fix it never ran).

The receipt is PURE DATA — the host measured it; the verifier never re-derives an
address here (the gauntlet stays lean, carries no fnv1a kernel).

## Properties

### \_tag

> `readonly` **\_tag**: `"fix-receipt"`

Defined in: [gauntlet/src/declared-fix.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L68)

***

### stampedAt

> `readonly` **stampedAt**: `string`

Defined in: [gauntlet/src/declared-fix.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L89)

The wall-clock ISO timestamp the host stamped the receipt at (two-clock law — a
TIMESTAMP, so `wallClock`, never `systemClock`). Carried for the audit trail; the
verifier does NOT compare timestamps (a fix takes real time, so before ≠ after is
expected) — only the addresses + digests decide consistency.

***

### standardsAddress

> `readonly` **standardsAddress**: `string`

Defined in: [gauntlet/src/declared-fix.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L74)

The content address of the standards SURFACE at this moment (the same
`fnv1a:`-prefixed address the phase-A `StandardsSurface.address` carries) — the
keystone the verifier checks against the host-measured surface address.

***

### touchedDigests

> `readonly` **touchedDigests**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [gauntlet/src/declared-fix.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L82)

The per-file content DIGESTS of the files the fix touched, at this moment, keyed
by repo-relative path. The host reads each touched file's bytes and mints its
digest through the SAME kernel. The before/after digests let the verifier confirm
the receipt describes the SAME file set the actual change reports (a receipt that
omits a touched file is inconsistent).
