[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / getDefaultWorkersEnv

# Function: getDefaultWorkersEnv()

> **getDefaultWorkersEnv**(): [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md)

Defined in: [cloudflare/src/middleware.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L77)

Read the workerd execution env captured by loadWorkersEnvFromRuntime or seeded for tests. Returns `{}` until one of those has run.

## Returns

[`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md)
