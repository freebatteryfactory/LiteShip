# @liteship/audit

Runs profile-driven structure, integrity, and surface checks and reports findings as structured data. The reusable engine names no LiteShip package policy; a host supplies topology, source entrypoints, surfaces, and suppressions.

> Install this directly when you want to run the audit passes programmatically. Most projects run it through the facade-owned `liteship audit` command instead, which wraps the same engine in a JSON receipt.

## Install

```bash
pnpm add -D @liteship/audit
```

No peer dependencies. It depends on `@liteship/canonical`, `@liteship/error`, and `@liteship/gauntlet` (it builds the triangulated `RepoIR` the gauntlet defines) plus `typescript`.

## 30 seconds

```ts
import { resolveDevopsProfile, runAuditPasses } from '@liteship/audit';

const profile = resolveDevopsProfile({
  repoRoot: process.cwd(),
  internalPackagePrefix: '@acme/',
  packageTopology: {
    '@acme/core': { kind: 'core', allowedInternalImports: [] },
  },
});
const result = runAuditPasses(profile);

console.log(result.counts); // { error, warning, info }
for (const f of result.findings) {
  console.log(f.severity, f.rule, f.title);
}
```

This logs the merged counts and one line per finding. For an installed-package audit, pass the same explicit base profile to `consumerDevopsProfile(cwd, baseProfile)`; discovery then audits only physical packages under `node_modules`. A discovered package whose declared artifacts match no files is reported as unverified rather than clean. There is no implicit LiteShip profile and no all-skipped green default.

## Rule ids

Every finding carries a `rule` id — the key you use in a profile's allowlists: `console-call`, `default-export`, `export-target-missing`, `fallback-laundering`, `host-surface`, `missing-manifest-dependency`, `missing-manifest-dependency-dynamic`, `missing-runtime-capability`, `orphan-export-candidate`, `package-export-surface`, `package-topology`, `placeholder-content`, `stub-marker`, `suspicious-reimplementation`, `symbol-orphan-candidate`, `unknown-internal-package`, `unresolved-internal-import`, `virtual-module-surface`.

## Where it sits

This is the Node-side audit engine. Its manifest carries the canonical, error, and gauntlet owners alongside `fast-glob` and the TypeScript compiler API; the generated [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) is the authority for the exact dependency graph. The `liteship audit` verb in `@liteship/cli` wires the engine; `@liteship/command` and `@liteship/mcp-server` see a structured summary of the result, never the engine itself. LiteShip's repo-local scoring and report rendering are not in this package — they compose it from the monorepo's scripts.

## If it does nothing

Consumer discovery walks `node_modules`; before trusting a report, verify `Object.keys(consumerDevopsProfile(cwd, baseProfile).packageRoots).length` matches the fleet you intended to inspect.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [Public API roster](https://github.com/freebatteryfactory/LiteShip/blob/main/PUBLIC-EXPORTS.md) — reviewed surface; run `pnpm run docs:build` in a source checkout for TypeDoc

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
