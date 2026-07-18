[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / consumerDevopsProfile

# Function: consumerDevopsProfile()

> **consumerDevopsProfile**(`cwd?`, `base?`): [`DevopsProfile`](../interfaces/DevopsProfile.md)

Defined in: [audit/src/consumer.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L160)

Build a consumer-mode profile: the base profile (LiteShip's by default)
re-rooted at `cwd` with `packageRoots` resolved from the installed
`@czap/*` packages. Packages from the topology that aren't installed are
simply absent — a consumer audits what it actually ships — and the same
principle prunes the host-surface policy: a consumer that doesn't install
the astro/vite host packages should not eat `*-missing` errors for
surfaces it never shipped.

## Parameters

### cwd?

`string` = `...`

### base?

[`DevopsProfile`](../interfaces/DevopsProfile.md) = `liteshipDevopsProfile`

## Returns

[`DevopsProfile`](../interfaces/DevopsProfile.md)
