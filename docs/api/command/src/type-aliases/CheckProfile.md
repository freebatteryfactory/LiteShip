[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckProfile

# Type Alias: CheckProfile

> **CheckProfile** = `"quick"` \| `"full"` \| `"release"` \| `"consumer"` \| `"environment"`

Defined in: [command/src/checks/definition.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L30)

The profile a check belongs to — the named sweep a projection runs. A check
declares its membership set; [planChecks](../functions/planChecks.md) filters the registry by it.
- `quick`     — the fast pre-commit lane (lint / typecheck / format / structural).
- `full`      — quick + all tests + the blocking gate family + docs + audit floor.
- `release`   — everything, including bench gates, coverage floor, e2e, and package smoke.
- `consumer`  — the packed-tarball consumer smoke (package:smoke + packed subpath resolution).
- `environment` — the host preflight (doctor) that proves the toolchain is sane.
