[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / LITESHIP\_PACKAGES

# Variable: LITESHIP\_PACKAGES

> `const` **LITESHIP\_PACKAGES**: readonly \[`"@czap/_spine"`, `"@czap/error"`, `"@czap/canonical"`, `"@czap/core"`, `"@czap/genui"`, `"@czap/quantizer"`, `"@czap/compiler"`, `"@czap/web"`, `"@czap/detect"`, `"@czap/vite"`, `"@czap/astro"`, `"@czap/edge"`, `"@czap/cloudflare"`, `"@czap/worker"`, `"@czap/remotion"`, `"@czap/scene"`, `"@czap/stage"`, `"@czap/assets"`, `"@czap/gauntlet"`, `"@czap/audit"`, `"@czap/command"`, `"@czap/cli"`, `"@czap/mcp-server"`\]

Defined in: [liteship/src/index.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/liteship/src/index.ts#L21)

Every `@czap/*` package this umbrella installs, in dependency order.
Consumed by audit/doctor/release tooling that needs the canonical fleet
list; app authors never need to import it for layers 1–3.
