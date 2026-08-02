# LiteShip public export contracts

Generated from the typed 25-package catalog and the TypeScript export graph. The `liteship` root is the paved road; package and facade subpaths are advanced modules. `public-exports:check` proves every named binding is export-reachable and has a source declaration owner, consumer import spelling, TSDoc purpose, failure policy, invariant, replacement status, and named package proof. The binding total is not a claim that every structural type has a concrete runtime inhabitant: executable allocation/read proof is exhaustive only for paved-road root values; advanced type inhabitation remains an explicit owner contract. Use `liteship explain <symbol>` for the symbol-level answer.

Bindings: **4158** across **87** public specifiers.

| Specifier | Surface | Audience | Stability | Bindings | Declaration owners | Invariant |
| --- | --- | --- | --- | ---: | ---: | --- |
| `@liteship/_spine` | advanced-module | package-author | stable | 432 | 17 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/_spine/command` | advanced-module | package-author | stable | 10 | 1 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/_spine/core` | advanced-module | package-author | stable | 177 | 1 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/_spine/design` | advanced-module | package-author | stable | 20 | 1 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/_spine/events` | advanced-module | package-author | stable | 8 | 1 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/_spine/genui` | advanced-module | package-author | stable | 5 | 1 | `INV-SPINE-EXACT-RELATION` |
| `@liteship/assets` | advanced-module | package-author | experimental | 32 | 10 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro` | advanced-module | host-integrator | stable | 34 | 11 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/Adaptive` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/adaptive-runtime` | advanced-module | host-integrator | stable | 8 | 2 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/Adaptive.astro` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/adaptive` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/gpu` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/graph` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/llm` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/motion` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/stream` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/svg` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/wasm` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/client-directives/worker` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/fetch-layer` | advanced-module | host-integrator | stable | 5 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/middleware` | advanced-module | host-integrator | stable | 3 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/middleware-entry` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/runtime` | advanced-module | host-integrator | stable | 84 | 20 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/astro/runtime/inspector-toolbar-app` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/audit` | advanced-module | operator | stable | 191 | 33 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/canonical` | advanced-module | package-author | stable | 14 | 7 | `INV-CANONICAL-BYTES` |
| `@liteship/cli` | advanced-module | operator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/cloudflare` | advanced-module | host-integrator | stable | 10 | 3 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/cloudflare/cache-provider` | advanced-module | host-integrator | stable | 8 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/cloudflare/testing` | advanced-module | host-integrator | stable | 3 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/command` | advanced-module | operator | stable | 162 | 32 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/command/host` | advanced-module | operator | stable | 33 | 11 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/command/host-browser` | advanced-module | operator | stable | 6 | 2 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/command/invariants` | advanced-module | operator | stable | 4 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/compiler` | advanced-module | package-author | stable | 84 | 22 | `INV-ADAPTIVE-CSS-BYTE-EQUIVALENCE` |
| `@liteship/compiler/migrate` | advanced-module | package-author | stable | 18 | 7 | `INV-ADAPTIVE-CSS-BYTE-EQUIVALENCE` |
| `@liteship/compiler/parse` | advanced-module | package-author | stable | 10 | 2 | `INV-ADAPTIVE-CSS-BYTE-EQUIVALENCE` |
| `@liteship/core` | advanced-module | package-author | stable | 465 | 109 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/authoring` | advanced-module | package-author | stable | 108 | 27 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/clock` | advanced-module | package-author | stable | 11 | 4 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/ecs` | advanced-module | package-author | stable | 25 | 3 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/evidence` | advanced-module | package-author | stable | 51 | 16 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/fs-walk` | advanced-module | package-author | stable | 3 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/graph` | advanced-module | package-author | stable | 68 | 10 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/harness` | advanced-module | package-author | stable | 23 | 10 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/media` | advanced-module | package-author | stable | 39 | 9 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/motion` | advanced-module | package-author | stable | 89 | 14 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/reactive` | advanced-module | package-author | stable | 62 | 17 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/schema` | advanced-module | package-author | stable | 77 | 13 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/simulation` | advanced-module | package-author | stable | 27 | 6 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/core/wasm` | advanced-module | package-author | stable | 6 | 3 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/detect` | advanced-module | host-integrator | stable | 45 | 7 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/edge` | advanced-module | host-integrator | stable | 42 | 7 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/error` | advanced-module | package-author | stable | 35 | 4 | `INV-DIAGNOSTIC-CODE-CLOSED` |
| `@liteship/gauntlet` | advanced-module | operator | stable | 346 | 81 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/genui` | advanced-module | package-author | experimental | 17 | 8 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/mcp-server` | advanced-module | operator | experimental | 97 | 18 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/quantizer` | advanced-module | package-author | stable | 22 | 6 | `INV-ADAPTIVE-RECEIPT-EQUIVALENCE` |
| `@liteship/quantizer/testing` | advanced-module | package-author | stable | 2 | 2 | `INV-ADAPTIVE-RECEIPT-EQUIVALENCE` |
| `@liteship/remotion` | advanced-module | host-integrator | experimental | 11 | 4 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/scene` | advanced-module | package-author | experimental | 102 | 23 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/scene/dev` | advanced-module | package-author | experimental | 2 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/stage` | advanced-module | host-integrator | experimental | 15 | 2 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/stage/ffmpeg` | advanced-module | host-integrator | experimental | 5 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/vite` | advanced-module | host-integrator | stable | 53 | 14 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/vite/hmr` | advanced-module | host-integrator | stable | 4 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/vite/html-transform` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/vite/virtual` | advanced-module | host-integrator | stable | 1 | 1 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/web` | advanced-module | host-integrator | stable | 128 | 31 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/web/lite` | advanced-module | host-integrator | stable | 36 | 7 | `INV-PUBLIC-SURFACE-INHABITED` |
| `@liteship/worker` | advanced-module | host-integrator | stable | 20 | 8 | `INV-PUBLIC-SURFACE-INHABITED` |
| `create-liteship` | advanced-module | operator | stable | 10 | 2 | `INV-PUBLIC-SURFACE-INHABITED` |
| `liteship` | paved-road | package-author | stable | 17 | 11 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/astro` | advanced-module | package-author | stable | 37 | 12 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/compiler` | advanced-module | package-author | stable | 81 | 19 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/evidence` | advanced-module | package-author | stable | 42 | 12 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/genui` | advanced-module | package-author | stable | 17 | 8 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/graph` | advanced-module | package-author | stable | 68 | 10 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/media` | advanced-module | package-author | stable | 39 | 9 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/migrate` | advanced-module | package-author | stable | 14 | 7 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/motion` | advanced-module | package-author | stable | 81 | 11 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/reactive` | advanced-module | package-author | stable | 66 | 17 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/runtime` | advanced-module | package-author | stable | 127 | 30 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/schema` | advanced-module | package-author | stable | 74 | 12 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/testing` | advanced-module | package-author | stable | 25 | 11 | `INV-FACADE-EXPORT-BUDGET` |
| `liteship/vite` | advanced-module | package-author | stable | 47 | 13 | `INV-FACADE-EXPORT-BUDGET` |

Exact symbol metadata is intentionally not mirrored as a megabyte-scale prose table: declaration TSDoc is its owner, the generated TypeDoc/API index is its projection, and the public-export contract gate proves the full relation.
