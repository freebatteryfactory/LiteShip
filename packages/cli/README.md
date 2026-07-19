# @liteship/cli

The `liteship` command-line tool: every verb emits one JSON receipt (a structured result line) on stdout and keeps human-readable summaries on stderr, so output pipes cleanly into `jq`, CI, or an AI agent.

> Install this directly when you want the `liteship` verbs in a project or CI. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) instead — it installs this package along with the rest of the stack.

## Install

```bash
pnpm add -D @liteship/cli
```

## 30 seconds

```bash
npx liteship doctor
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
| `liteship doctor [--fix] [--ci] [--preflight] [--target cloudflare\|astro]` | Environment preflight: Node, pnpm, install, build artifacts, git hooks, or focused Cloudflare/Astro host probes. `--fix` applies cheap remediations. |
| `liteship help` · `liteship version` · `liteship glossary [term]` | Help chart, version receipt, vocabulary lookup. |
| `liteship completion <bash\|zsh\|fish>` | Tab-completion script — the one verb that writes a raw script, not JSON, to stdout. |
| `liteship describe [--format json\|mcp]` | Machine-readable description of every verb and schema. |
| `liteship mcp [--http :3838]` | Start the MCP server (requires `@liteship/mcp-server` installed). |
| `liteship astro dev\|status\|stop` | Delegate to Astro 7 background dev-server management and emit a JSON receipt. |
| `liteship scene compile\|dev\|render\|verify <path>` | Compile, watch, render, or check a scene definition. |
| `liteship asset analyze\|verify` | Analyze (beats, onsets, waveform) or check an asset. |
| `liteship capsule list\|inspect\|verify` | Work with capsules — self-describing component packages — from the manifest. |
| `liteship audit [--profile <p>] [--consumer] [--findings]` | Run the `@liteship/audit` structure/integrity/surface engine; receipt carries the counts (exit 1 on any error finding). `--profile <p>` audits a custom topology (`.json`/`.js`/`.mjs`/`.ts`, explicit path, no walk-up); `--consumer` audits the packages installed under `node_modules` instead of the repo source; combine them to audit a downstream's OWN topology — the profile becomes the discovery base. `--findings` adds per-finding detail to the receipt. |
| `liteship check [--ir]` | Run the gauntlet gate fold in-process (`litelaunchGauntlet`) — structured findings + a blocking verdict, no subprocess. `--ir` selects the IR-enriched fold. |
| `liteship plumb` | Plumb-completeness gate: fail on any `tests/generated/` placeholder skip or any published package not classified runtime/tooling/deferred. |
| `liteship sbom` | Emit the deterministic, content-addressed SBOM (lockfile policy + CycloneDX + completeness) as a reviewable working-tree artifact. |
| `liteship lsp [--ir]` | Launch the gauntlet rigor language server over stdio (an editor spawns it) — gauntlet findings as live LSP diagnostics. |
| `liteship gauntlet` · `liteship ship <pkg>` · `liteship verify` | Release gate, npm publish, post-publish verification. |

Renders and analyses are cached by a hash of their inputs; pass `--force` to re-run. Unknown verbs exit 1 with a trailing `{"error":"unknown_command"}` line on stderr.

## Where it sits

`@liteship/cli` is a terminal adapter over `@liteship/command`, the shared command catalog and dispatcher — the MCP server projects the same catalog, and neither imports the other (`liteship mcp` only dynamically loads `@liteship/mcp-server`). Scene and asset verbs execute through `@liteship/scene` and `@liteship/assets`, `liteship audit` wires the `@liteship/audit` engine, and shared types come from `@liteship/core`. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

`capsule` verbs read a capsule manifest, by default `reports/capsule-manifest.json` under the current directory; outside a repo that has one they fail with a manifest-missing receipt. Set `LITESHIP_CAPSULE_MANIFEST` to point at yours.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture](https://github.com/freebatteryfactory/LiteShip/blob/main/ARCHITECTURE.md)
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/cli/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
