[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / CapsuleCommandDescriptor

# Interface: CapsuleCommandDescriptor

Defined in: [\_spine/command.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L71)

Identity + contract that drives CLI listing AND MCP tools/list from ONE source.

## Properties

### annotations?

> `readonly` `optional` **annotations?**: [`CommandAnnotations`](CommandAnnotations.md)

Defined in: [\_spine/command.d.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L77)

***

### cli?

> `readonly` `optional` **cli?**: `object`

Defined in: [\_spine/command.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L89)

CLI projection metadata layered over the transport-neutral input schema.

`inputSchema.properties` remains the semantic argument contract shared by
the CLI and MCP. `adapterFlags` lists only CLI-host concerns that must never
leak into MCP tools (for example `--json` pretty-output suppression or the
package-smoke scratch-artifact directory). Positional property names are
removed from the derived flag set; every other input property projects to a
kebab-cased long flag. Dotted command identity always projects to a
space-separated invocation and is therefore not repeated here.

#### adapterFlags?

> `readonly` `optional` **adapterFlags?**: `Readonly`\<`Record`\<`` `--${string}` ``, \{ `type`: `"string"` \| `"boolean"`; \}\>\>

CLI-host-only long flags and their argv value shape.

#### flagAliases?

> `readonly` `optional` **flagAliases?**: `Readonly`\<`Record`\<`` `--${string}` ``, readonly `` `-${string}` ``[]\>\>

Optional short aliases keyed by the canonical long flag.

#### outputMode

> `readonly` **outputMode**: `"text"` \| `"json"` \| `"process"`

Default stdout contract for the invocation.

#### positionals?

> `readonly` `optional` **positionals?**: readonly `string`[]

Names from `inputSchema.properties` consumed positionally by argv.

***

### executionKind?

> `readonly` `optional` **executionKind?**: [`CommandExecutionKind`](../type-aliases/CommandExecutionKind.md)

Defined in: [\_spine/command.d.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L100)

Execution shape — `handler` (structured) vs `cli-orchestration` (CLI-owned).

***

### inputSchema

> `readonly` **inputSchema**: [`CommandJsonSchema`](CommandJsonSchema.md)

Defined in: [\_spine/command.d.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L75)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/command.d.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L73)

Canonical dotted id, e.g. `scene.render`.

***

### outputSchema?

> `readonly` `optional` **outputSchema?**: [`CommandJsonSchema`](CommandJsonSchema.md)

Defined in: [\_spine/command.d.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L76)

***

### requires?

> `readonly` `optional` **requires?**: readonly `string`[]

Defined in: [\_spine/command.d.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L111)

Names of injected `CommandContext` capabilities the handler cannot run
without — declared as DATA so a consumer wiring a custom context can read
what each command needs instead of discovering it by trial. The dispatcher
enforces presence BEFORE invoking the handler and fails structurally with
`{ error: 'capability_unavailable', missing }` and exit code 2. Capabilities
a handler only needs conditionally (e.g. `runVitest` when a manifest entry
carries generated tests) are NOT listed here; the handler guards those
itself with the same structured failure.

***

### summary

> `readonly` **summary**: `string`

Defined in: [\_spine/command.d.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L74)

***

### ui?

> `readonly` `optional` **ui?**: `object`

Defined in: [\_spine/command.d.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L118)

Optional MCP Apps UI link (CUT D5): the `ui://` resource that renders this
tool's result as a live widget. The MCP skin projects this to a tool's
`_meta.ui.resourceUri`; CSP lives on the RESOURCE, never here. Registry-
governed (the link is part of command identity, not a side table).

#### resourceUri

> `readonly` **resourceUri**: `string`
