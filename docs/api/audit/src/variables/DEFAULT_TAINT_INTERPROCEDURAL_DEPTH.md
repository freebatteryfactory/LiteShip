[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / DEFAULT\_TAINT\_INTERPROCEDURAL\_DEPTH

# Variable: DEFAULT\_TAINT\_INTERPROCEDURAL\_DEPTH

> `const` **DEFAULT\_TAINT\_INTERPROCEDURAL\_DEPTH**: `8` = `8`

Defined in: [audit/src/repo-ir-taint.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L116)

The DEFAULT bounded interprocedural hop depth — the shared budget the FORWARD
(parameter-passing) and BACKWARD (return) hops draw from. `8` is a TERMINATION
bound, NOT a coverage ceiling: it is set above the deepest real LiteShip
injection surface so a KNOWN surface is never missed for "depth". The deepest
measured surface is the GLSL shader inject —
`fetch → fragSource → prependGlslDeclarations(fragSource) →
createProgram(…, fragWithDeclarations, …) → compileShader(…, fragSrc, …) →
gl.shaderSource(shader, source)` — which needs 2 parameter hops (`source` ←
`compileShader`'s caller, `fragSrc` ← `createProgram`'s caller); the WGSL
surface needs 1 return hop into `fetchShaderSource`. `8` clears both with ample
margin while the `seen` / `hopped` cycle guards keep the trace finite regardless.
Carried into [TaintFacts.interproceduralDepth](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts) so the report is self-
describing — a downstream that wants a shallower (faster) trace lowers it.
