[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / surfacePolicy

# Variable: surfacePolicy

> `const` **surfacePolicy**: `object`

Defined in: [audit/src/policy.ts:206](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L206)

## Type Declaration

### astroClientDirectives

> **astroClientDirectives**: readonly \[`"satellite"`, `"stream"`, `"llm"`, `"worker"`, `"gpu"`, `"wasm"`\]

### astroPackage

> **astroPackage**: `string` = `'@czap/astro'`

### astroRuntimeFiles

> **astroRuntimeFiles**: readonly \[`"src/runtime/satellite.ts"`, `"src/runtime/stream.ts"`, `"src/runtime/llm.ts"`, `"src/runtime/worker.ts"`, `"src/runtime/gpu.ts"`, `"src/runtime/wasm.ts"`, `"src/runtime/boundary.ts"`, `"src/runtime/slots.ts"`, `"src/runtime/directive-boot.ts"`\]

### knownCapabilityNotes

> **knownCapabilityNotes**: readonly \[\{ `file`: `"packages/astro/src/runtime/gpu.ts"`; `summary`: `"GPU directive currently exposes WebGL2 runtime with an explicit WebGPU/WGSL partial-capability warning path."`; \}, \{ `file`: `"packages/vite/src/virtual-modules.ts"`; `summary`: `"Virtual modules intentionally ship placeholder stubs that are populated by the Vite transform pipeline."`; \}\]

### vitePackage

> **vitePackage**: `string` = `'@czap/vite'`

### viteVirtualModules

> **viteVirtualModules**: readonly \[`"virtual:czap/tokens"`, `"virtual:czap/tokens.css"`, `"virtual:czap/boundaries"`, `"virtual:czap/themes"`, `"virtual:czap/hmr-client"`, `"virtual:czap/wasm-url"`\]

### viteVirtualModulesFile

> **viteVirtualModulesFile**: `string` = `'src/virtual-modules.ts'`
