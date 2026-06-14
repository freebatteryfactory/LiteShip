# LiteShip — agent instructions

This file is the entry point for AI coding tools that read `AGENTS.md` (Codex, some shell-out integrations). Repo conventions, command list, architecture patterns, and source-of-truth docs live in the canonical docs below — not in drift-prone prose mirrors.

**Read these for full context:**

- [DOCS.md](./DOCS.md) — the documentation map + a grep-first **discovery index** (where the canonical answer to common questions lives). Start here.
- [STATUS.md](./STATUS.md) — gates, remaining work, runtime steering
- [ARCHITECTURE.md](./ARCHITECTURE.md) — package topology and seams; the **document graph IR** + **AI cast** every surface reads from
- [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md) — which `@czap/*` package to reach for, per job
- [GLOSSARY.md](./GLOSSARY.md) — product naming and gate vocabulary

## Driving LiteShip programmatically

LiteShip is built to be operated by agents, not just imported:

- **CLI** — `czap <verb>` is JSON-first (human-pretty in a TTY). `czap help` prints the chart; `czap describe --format=json` emits the machine-readable command catalog. See [`packages/cli/README.md`](./packages/cli/README.md).
- **MCP server** — `czap mcp` (stdio) or `czap mcp --http=:port` exposes the capsule / scene / asset tools to an MCP host. The authoritative tool catalog (and `tools/list`) lives in [`packages/mcp-server/README.md`](./packages/mcp-server/README.md). Reach for these before hand-rolling: inspecting capsules, compiling/rendering scenes, and analyzing assets are already tools.

Public naming: LiteShip (product), CZAP (engine), `@czap/*` (packages). See [GLOSSARY.md](./GLOSSARY.md).
