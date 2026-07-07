[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / sanctionedSkipFor

# Function: sanctionedSkipFor()

> **sanctionedSkipFor**(`file`, `siteLine`, `conditional?`): [`SanctionedSkip`](../interfaces/SanctionedSkip.md) \| `undefined`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:493](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L493)

Is the skip at `siteLine` in `file` SANCTIONED? A skip is allowed ONLY if its file is
enumerated in [SANCTIONED\_SKIPS](../variables/SANCTIONED_SKIPS.md) AND its own normalized source line MATCHES a
declared site for that file. `siteLine` is the RAW source line the skip sits on (the
caller passes it un-normalized; this normalizes both sides). Returns the matching entry
(for the visible-audit detail) or `undefined` when the skip is unsanctioned (→ BLOCKING)
— including a NEW, unrelated skip in an otherwise-sanctioned file.

PLACEHOLDER FLOOR: a site carrying a [placeholder marker](../variables/PLACEHOLDER_SKIP_MARKERS.md)
(TODO / FIXME / not implemented / stub / …) is NON-sanctionable — it is rejected here even
if it were (mistakenly or maliciously) enumerated in [SANCTIONED\_SKIPS](../variables/SANCTIONED_SKIPS.md). A
placeholder skip is unfinished work, not a capability gate; it can never be sanctioned
past the always-blocking no-placeholder floor. The legit capability-gate sites (named by
capability) never carry a marker, so this never false-rejects a genuine gate.

CAPABILITY-CONSISTENCY FLOOR (codex round-6): the marker-free placeholder. Even an enumerated
site is rejected if it is NOT [self-consistent with its](siteConsistentWithCapability.md) — an UNCONDITIONAL `it.skip(<title>)` whose title neither names the
capability domain nor carries a visible condition (`it.skip("later")`). A genuine gate is either
a visible conditional (skipIf/runIf/ternary) or names its capability, so this only ever rejects
the disguised placeholder, never one of the 15 legit sanctioned sites (each does one or the
other). The SOUND conditionality proof (the enclosing `if (!CAP) {…}` the token level can't see)
is now DELIVERED via the optional `conditional` argument: when the caller (the no-skip gate with
the AST `detectSkipsAST` injected) passes the structural classification, an `'unconditional'` skip
is refused regardless of title (the real cure for `it.skip("ffmpeg probe")` faked as a gate), and
any genuine conditional form (`skipIf`/`runIf`/`ternary`/`enclosing-if`) is honored. Absent it (the
token-fallback path) the keyword heuristic stands, exactly as before.

## Parameters

### file

`string`

### siteLine

`string`

### conditional?

`SiteConditionality`

The AST conditionality (the sound F2 proof) when available; `undefined` ⇒ token path.

## Returns

[`SanctionedSkip`](../interfaces/SanctionedSkip.md) \| `undefined`
