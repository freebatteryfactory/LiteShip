[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / RuntimeUrlResolution

# Type Alias: RuntimeUrlResolution

> **RuntimeUrlResolution** = \{ `type`: `"missing"`; \} \| \{ `baseOrigin`: `string`; `detail?`: `string`; `rawUrl`: `string`; `reason`: `"url-can-parse-rejected"` \| `"url-constructor-threw"`; `type`: `"malformed"`; \} \| \{ `resolved`: `URL`; `type`: `"cross-origin-rejected"`; \} \| \{ `resolved`: `URL`; `type`: `"origin-not-allowed"`; \} \| \{ `resolved`: `URL`; `type`: `"kind-not-allowed"`; \} \| \{ `resolved`: `URL`; `type`: `"private-ip-rejected"`; \} \| \{ `resolved`: `URL`; `type`: `"allowed"`; `url`: `string`; \}

Defined in: web/dist/security/runtime-url.d.ts:16

Discriminated union returned by [resolveRuntimeUrl](../functions/resolveRuntimeUrl.md). Every
non-`allowed` variant preserves enough context for the caller to log
or report why the URL was rejected.
