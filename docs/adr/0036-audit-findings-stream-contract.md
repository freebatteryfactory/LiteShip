# ADR-0036 — `audit --findings` stream contract

**Status:** Accepted  
**Date:** 2026-07-08

## Context

The CLI contract is one JSON receipt on stdout per command (`packages/cli/README.md`).
`czap audit --findings` deliberately diverges: findings NDJSON on stdout, receipt on
stderr. That split exists so `czap audit --findings | jq` can pipe findings without
mixing the summary receipt — the flag's entire purpose is machine-streamable findings.

## Decision

**Keep the split.** `--findings` is an explicit, documented exception to the
one-receipt-on-stdout rule — not the default audit mode.

- Default `czap audit` → one receipt on stdout (unchanged).
- `czap audit --findings` → one finding per stdout line (NDJSON) + receipt on stderr.
- Pretty TTY per-finding lines are suppressed under `--findings` unless `--pretty` is
  passed explicitly (avoids duplicating NDJSON in stderr).

## Consequences

- jq pipelines against findings stay clean without a custom receipt stripper.
- MCP and default CLI adapters that expect one stdout JSON line must NOT pass
  `--findings`; they use the structured receipt fields instead.
- A future 1.0 `--output=findings|receipt` unification is possible but not required
  for correctness today.

## Rejected alternatives

- **Unify on one-receipt-on-stdout** — buries findings inside the receipt and breaks
  the established `| jq` operator workflow; the flag would become pointless.
- **Findings on stderr** — inverted the pipe ergonomics; operators want findings on
  the primary pipe.
