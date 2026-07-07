[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / siteConsistentWithCapability

# Function: siteConsistentWithCapability()

> **siteConsistentWithCapability**(`site`, `capability`, `conditional?`): `boolean`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:255](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L255)

Is the sanctioned skip at `site` SELF-CONSISTENT with its declared `capability`?

TWO PATHS — the AST (sound) path and the token (heuristic) fallback path, selected by whether the
caller supplies the STRUCTURAL `conditional` classification:

 - STRUCTURAL (AST) PATH — when `conditional` is provided (the host injected `detectSkipsAST`), it
   is the SOUND proof: an `'unconditional'` skip is a placeholder (NOT consistent → non-sanctionable,
   regardless of title — this is the real fix for `it.skip("ffmpeg probe")` faked-as-a-gate); ANY
   other value (`skipIf`/`runIf`/`ternary`/`enclosing-if`) is a genuine runtime gate → consistent.
   The capability-KEYWORD heuristic is REPLACED by the conditionality proof on this path.

 - TOKEN (FALLBACK) PATH — when `conditional` is `undefined` (the lean token `detectSkips`, no AST),
   the original heuristic stands: consistent iff the site is a visible CONDITIONAL FORM
   (`siteIsConditionalForm`) OR its text references the capability's domain keywords
   (`CAPABILITY_KEYWORDS`). This is the documented best-effort the token level can manage.

Case-insensitive; pure + dependency-free. An UNKNOWN capability (not in the map — the type is
closed, so never) conservatively requires the conditional form on the token path.

## Parameters

### site

`string`

### capability

`"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"webcodecs-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"` \| `"symlink-unprivileged"` \| `"fixture-absent"` \| `"capsule-manifest-absent"`

### conditional?

`SiteConditionality`

## Returns

`boolean`
