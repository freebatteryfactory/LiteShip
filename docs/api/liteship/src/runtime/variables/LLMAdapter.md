[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LLMAdapter

# Variable: LLMAdapter

> `const` **LLMAdapter**: `object`

Defined in: web/dist/stream/llm-adapter.d.ts:108

LLM adapter namespace.

Provider-agnostic LLM stream adapter. Normalizes any LLM streaming API
(OpenAI, Anthropic, etc.) into liteship's typed chunk buffer via a user-provided
[ChunkParser](../type-aliases/ChunkParser.md). Handles tool-call accumulation, JSON argument parsing,
and produces a convenience `textTokens` stream for feeding into a
token buffer.

## Type Declaration

### collect

> **collect**: *typeof* `_collect`

### create

> **create**: *typeof* `_create`

## Example

```ts
import { LLMAdapter, SSE } from '@liteship/web';

const client = SSE.create({ url: '/api/llm/stream' });
const adapter = LLMAdapter.create({
  source: client.messages,
  parser: (msg) => {
    if (msg.type !== 'patch') return null;
    const data = msg.data as { type?: string; content?: string };
    return data.type === 'text' && typeof data.content === 'string'
      ? { type: 'text', partial: false, content: data.content }
      : null;
  },
});
for await (const token of adapter.textTokens) process.stdout.write(token);
```
