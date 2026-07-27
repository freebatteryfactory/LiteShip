[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / TaintRegistry

# Interface: TaintRegistry

Defined in: [audit/src/repo-ir-taint.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L129)

The INJECTED source/sink/sanitizer classification — the host-supplied registry
(the ADR-0012 / D7b boundary). The oracle references NONE of these names itself;
the `@liteship/cli` host supplies the LiteShip-LOCAL set. Each is matched against a
call expression's CALLEE NAME — the bare identifier (`fetch`, `eval`) OR the
member name (`shaderSource`, `createShaderModule`, `innerHTML` as an assignment
target, `validateGraphPatchProposal`). [memberSinks](#membersinks) adds a third channel:
qualified `receiver.callee` pairs (e.g. `document.write`) matched only when the
receiver is a bare identifier — aliases (`d.write`) and nested access
(`window.document.write`) are intentionally out of scope. A `Set` for O(1) classification.

## Properties

### assignmentSinkNames?

> `readonly` `optional` **assignmentSinkNames?**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L156)

Assignment-TARGET property names that are sinks when assigned a tainted value
(e.g. `innerHTML`, `outerHTML`). Distinct from [sinks](#sinks) because the
dangerous operation is a PROPERTY ASSIGNMENT (`el.innerHTML = tainted`), not a
call. Optional — omit for a call-only registry.

***

### memberSinks?

> `readonly` `optional` **memberSinks?**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L149)

Qualified member-call sinks — `receiver.callee` pairs (e.g. `document.write`)
matched only when the receiver is a bare identifier. Distinct from
[sinks](#sinks) to avoid classifying every `stream.write` / `stdout.write` as
HTML injection.

***

### notes?

> `readonly` `optional` **notes?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/repo-ir-taint.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L168)

Human notes per callee name (the WHY carried into the fact's endpoint `note`).
A name absent from the map gets a generic note. Optional.

***

### sanitizers

> `readonly` **sanitizers**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:163](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L163)

Callee names that SANITIZE — a value that passes through one of these (as an
argument or as the call's result) has its taint BROKEN (e.g.
`validateGraphPatchProposal`, `resolveRuntimeUrl`, `sanitizeElementTree`). A
flow whose path crosses a sanitizer is emitted clean (`sanitizedBy` set).

***

### sinks

> `readonly` **sinks**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L142)

Callee names that are dangerous SINKS — a tainted value reaching one of their
ARGUMENTS is a flow (e.g. `shaderSource`, `createShaderModule`, `eval`,
`applyValidatedPatch`). An `innerHTML`-style assignment SINK is matched as the
assignment-target property name (see [assignmentSinkNames](#assignmentsinknames)).

***

### sources

> `readonly` **sources**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L135)

Callee names whose RETURN value is untrusted (a SOURCE). A call to one of
these introduces taint (e.g. `fetch`, `readFileSync`). Also matched as the
source of a member chain (`(await fetch(u)).text()` is sourced by `fetch`).
