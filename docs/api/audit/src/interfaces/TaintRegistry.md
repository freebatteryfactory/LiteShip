[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / TaintRegistry

# Interface: TaintRegistry

Defined in: [audit/src/repo-ir-taint.ts:126](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L126)

The INJECTED source/sink/sanitizer classification — the host-supplied registry
(the ADR-0012 / D7b boundary). The oracle references NONE of these names itself;
the `@czap/cli` host supplies the LiteShip-LOCAL set. Each is matched against a
call expression's CALLEE NAME — the bare identifier (`fetch`, `eval`) OR the
member name (`shaderSource`, `createShaderModule`, `innerHTML` as an assignment
target, `validateGraphPatchProposal`). A `Set` for O(1) classification.

## Properties

### assignmentSinkNames?

> `readonly` `optional` **assignmentSinkNames?**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:146](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L146)

Assignment-TARGET property names that are sinks when assigned a tainted value
(e.g. `innerHTML`, `outerHTML`). Distinct from [sinks](#sinks) because the
dangerous operation is a PROPERTY ASSIGNMENT (`el.innerHTML = tainted`), not a
call. Optional — omit for a call-only registry.

***

### notes?

> `readonly` `optional` **notes?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/repo-ir-taint.ts:158](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L158)

Human notes per callee name (the WHY carried into the fact's endpoint `note`).
A name absent from the map gets a generic note. Optional.

***

### sanitizers

> `readonly` **sanitizers**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:153](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L153)

Callee names that SANITIZE — a value that passes through one of these (as an
argument or as the call's result) has its taint BROKEN (e.g.
`validateGraphPatchProposal`, `resolveRuntimeUrl`, `sanitizeElementTree`). A
flow whose path crosses a sanitizer is emitted clean (`sanitizedBy` set).

***

### sinks

> `readonly` **sinks**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:139](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L139)

Callee names that are dangerous SINKS — a tainted value reaching one of their
ARGUMENTS is a flow (e.g. `shaderSource`, `createShaderModule`, `eval`,
`applyValidatedPatch`). An `innerHTML`-style assignment SINK is matched as the
assignment-target property name (see [assignmentSinkNames](#assignmentsinknames)).

***

### sources

> `readonly` **sources**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/repo-ir-taint.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L132)

Callee names whose RETURN value is untrusted (a SOURCE). A call to one of
these introduces taint (e.g. `fetch`, `readFileSync`). Also matched as the
source of a member chain (`(await fetch(u)).text()` is sourced by `fetch`).
