# Edge Cache

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/06_cache/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own edge cache provider authority: canonical keys, declared variation, private partitions, lookup, fill, revalidation, invalidation, and receipts.

## Owns

- The key contract: canonical input address plus explicit variation row plus privacy partition — never a hand-built string.
- The closed variation vocabulary: tenant, authorization, locale, capability, content.
- The phase-correct disposition algebra: hit, miss, stale, bypass.
- The intrinsic cache facility carries physical lookup and fill contracts, not an interchangeable availability marker.

## Does not own

- A second cache ontology or semantic state store — core state semantics stay upstream.
- Cache privacy policy — consumed from `03_policy` by requirement row.

## Laws

- A key derives from canonical input, declared variation, and a partition.
- The variation vocabulary is closed and exact.
- Dispositions are phase-correct; hit and stale carry entries.
- Caching requires the policy.

## Proof obligations

- Variation is complete; private data cannot cross partitions; poisoning defenses hold.

`system/01_assurance`; TTLs, stale windows, and cardinality limits are empirical.

## Implementation boundary

Specified with physical profiles deferred. No cache driver code exists or is authorized.
