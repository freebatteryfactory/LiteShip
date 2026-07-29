[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / EventsInChannel

# Type Alias: EventsInChannel\<Channel\>

> **EventsInChannel**\<`Channel`\> = `{ [Name in LiteShipEventName]: LiteShipEventMap[Name]["channel"] extends Channel ? Name : never }`\[[`LiteShipEventName`](LiteShipEventName.md)\]

Defined in: [\_spine/events.generated.d.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L91)

Event identities delivered through one transport channel.

## Type Parameters

### Channel

`Channel` *extends* [`LiteShipEventChannel`](LiteShipEventChannel.md)
