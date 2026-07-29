[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / EventsOwnedBy

# Type Alias: EventsOwnedBy\<Owner\>

> **EventsOwnedBy**\<`Owner`\> = `{ [Name in LiteShipEventName]: LiteShipEventMap[Name]["owner"] extends Owner ? Name : never }`\[[`LiteShipEventName`](LiteShipEventName.md)\]

Defined in: [\_spine/events.generated.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L89)

Event identities owned by one semantic package owner.

## Type Parameters

### Owner

`Owner` *extends* [`LiteShipEventOwner`](LiteShipEventOwner.md)
