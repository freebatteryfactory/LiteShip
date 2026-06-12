# @czap/command

The shared command catalog and dispatcher behind the `czap` CLI and the MCP server — one definition of every command's name, input schema, and handler, so both surfaces stay in sync by construction.

> You usually don't install this directly — it arrives as a dependency of `@czap/cli` and `@czap/mcp-server`. Install one of those instead unless you're building your own adapter (a new protocol skin) over the same commands.

## Install

```bash
pnpm add @czap/cli   # brings @czap/command with it
```

This package declares `effect` (>= 4.0.0-beta.0) as a peer dependency: `pnpm add effect@beta`.

## 30 seconds

```ts
import { commandRegistry, CommandDispatcher } from '@czap/command';

const dispatcher = CommandDispatcher.make(commandRegistry);

const result = await dispatcher.dispatch(
  { name: 'glossary', args: { term: 'boundary' } },
  {}, // CommandContext — pure commands like glossary need no host capabilities
);

console.log(result.status, result.payload);
```

Logs `ok` and a payload containing the glossary entry for "boundary". The dispatcher never throws across this seam: an unknown command name returns `{ status: 'failed', payload: { error: 'unknown_command' } }` instead of an exception.

## Where it sits

This is the core of the command layer. It depends on `@czap/core` (command descriptor and result types) and `@czap/assets` (the asset-analysis handlers). The main entry is pure; anything that touches the host — process spawning, the ffmpeg render backend, the input-hash idempotency cache, capsule-manifest resolution — lives behind the `@czap/command/host` subpath (Node) and `@czap/command/host-browser` (browser, including the WebMCP projection), so importing the catalog never drags in `child_process`. Terminal-owned verbs like `doctor`, `gauntlet`, and `ship` appear here as descriptor-only catalog entries; their execution lives in `@czap/cli`. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Dispatching a catalog command that has no handler here (a CLI-owned verb such as `doctor`) returns a structured failure with `payload.error: 'no_registry_handler'` — nothing throws and nothing prints. Run those verbs through `@czap/cli`, which owns their execution.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md)
- [Architecture](https://github.com/heyoub/LiteShip/blob/main/docs/ARCHITECTURE.md)
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
