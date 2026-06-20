# Decisions pending owner review (throughput mode)

Rule: at each fork I try "cake and eat it" (satisfy both horns, no quality loss) and proceed.
Only GENUINELY IRREDUCIBLE tradeoffs land here — I keep moving and you batch-review these later.
Each entry: the fork, the both-win attempt, why it's irreducible, my default choice (what I shipped
so the pipeline didn't stall), and how to reverse if you disagree.

Resolved-by-cake-and-eat-it (NOT pending — logged for the record):
- Error construction: zero-dep `_tag` classes AND full Effect interop (catchTag keys on _tag). ✅
- Topology gate: foundational allowlist AND downstream-extensible (optional profile field). ✅
- Brand validation "all 8" AND no ceremony: each scalar gets its REAL invariant, not a type-restate. ✅

## PENDING

### ⚑ Assurance-level assignment — which paths are L0–L4 ("aiming the cannon")
**The fork:** gates must run scoped to their assurance level (an L3 determinism gate
must NOT flag L1 tooling — that's the no-nondeterminism red-drowning the gauntlet
surfaced). That needs a path→level map. WHICH paths are L3/L4 is an architectural
judgment about what's nuclear — genuinely the owner's call.

**Cake-and-eat-it attempt:** none fully resolves it — the map is irreducibly a
judgment about criticality. But I can ship a defensible DEFAULT and let you redline.

**My default (shipped so the pipeline moves; reverse by editing the map):**
- **L4** (if it lies, downstream trusts bad reality): canonical/* (content-address
  + CBOR), core/src/{receipt,hlc,plan,dag,validated-output,ai-cast,assembly,
  brands}, core/src/quantizer-evaluator paths, graph-patch.
- **L3** (deterministic runtime/projection/cache): core/src/{boundary,signal,zap,
  evaluate,gen-frame,speculative,token-buffer,blend,animation}, quantizer/*,
  web/src/{capture,stream}, worker/*, astro/src/runtime/*.
- **L2** (public API + serialized): every package's src/index.ts + capsule/
  contract/schema files + edge manifest + scene contract.
- **L1** (normal): everything else in runtime packages.
- **L0/L1 tooling** (nondeterminism etc. is LEGIT here): cli/*, command/*,
  mcp-server/*, audit/*, gauntlet/*, remotion/*, stage/*, scripts/*.

**How to apply:** `assuranceMap: {glob, level}[]` in the gauntlet, most-specific
wins, default L1; the runner filters each gate's files to its level+. Owner edits
the map; nothing else changes.

**Coupled:** waivers-with-teeth (owner/reason/expires/blastRadius/debtScore; never
covers a skip) for the legit sites WITHIN a level (e.g. HLC's by-design clock read
at L3/L4 — waived with the injection-point reason; fast-check seeds; intentional
best-effort catches in spawn teardown). Build the waiver MECHANISM (bounded, no ⚑);
FILL the per-site waivers during triage (judgment).

<!-- entries appended here as they arise -->
