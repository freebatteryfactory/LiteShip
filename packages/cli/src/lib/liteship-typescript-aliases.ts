/**
 * LiteShip source-entry aliases for type-directed assurance programs.
 *
 * The reusable audit engine accepts an injected alias map. The CLI host owns
 * this project-shaped projection because it names LiteShip packages and source
 * paths. Keep it in lockstep with `Config.toTestAliases`; the capsule-detector
 * contract test proves parity.
 */
export const LITESHIP_TYPESCRIPT_PATH_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  '@liteship/canonical': ['packages/canonical/src/index.ts'],
  '@liteship/genui': ['packages/genui/src/index.ts'],
  '@liteship/core/harness': ['packages/core/src/harness/index.ts'],
  '@liteship/core/simulation': ['packages/core/src/simulation/index.ts'],
  '@liteship/core/fs-walk': ['packages/core/src/fs-walk.ts'],
  '@liteship/core/authoring': ['packages/core/src/authoring/index.ts'],
  '@liteship/core/reactive': ['packages/core/src/reactive/index.ts'],
  '@liteship/core/motion': ['packages/core/src/motion/index.ts'],
  '@liteship/core/graph': ['packages/core/src/graph/index.ts'],
  '@liteship/core/evidence': ['packages/core/src/evidence/index.ts'],
  '@liteship/core/schema': ['packages/core/src/schema/index.ts'],
  '@liteship/core/media': ['packages/core/src/media/index.ts'],
  '@liteship/core/clock': ['packages/core/src/clock/index.ts'],
  '@liteship/core/wasm': ['packages/core/src/wasm/index.ts'],
  '@liteship/core': ['packages/core/src/index.ts'],
  '@liteship/quantizer/testing': ['packages/quantizer/src/testing.ts'],
  '@liteship/quantizer': ['packages/quantizer/src/index.ts'],
  '@liteship/compiler/migrate': ['packages/compiler/src/migrate/index.ts'],
  '@liteship/compiler/parse': ['packages/compiler/src/parse/index.ts'],
  '@liteship/compiler': ['packages/compiler/src/index.ts'],
  '@liteship/web/lite': ['packages/web/src/lite.ts'],
  '@liteship/web': ['packages/web/src/index.ts'],
  '@liteship/detect': ['packages/detect/src/index.ts'],
  '@liteship/vite/html-transform': ['packages/vite/src/html-transform.ts'],
  '@liteship/vite': ['packages/vite/src/index.ts'],
  '@liteship/astro/adaptive-runtime': ['packages/astro/src/adaptive-runtime.ts'],
  '@liteship/astro/runtime': ['packages/astro/src/runtime/index.ts'],
  '@liteship/astro': ['packages/astro/src/index.ts'],
  '@liteship/stage/ffmpeg': ['packages/stage/src/ffmpeg.ts'],
  '@liteship/stage': ['packages/stage/src/index.ts'],
  '@liteship/remotion': ['packages/remotion/src/index.ts'],
  '@liteship/scene/dev': ['packages/scene/src/dev/server.ts'],
  '@liteship/scene': ['packages/scene/src/index.ts'],
  '@liteship/assets': ['packages/assets/src/index.ts'],
  '@liteship/audit': ['packages/audit/src/index.ts'],
  '@liteship/cli': ['packages/cli/src/index.ts'],
  '@liteship/mcp-server': ['packages/mcp-server/src/index.ts'],
  '@liteship/edge': ['packages/edge/src/index.ts'],
  '@liteship/cloudflare/testing': ['packages/cloudflare/src/testing.ts'],
  '@liteship/cloudflare': ['packages/cloudflare/src/index.ts'],
  '@liteship/worker': ['packages/worker/src/index.ts'],
  '@liteship/_spine': ['packages/_spine/index.ts'],
});
