[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / ApplyToken

# Interface: ApplyToken

Defined in: core/dist/evidence/validated-output.d.ts:47

A validation-minted, host-authorized apply token. Branded with a private
witness so it is impossible to construct except inside [mintValidated](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/validated-output.ts).
Its value is the content address of the validated payload — so the token both
(a) proves validation happened and (b) binds to the EXACT payload validated
(a host cannot swap the payload after the token is minted without invalidating
the address match; see [assertTokenBinds](../functions/assertTokenBinds.md)).

## Properties

### \[ApplyTokenWitness\]

> `readonly` **\[ApplyTokenWitness\]**: `true`

Defined in: core/dist/evidence/validated-output.d.ts:48

***

### subject

> `readonly` **subject**: `ContentAddress`

Defined in: core/dist/evidence/validated-output.d.ts:50

Content address of the validated payload — the token is bound to THIS payload.

***

### target

> `readonly` **target**: [`ProposalTarget`](../type-aliases/ProposalTarget.md)

Defined in: core/dist/evidence/validated-output.d.ts:52

The projection target the proposal was validated against (diagnostic + routing).
