<!--
LiteShip is maintainer-led and doctrine-protected. Contributions are welcome;
direction is not crowdsourced. A technically-correct PR may still be declined if
it doesn't fit the project's doctrine, performance model, or conceptual shape —
that's not arbitrary, it's "violates a written invariant" (an ADR, the plumb-gate,
the source-of-truth principle, the zero-advisory floor).

Bug fixes / tests / docs / small compatibility patches: open a PR directly.
New features / public-API / architecture / dependency / naming changes: open an
issue or RFC FIRST. Large PRs without prior discussion are usually closed.
-->

## What & why

<!-- The change and the problem it solves. Link the issue/RFC if one exists. -->

## Checklist

- [ ] Scoped: a bug fix / test / docs / small patch — OR an API/architecture change with a prior issue/RFC.
- [ ] Every behavior change ships its falsifying test (the SQLite/DO-178B bar).
- [ ] `pnpm run gauntlet:full` is green locally, or I understand which CI phase will gate it.
- [ ] No new dependency without justification; no public-API/naming change without an RFC.
- [ ] Docs touched only with intent (the `docs/` chain is sacred — match house voice, keep `docs:check` green).
- [ ] If AI-generated: I have read and understood every line. No vibe-dump-and-flee.
