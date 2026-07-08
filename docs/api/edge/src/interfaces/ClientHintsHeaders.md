[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / ClientHintsHeaders

# Interface: ClientHintsHeaders

Defined in: [edge/src/client-hints.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L25)

Plain-object header bag accepted by [ClientHints.parseClientHints](../variables/ClientHints.md#parseclienthints).

All names are lowercased because Client Hints headers are always lowercase
in spec. Values that are missing simply fall back to conservative
defaults during parsing.

## Properties

### downlink?

> `readonly` `optional` **downlink?**: `string`

Defined in: [edge/src/client-hints.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L47)

`Downlink` estimate in Mb/s.

***

### ect?

> `readonly` `optional` **ect?**: `string`

Defined in: [edge/src/client-hints.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L49)

`ECT` effective connection type.

***

### rtt?

> `readonly` `optional` **rtt?**: `string`

Defined in: [edge/src/client-hints.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L51)

`RTT` round-trip-time estimate in ms.

***

### save-data?

> `readonly` `optional` **save-data?**: `string`

Defined in: [edge/src/client-hints.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L45)

`Save-Data` (`on`).

***

### sec-ch-device-memory?

> `readonly` `optional` **sec-ch-device-memory?**: `string`

Defined in: [edge/src/client-hints.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L29)

`Sec-CH-Device-Memory` in GiB (one of the standard buckets).

***

### sec-ch-dpr?

> `readonly` `optional` **sec-ch-dpr?**: `string`

Defined in: [edge/src/client-hints.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L31)

`Sec-CH-DPR` — devicePixelRatio as a decimal string.

***

### sec-ch-prefers-color-scheme?

> `readonly` `optional` **sec-ch-prefers-color-scheme?**: `string`

Defined in: [edge/src/client-hints.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L39)

`Sec-CH-Prefers-Color-Scheme` (`light` / `dark`).

***

### sec-ch-prefers-reduced-motion?

> `readonly` `optional` **sec-ch-prefers-reduced-motion?**: `string`

Defined in: [edge/src/client-hints.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L37)

`Sec-CH-Prefers-Reduced-Motion` (`reduce` / `no-preference`).

***

### sec-ch-ua?

> `readonly` `optional` **sec-ch-ua?**: `string`

Defined in: [edge/src/client-hints.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L43)

`Sec-CH-UA` — full user-agent brand list.

***

### sec-ch-ua-mobile?

> `readonly` `optional` **sec-ch-ua-mobile?**: `string`

Defined in: [edge/src/client-hints.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L41)

`Sec-CH-UA-Mobile` as a structured boolean (`?1` / `?0`).

***

### sec-ch-ua-platform?

> `readonly` `optional` **sec-ch-ua-platform?**: `string`

Defined in: [edge/src/client-hints.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L27)

`Sec-CH-UA-Platform` (e.g. `"macOS"`, `"Windows"`).

***

### sec-ch-viewport-height?

> `readonly` `optional` **sec-ch-viewport-height?**: `string`

Defined in: [edge/src/client-hints.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L35)

`Sec-CH-Viewport-Height` in CSS pixels.

***

### sec-ch-viewport-width?

> `readonly` `optional` **sec-ch-viewport-width?**: `string`

Defined in: [edge/src/client-hints.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L33)

`Sec-CH-Viewport-Width` in CSS pixels.

***

### user-agent?

> `readonly` `optional` **user-agent?**: `string`

Defined in: [edge/src/client-hints.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L53)

`User-Agent` fallback for GPU-tier heuristics.
