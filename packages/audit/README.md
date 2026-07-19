# @liteship/audit

Runs structure, integrity, and surface checks over `@liteship/*` packages and reports findings as structured data — against the LiteShip monorepo or against the packages installed in your own app.

> Install this directly when you want to run the audit passes programmatically. Most projects run it through `liteship audit` from `@liteship/cli` instead, which wraps the same engine in a JSON receipt.

## Install

```bash
pnpm add -D @liteship/audit
```

No peer dependencies. It depends on `@liteship/canonical`, `@liteship/error`, and `@liteship/gauntlet` (it builds the triangulated `RepoIR` the gauntlet defines, and injects the LiteShip oracles — ADR-0012/ADR-0023) plus `typescript`.

## 30 seconds

```ts
import { consumerDevopsProfile, runAuditPasses } from '@liteship/audit';

const result = runAuditPasses(consumerDevopsProfile(process.cwd()));

console.log(result.counts); // { error, warning, info }
for (const f of result.findings) {
  console.log(f.severity, f.rule, f.title);
}
```

In a repo with `@liteship/*` packages installed, this logs the merged counts and one line per finding. `consumerDevopsProfile(cwd)` audits what is actually installed in `node_modules` (every liteship package publishes `src/` alongside `dist/`, so source-level checks run on shipped artifacts); inside the LiteShip monorepo itself, call `runAuditPasses()` with no argument to glob `packages/*` instead.

## Rule ids

Every finding carries a `rule` id — the key you use in a profile's allowlists: `console-call`, `default-export`, `export-target-missing`, `fallback-laundering`, `host-surface`, `missing-manifest-dependency`, `missing-manifest-dependency-dynamic`, `missing-runtime-capability`, `orphan-export-candidate`, `package-export-surface`, `package-topology`, `placeholder-content`, `stub-marker`, `suspicious-reimplementation`, `symbol-orphan-candidate`, `unknown-internal-package`, `unresolved-internal-import`, `virtual-module-surface`.

## Where it sits

Standalone — this package depends on no other `@liteship/*` package, only `fast-glob` and the TypeScript compiler API, so you can install it without the rest of the stack. The `liteship audit` verb in `@liteship/cli` is the only adapter that wires the engine; `@liteship/command` and `@liteship/mcp-server` see a structured summary of the result, never the engine itself. LiteShip's repo-local scoring and report rendering are not in this package — they compose it from the monorepo's scripts. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Consumer discovery walks `node_modules`; if no `@liteship/*` packages are installed where you ran it, the audit finds zero packages and reports zero findings — a clean result that verified nothing. Before trusting a silent pass, check `Object.keys(consumerDevopsProfile(cwd).packageRoots).length` is what you expect.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Audit guide](https://github.com/freebatteryfactory/LiteShip/blob/main/AUDIT.md) — profiles, passes, and the receipt contract
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/audit/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
