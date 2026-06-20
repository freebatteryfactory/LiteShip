# Error-migration map — @czap/error fan-out (Slice A)

Replace every `throw new Error(...)` / `Effect.fail(new Error(...))` + the 6 ad-hoc
error classes with the 8 `@czap/error` variants. Import from `@czap/error`.

**Variants:** `ValidationError(module, detail)` · `ParseError(source, detail, {code?, offset?})` ·
`IoError(operation, detail, {path?, cause?})` · `HostCapabilityError(capability, detail)` ·
`InvariantViolationError(invariant, detail)` · `NotFoundError(kind, id, detail?)` ·
`UnsupportedError(subject, detail)` · `IntegrityError(subject, detail, {code?, expected?, actual?})`.
Helpers: `hasTag(e,'X')` (replaces `instanceof`/guards), `matchTag`/`matchTagOr`, `raise`, `assertNever`, `isTaggedError`.

**Rules:**
- Sync throw site: `throw ValidationError(...)`. Effect context: `yield* Effect.fail(ValidationError(...))`.
- Wrapping a caught lower-level error: pass `{ cause }` (IoError) or `taggedError(..., { cause })`.
- Each consuming package: add `"@czap/error": "workspace:*"` to package.json deps; add
  `"@czap/error": ["../error/src/index.ts"]` to tsconfig paths + `{ "path": "../error" }` to references.
- The line numbers below are a GUIDE from recon — VERIFY against the live file; migrate ALL bare throws found, not just the listed ones.

## WAVE 1 — pure bare-throw packages (no ad-hoc class involved)

### web (15) — capture/* host-capability heavy
- capture/pipeline.ts: OffscreenCanvas/HTMLCanvasElement missing → HostCapabilityError; createImageBitmap missing → HostCapabilityError
- capture/render.ts: 2D context from OffscreenCanvas → HostCapabilityError
- capture/webcodecs.ts: VideoEncoder unavailable → HostCapabilityError; codec not supported → UnsupportedError('codec'); missing encodeOptions → ValidationError; encode-after-close → ValidationError; invalid frame/sample source → ValidationError; ImageBitmap→VideoFrame failed → IoError; (audio variants mirror)
- slot/addressing.ts: invalid/missing config → ValidationError('slot.addressing')
- stream/sse-pure.ts: SSE closed unexpectedly → IoError('sse.read')

### cli (11) — lib/load-profile.ts mostly
- load-profile.ts: not-an-object / missing internalPackagePrefix / missing packageTopology / surfacePolicy-not-object / dynamicImportExemptions-not-array / invalid DevopsProfile shape / unsupported extension → ValidationError('profile.load'); missing export → ParseError('profile-module', …, {code:'malformed'}); `--consumer and --profile mutually exclusive` → ValidationError; `--profile path not found` → NotFoundError('file', path)
- ship-manifest.ts: Unknown ship command → UnsupportedError('command')

### edge (9)
- theme-compiler.ts: invalid prefix / unsafe token value → ValidationError('theme.compile')
- manifest.ts: structure invalid → ParseError('manifest', …, {code:'malformed'}); field missing/invalid → ValidationError('manifest.parse')
- host-adapter.ts: unknown platform → UnsupportedError('platform'); missing config / API version mismatch → ValidationError('host-adapter'); init failed / network unreachable → IoError('host-adapter.*')

### command (8)
- commands/ship-planning.ts: invalid plan → ValidationError('ship.planning'); unsupported platform → UnsupportedError('platform')
- host/ffmpeg.ts: stdin closed → IoError('ffmpeg.render',{cause}); exited-0-no-output / 0-byte → IoError('ffmpeg.encode',{path}); ffmpeg unavailable → HostCapabilityError('ffmpeg')
- host-browser/context.ts: invalid config → ValidationError('browser-context')
- registry.ts: unknown command → UnsupportedError('command')

### assets (8)
- decoders/riff.ts: invalid signature → ParseError('riff', …, {code:'malformed'})
- decoders/video.ts: codec not supported → UnsupportedError('codec'); invalid resolution → ValidationError('video.decode')
- decoders/audio.ts: unsupported sample rate / channel mismatch → ValidationError('audio.decode'); decoding failed → IoError('audio.decode')
- contract.ts: site list empty / site incompatible with decoder → ValidationError('defineAsset')

