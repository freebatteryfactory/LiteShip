# `@czap/mcp-server`

Model Context Protocol (MCP) server that dispatches tool calls through `@czap/command`, the shared command dispatcher — a sibling skin to the `czap` CLI. Vocabulary: [docs/GLOSSARY.md](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md).

## Usage

There are two ways to run the server; there is deliberately no standalone `bin`.

### Launcher mode — `czap mcp`

```bash
pnpm add @czap/cli @czap/mcp-server
czap mcp
```

The `czap` CLI dynamically imports this package for its `mcp` subcommand. Keep both packages on the same semver line.

For Claude Desktop-style MCP hosts, point the host at the launcher:

```json
{
  "mcpServers": {
    "czap": {
      "command": "czap",
      "args": ["mcp"]
    }
  }
}
```

### Library mode — `start()`

```ts
import { start } from '@czap/mcp-server';

await start(); // stdio transport (default)
await start({ http: ':3838' }); // HTTP transport
```

See [docs/RELEASING.md](https://github.com/heyoub/LiteShip/blob/main/docs/RELEASING.md).
