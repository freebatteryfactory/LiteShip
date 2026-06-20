# Decisions pending owner review (throughput mode)

Rule: at each fork I try "cake and eat it" (satisfy both horns, no quality loss) and proceed.
Only GENUINELY IRREDUCIBLE tradeoffs land here — I keep moving and you batch-review these later.
Each entry: the fork, the both-win attempt, why it's irreducible, my default choice (what I shipped
so the pipeline didn't stall), and how to reverse if you disagree.

Resolved-by-cake-and-eat-it (NOT pending — logged for the record):
- Error construction: zero-dep `_tag` classes AND full Effect interop (catchTag keys on _tag). ✅
- Topology gate: foundational allowlist AND downstream-extensible (optional profile field). ✅
- Brand validation "all 8" AND no ceremony: each scalar gets its REAL invariant, not a type-restate. ✅

## PENDING (none yet)

<!-- entries appended here as they arise -->
