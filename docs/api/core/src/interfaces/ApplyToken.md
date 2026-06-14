[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ApplyToken

# Interface: ApplyToken

Defined in: [core/src/validated-output.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L51)

A validation-minted, host-authorized apply token. Branded with a private
witness so it is impossible to construct except inside mintValidated.
Its value is the content address of the validated payload — so the token both
(a) proves validation happened and (b) binds to the EXACT payload validated
(a host cannot swap the payload after the token is minted without invalidating
the address match; see [assertTokenBinds](../functions/assertTokenBinds.md)).

## Properties

### \[ApplyTokenWitness\]

> `readonly` **\[ApplyTokenWitness\]**: `true`

Defined in: [core/src/validated-output.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L52)

***

### subject

> `readonly` **subject**: `ContentAddress`

Defined in: [core/src/validated-output.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L54)

Content address of the validated payload — the token is bound to THIS payload.

***

### target

> `readonly` **target**: [`ProposalTarget`](../type-aliases/ProposalTarget.md)

Defined in: [core/src/validated-output.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L56)

The projection target the proposal was validated against (diagnostic + routing).
