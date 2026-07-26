[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / createLLMSession

# Function: createLLMSession()

> **createLLMSession**(`config`): [`LLMSessionShape`](../interfaces/LLMSessionShape.md)

Defined in: astro/dist/runtime/llm-session.d.ts:130

Default `client:llm` factory: builds a session wired to the DOM.
Equivalent to composing [createDOMLLMSessionHost](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/runtime/llm-session.ts) with
[createLLMSessionWithHost](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/runtime/llm-session.ts).

## Parameters

### config

[`LLMSessionConfig`](../interfaces/LLMSessionConfig.md)

## Returns

[`LLMSessionShape`](../interfaces/LLMSessionShape.md)
