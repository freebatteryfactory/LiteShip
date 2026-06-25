[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / StandardsWaiver

# Interface: StandardsWaiver

Defined in: [gauntlet/src/standards-facts.ts:236](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L236)

The OWNER SIGN-OFF — the only honest escape for a weakening. A signed
authorization that a SPECIFIC weakening is intentional, with the SAME
accountability shape as the gauntlet's own [Waiver](Waiver.md): an owner, a
justification, the EXACT element key being weakened, and an expiry.

An UNSIGNED weakening = the raccoon caught (blocking). A SIGNED one = allowed +
recorded. The sign-off can NEVER cover [ALWAYS\_BLOCKING\_RULES](../variables/ALWAYS_BLOCKING_RULES.md) (the
always-blocking set shrinking, or a gate emitting an always-blocking rule being
weakened) — checked in [diffStandardsSurface](../functions/diffStandardsSurface.md), never honoured here.

## Properties

### elementKey

> `readonly` **elementKey**: `string`

Defined in: [gauntlet/src/standards-facts.ts:238](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L238)

The exact [surfaceElementKey](../functions/surfaceElementKey.md) of the element being weakened.

***

### expiry

> `readonly` **expiry**: `string`

Defined in: [gauntlet/src/standards-facts.ts:246](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L246)

When the sign-off dies (ISO `yyyy-mm-dd`). Past the injected date ⇒ the weakening re-reds.

***

### justification

> `readonly` **justification**: `string`

Defined in: [gauntlet/src/standards-facts.ts:244](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L244)

Why the weakening is sanctioned — the justification of record.

***

### owner

> `readonly` **owner**: `string`

Defined in: [gauntlet/src/standards-facts.ts:242](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L242)

Who signed off — accountability is mandatory, never anonymous.

***

### weakening

> `readonly` **weakening**: [`WeakeningClass`](../type-aliases/WeakeningClass.md)

Defined in: [gauntlet/src/standards-facts.ts:240](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L240)

The expected weakening CLASS this sign-off authorizes (a sign-off is class-specific).
