# @czap/error

The one LiteShip error algebra — a composable, tagged-error coproduct with zero runtime dependencies. Errors are tagged DATA values, not a class hierarchy: each variant is a `_tag`-discriminated record that is *also* a real `Error` (stack trace + `instanceof Error`), works with both `throw` and `Effect.fail`, and is extended by composing, never editing.

## Install

```bash
pnpm add @czap/error
```

Zero runtime deps — it pulls in nothing, not even `effect`. The Effect interop below works because the records are plain `_tag` failures; bring your own `effect` only if you already use it.

## 30 seconds

```ts
import { ValidationError, ParseError, hasTag, matchTag } from '@czap/error';

// A variant is a VALUE and a TYPE. Throw it — it's a real Error:
throw ValidationError('Boundary.make', 'width must be > 0');

// Branch on the tag, not `instanceof`. `hasTag` narrows:
if (hasTag(caught, 'ParseError')) report(caught.source, caught.offset);

// `matchTag` is exhaustive over a closed union — add a variant and every
// match site must handle it or it fails to compile:
function explain(err: ValidationError | ParseError): string {
  return matchTag(err, {
    ValidationError: (e) => `rejected by ${e.module}: ${e.detail}`,
    ParseError: (e) => `could not read ${e.source}: ${e.detail}`,
  });
}
```

The exact same value is a first-class Effect failure — no `effect` import inside `@czap/error`, because `Effect.catchTag` keys on the `_tag` these records already carry:

```ts
import { Effect } from 'effect';

Effect.fail(ParseError('profile.json', 'expected object', { offset: 12 }))
  .pipe(Effect.catchTag('ParseError', (e) => Effect.succeed(e.detail)));
```

## Where it sits

This is the foundational leaf the rest of the stack adopts — `standalone`, with zero `@czap/*` dependencies, so any package can fail with it. The built-in variants form one CLOSED coproduct (`LiteShipError` = `ValidationError | ParseError | IoError | HostCapabilityError | InvariantViolationError | NotFoundError | UnsupportedError | IntegrityError`) over the open `TaggedError` contract every helper (`hasTag`, `matchTag`, `matchTagOr`, `raise`, `assertNever`) operates on. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## When a variant doesn't fit

Do not subclass — there is no base class to extend. You compose: conform a record to `TaggedError`, build it with the one `taggedError` composer, and widen the union by `|`. Editing `@czap/error` is never the extension path.

```ts
import { taggedError, type TaggedError, type LiteShipError } from '@czap/error';

interface RateLimitError extends TaggedError<'RateLimitError'> {
  readonly retryAfter: number;
}
const RateLimitError = (retryAfter: number): RateLimitError =>
  taggedError('RateLimitError', `retry after ${retryAfter}s`, { retryAfter });

type AppError = LiteShipError | RateLimitError; // composition over inheritance
```

Every helper keeps working on the widened union unchanged — `matchTagOr` handles the variants you care about and routes the rest through a fallback. Zero rebuild, zero fork.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture](https://github.com/freebatteryfactory/LiteShip/blob/main/ARCHITECTURE.md) — composition over inheritance, the load-bearing design law
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/error/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