### stage (5)
- ffmpeg-encoder.ts: frame format unsupported → UnsupportedError('frame-format'); config invalid → ValidationError('ffmpeg.encode'); output write failed → IoError('ffmpeg.writeOutput',{path}); process terminated → IoError('ffmpeg.encode')
- dual-export.ts: unsupported format combination → UnsupportedError('format-combination')

### worker (4)
- host.ts: message on wrong channel → ValidationError('worker.host')
- spsc-ring.ts: push-on-consumer / pop-on-producer / invalid slot size → InvariantViolationError('spsc-ring')   [worker has NO effect dep; @czap/error is zero-dep — fine]

### cloudflare (4)
- middleware.ts: unsupported method → UnsupportedError('http-method'); invalid headers / rate limited → ValidationError('cloudflare.middleware'); downstream unavailable → IoError('cloudflare.fetch')

### audit (3)  [NO effect dep]
- consumer.ts: invalid event data → ValidationError('audit.consumer')
- devops-profile.ts: required field missing → ValidationError('devops-profile')
- shared.ts: incompatible schema version → UnsupportedError('schema-version')

### vite (1)  [NO effect dep]
- plugin.ts: config invalid → ValidationError('vite-plugin')

## WAVE 2 — ad-hoc classes (cross-package ripple) + scene/quantizer consumers

### canonical — CborDecodeError → ParseError  [CLEAN: no instanceof consumers, only re-exports]
- cbor-decode.ts: ~21 `throw new CborDecodeError(reason, msg, offset)` → `throw ParseError('cbor', msg, { code: reason, offset })`. Delete the class.
- canonical/src/index.ts: drop CborDecodeError re-export (+ type). core/src/cbor.ts: drop its re-export.

### core — biggest
- 21 bare throws (see recon): hlc format → ParseError('hlc',{code:'malformed'}); hlc/dag/validated-output/ai-cast(711,724)/assembly/spsc → InvariantViolationError or ValidationError per recon; wasm missing export → InvariantViolationError; wasm fetch → IoError; ai-cast(408) catalog → ValidationError; harness/cached-projection fixture-missing → IoError, no-derive-handler → ValidationError.
- CzapValidationError (validation-error.ts) → ValidationError. Consumers (constructor sites): ecs, av-bridge, theme, easing, composable, style, frame-budget, boundary, signal, dirty, token, quantizer/quantizer.ts, scene/compile.ts. `isValidationError` guard + core/index.ts:329 re-export → replace consumers with `hasTag(e,'ValidationError')`; DELETE validation-error.ts + the guard (no compat shim — user law).
- UnsupportedSchemaError (harness/arbitrary-from-schema.ts, ~11 throw sites) → UnsupportedError('schema node', …) with subject=ast._tag. instanceof consumers: harness/pure-transform.ts, state-machine.ts, cached-projection.ts → hasTag(e,'UnsupportedError'). harness/index.ts re-export → drop.

### mcp-server — InvalidParamsError + ResourceNotFoundError
- InvalidParamsError → ValidationError('mcp-server'|subcat). ResourceNotFoundError → NotFoundError('resource', uri).
- dispatch.ts JSON-RPC code mapping is keyed on class identity: `instanceof InvalidParamsError → -32602`, `instanceof ResourceNotFoundError → -32002`. Rewrite to `hasTag(e,'ValidationError') → -32602`, `hasTag(e,'NotFoundError') → -32002`. Verify the code mapping stays exact. Delete errors.ts classes.
- constructor consumers: prompts.ts, app-resources.ts, resources.ts, manifest-resource.ts, ui-resources.ts.

### create-liteship — ScaffoldError → ValidationError('scaffold', message)
- scaffold.ts throw sites; index.ts:96 instanceof → hasTag(e,'ValidationError'). Delete the class.

### scene — runtime.ts invalid state transition → InvariantViolationError('scene.runtime'); compile.ts CzapValidationError → ValidationError (WAVE 2 with core).
### quantizer — quantizer.ts CzapValidationError → ValidationError.

## WAVE 3 — brands (8) → validating smart constructors (core/brands.ts + canonical/assets/genui). Honest invariants only (Millis≥0&finite, ContentAddress=fnv1a:8hex, etc.); throw ValidationError on bad input.
## WAVE 4 — route closed-union switches through shared assertNever.
