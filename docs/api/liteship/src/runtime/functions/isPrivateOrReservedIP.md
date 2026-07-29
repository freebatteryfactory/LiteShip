[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / isPrivateOrReservedIP

# Function: isPrivateOrReservedIP()

> **isPrivateOrReservedIP**(`hostname`): `boolean`

Defined in: web/dist/security/runtime-url.d.ts:62

Return `true` when `hostname` resolves to `localhost`, a private
RFC 1918 network, link-local, carrier-grade NAT, or a reserved
range. Handles both IPv4 and IPv6 literals. Used to block SSRF
attempts against metadata services (e.g. 169.254.169.254).

## Parameters

### hostname

`string`

## Returns

`boolean`
