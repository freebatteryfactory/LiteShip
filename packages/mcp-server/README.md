# @czap/mcp-server

An MCP (Model Context Protocol) server that exposes the **czap command catalog** as tools, resources, and prompts over stdio or HTTP — so AI agents can run the same commands the `czap` CLI does. **This is not a documentation server.** For sealed prose/API docs over HTTP, use `docsMcpRoute` from `@czap/astro` with a `docs:bundle` artifact (#113).

> You usually don't install this directly — it arrives as a dependency of `liteship`, and the `czap mcp` verb launches it. Install `liteship` (or this package alongside `@czap/cli`) instead, unless you're embedding the server in your own process via `start()`.

## Install

```bash
pnpm add @czap/cli @czap/mcp-server   # `czap mcp` dynamically loads this package
```

`@czap/cli` is not a peer — this package never imports the CLI.

## 30 seconds

```ts
import { start } from '@czap/mcp-server';

await start(); // stdio transport (default)
// await start({ http: ':3838' }); // HTTP transport instead
```

The process stays alive serving MCP JSON-RPC on stdin/stdout. For Claude Desktop-style MCP hosts, skip the code and point the host at the launcher:

```json
{ "mcpServers": { "czap": { "command": "czap", "args": ["mcp"] } } }
```

After the host connects, its `tools/list` call returns the czap command catalog.

## Tools

`tools/list` is authoritative, but so you know what's there before you connect — the MCP-exposed subset (explicit opt-in via `mcpExposed`; blocking/interactive verbs like `gauntlet` and `ship` are deliberately CLI-only):

| Tool | What it does |
|---|---|
| `capsule.list` | List the capsules in the factory registry |
| `capsule.inspect` | Inspect one capsule — its arm, contract, and receipt |
| `capsule.verify` | Verify a capsule is fresh (regeneration-diff check) |
| `scene.compile` | Compile a scene contract to a `CompiledScene` |
| `scene.render` | Render a compiled scene to frames |
| `scene.verify` | Verify a scene contract resolves |
| `asset.analyze` | Run analysis projections on an asset (beats / onsets / waveform) |
| `asset.verify` | Verify an asset declaration decodes |
| `check` | Run the gauntlet gate fold in-process — structured findings + a blocking verdict |
| `plumb` | Plumb-completeness gate — `tests/generated/` placeholder skips + unclassified published packages |

Each tool runs the **same handler** as the matching `czap <verb>` (one registry, two skins — `@czap/command`), so a tool call and a terminal verb are byte-identical. Input/output schemas are in the [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/mcp-server/src/).

## Where it sits

This is a protocol adapter over `@czap/command` — the shared command registry the CLI also projects, so a tool call and a terminal verb run the identical handler. `@czap/core` supplies the command and receipt types, and `@czap/compiler` backs the MCP-app manifest resource. It deliberately has no `bin` and never imports `@czap/cli`; the two are sibling skins, connected only by the CLI's dynamic import in `czap mcp`. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

A stdio MCP server prints nothing at startup — silence is normal, not a hang. It answers JSON-RPC requests on stdin; if your MCP host shows no tools, check that both `@czap/cli` and `@czap/mcp-server` are installed in the same project and on the same version, since `czap mcp` resolves this package from where the CLI runs.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Capsule factory](https://github.com/freebatteryfactory/LiteShip/blob/main/CAPSULE-FACTORY.md) — the dispatch model behind the tools
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/mcp-server/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
