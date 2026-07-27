[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CommandExecutionKind

# Type Alias: CommandExecutionKind

> **CommandExecutionKind** = `"handler"` \| `"cli-orchestration"`

Defined in: [\_spine/command.d.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L68)

What execution shape a command is — the central command law:

  - `handler`: finite structured invocation → returns a `CapsuleCommandResult`
    via a `@liteship/command` handler. The only kind eligible for MCP exposure.
  - `cli-orchestration`: terminal UX, inherited stdio, long-running servers,
    destructive workflows, visible repairs, streaming receipts, or catalog
    projections. Registry-described for identity/discovery, but intentionally
    has NO handler — the CLI owns its execution. Never MCP-exposed.

Making this explicit (vs. inferring "no handler ⇒ fine") means a finite
command that lost its handler is a detectable bug, not a silent gap.
