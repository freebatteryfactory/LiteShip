[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / surfacePolicy

# Variable: surfacePolicy

> `const` **surfacePolicy**: `object`

Defined in: [audit/src/policy.ts:173](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L173)

## Type Declaration

### astroClientDirectives

> **astroClientDirectives**: readonly \[`"satellite"`, `"stream"`, `"llm"`, `"worker"`, `"gpu"`, `"wasm"`\]

### astroPackage

> **astroPackage**: `string` = `'@czap/astro'`

### astroRuntimeFiles

> **astroRuntimeFiles**: readonly \[`"packages/astro/src/runtime/satellite.ts"`, `"packages/astro/src/runtime/stream.ts"`, `"packages/astro/src/runtime/llm.ts"`, `"packages/astro/src/runtime/worker.ts"`, `"packages/astro/src/runtime/gpu.ts"`, `"packages/astro/src/runtime/wasm.ts"`, `"packages/astro/src/runtime/boundary.ts"`, `"packages/astro/src/runtime/slots.ts"`\]

### knownCapabilityNotes

> **knownCapabilityNotes**: readonly \[\{ `file`: `"packages/astro/src/runtime/gpu.ts"`; `summary`: `"GPU directive currently exposes WebGL2 runtime with an explicit WebGPU/WGSL partial-capability warning path."`; \}, \{ `file`: `"packages/vite/src/virtual-modules.ts"`; `summary`: `"Virtual modules intentionally ship placeholder stubs that are populated by the Vite transform pipeline."`; \}\]

### viteVirtualModules

> **viteVirtualModules**: readonly \[`"virtual:czap/tokens"`, `"virtual:czap/tokens.css"`, `"virtual:czap/boundaries"`, `"virtual:czap/themes"`, `"virtual:czap/hmr-client"`, `"virtual:czap/wasm-url"`\]
