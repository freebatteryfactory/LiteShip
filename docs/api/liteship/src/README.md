[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / liteship/src

# liteship/src

`liteship` — the umbrella package for the LiteShip stack.

Installing `liteship` brings every publishable `@czap/*` package into
your node_modules in one dependency; you still import from the
individual scopes (`@czap/core`, `@czap/quantizer`, `@czap/astro`, …)
exactly as the docs show. This module deliberately re-exports NOTHING:
the host integrations (`@czap/astro`, `@czap/vite`, `@czap/cloudflare`)
carry host-specific peer expectations, and a barrel that imported them
would force every consumer to satisfy all of them at once. Pick your
entry points; this package just makes sure they're installed.

## Type Aliases

- [LiteshipPackageName](type-aliases/LiteshipPackageName.md)

## Variables

- [LITESHIP\_PACKAGES](variables/LITESHIP_PACKAGES.md)
