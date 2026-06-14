# @czap/cli

The `czap` command-line tool: every verb emits one JSON receipt (a structured result line) on stdout and keeps human-readable summaries on stderr, so output pipes cleanly into `jq`, CI, or an AI agent.

> Install this directly when you want the `czap` verbs in a project or CI. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) instead — it installs this package along with the rest of the stack.

## Install

```bash
pnpm add -D @czap/cli
```

## 30 seconds

```bash
npx czap doctor
```

```json
{"status":"ok","command":"doctor","verdict":"ready","checks":[
  {"id":"node.version","label":"Node.js","status":"ok","detail":"22.22.3"},
  {"id":"pnpm.version","label":"pnpm","status":"ok","detail":"10.32.1"}
]}
```

You should see one JSON line like the above on stdout (shown wrapped here) and, on a terminal, a colored per-check summary on stderr. Exit code is 0 for an `ok` receipt, 1 for `failed`; `--ci` escalates warnings to 1.

## Verbs

| Verb | What it does |
| --- | --- |
| `czap doctor [--fix] [--ci] [--preflight] [--target cloudflare]` | Environment preflight: Node, pnpm, install, build artifacts, git hooks. `--fix` applies cheap remediations. |
| `czap help` · `czap version` · `czap glossary [term]` | Help chart, version receipt, vocabulary lookup. |
| `czap completion <bash\|zsh\|fish>` | Tab-completion script — the one verb that writes a raw script, not JSON, to stdout. |
| `czap describe [--format json\|mcp]` | Machine-readable description of every verb and schema. |
| `czap mcp [--http :3838]` | Start the MCP server (requires `@czap/mcp-server` installed). |
| `czap scene compile\|dev\|render\|verify <path>` | Compile, watch, render, or check a scene definition. |
| `czap asset analyze\|verify` | Analyze (beats, onsets, waveform) or check an asset. |
| `czap capsule list\|inspect\|verify` | Work with capsules — self-describing component packages — from the manifest. |
| `czap audit [--consumer\|--profile <p>] [--findings]` | Run the `@czap/audit` engine; receipt carries the counts. |
| `czap gauntlet` · `czap ship <pkg>` · `czap verify` | Release gate, npm publish, post-publish verification. |

Renders and analyses are cached by a hash of their inputs; pass `--force` to re-run. Unknown verbs exit 1 with a trailing `{"error":"unknown_command"}` line on stderr.

## Where it sits

`@czap/cli` is a terminal adapter over `@czap/command`, the shared command catalog and dispatcher — the MCP server projects the same catalog, and neither imports the other (`czap mcp` only dynamically loads `@czap/mcp-server`). Scene and asset verbs execute through `@czap/scene` and `@czap/assets`, `czap audit` wires the `@czap/audit` engine, and shared types come from `@czap/core`. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

`capsule` verbs read a capsule manifest, by default `reports/capsule-manifest.json` under the current directory; outside a repo that has one they fail with a manifest-missing receipt. Set `CZAP_CAPSULE_MANIFEST` to point at yours.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture](https://github.com/heyoub/LiteShip/blob/main/ARCHITECTURE.md)
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/cli/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
