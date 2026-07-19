[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / PROJECTION\_KEYS\_SOURCE

# Variable: PROJECTION\_KEYS\_SOURCE

> `const` **PROJECTION\_KEYS\_SOURCE**: "/\*\*\n \* Per-quantizer output keys, matching @liteship/core projectionKeys / glslIdent / wgslIdent.\n \* @param \{string\} name\n \* @returns \{\{ cssKey: string, glslKey: string, wgslKey: string, ariaKey: string \}\}\n \*/\nfunction projectionKeys(name) \{\n  const snake = name.replace(/-/g, \"\_\").replace(/(\[a-z0-9\])(\[A-Z\])/g, \"$1\_$2\").toLowerCase();\n  return \{ cssKey: \"--liteship-\" + name, glslKey: \"u\_\" + snake, wgslKey: snake, ariaKey: \"data-liteship-\" + name \};\n\}"

Defined in: [core/src/projection.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/projection.ts#L88)

Worker-blob twin of [projectionKeys](../functions/projectionKeys.md) as an inlinable JavaScript source
string (classic-worker scope, no ES imports). The worker/render blob scripts
interpolate this so they cannot drift from the core convention. Must stay
byte-equivalent to [projectionKeys](../functions/projectionKeys.md); the projection parity test executes
it via `new Function(...)` and asserts agreement.
