import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ok,
  err,
  isOk,
  isErr,
  IoError,
  ParseError,
  hasTag,
  matchTag,
  type Result,
  type Ok,
  type Err,
  type LiteShipError,
} from '@czap/error';

// Result is the sync errors-as-values carrier every non-Effect package returns
// instead of throwing, so these tests pin its LAWS — the discriminant is total,
// the two arms are disjoint, and the guards narrow exhaustively — not the shape
// of any one payload. The type-level block below is the exhaustiveness proof; the
// runtime blocks pin the value behaviour.

// ─────────────────────────────────────────────────────────────────────────────
// Type-level conformance: the union is EXACTLY `Ok<A> | Err<E>`, the constructors
// return the precise arm, and the guards narrow each arm to the other's complement
// (so a `Result` match is exhaustive by construction). `__resultTypeContract` is
// NEVER called — its body is fully typechecked while nothing runs.
// ─────────────────────────────────────────────────────────────────────────────
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Assert<T extends true> = T;

function __resultTypeContract(r: Result<number, LiteShipError>): void {
  // The union is precisely the two arms — no third state, no widening — and each
  // arm is the total complement of the other over it (exhaustiveness).
  const _union: Assert<IsEqual<Result<number, string>, Ok<number> | Err<string>>> = true;
  const _exOk: Assert<IsEqual<Exclude<Result<number, string>, Ok<number>>, Err<string>>> = true;
  const _exErr: Assert<IsEqual<Exclude<Result<number, string>, Err<string>>, Ok<number>>> = true;

  // Constructors return the precise arm, not the widened union.
  const one: number = 1;
  const okv = ok(one);
  const _c1: Assert<IsEqual<typeof okv, Ok<number>>> = true;
  const boom: string = 'boom';
  const errv = err(boom);
  const _c2: Assert<IsEqual<typeof errv, Err<string>>> = true;

  // Guard narrowing is exhaustive: the true arm and its else are complements.
  if (isOk(r)) {
    const _n: Assert<IsEqual<typeof r, Ok<number>>> = true;
    void _n;
  } else {
    const _n: Assert<IsEqual<typeof r, Err<LiteShipError>>> = true;
    void _n;
  }
  if (isErr(r)) {
    const _n: Assert<IsEqual<typeof r, Err<LiteShipError>>> = true;
    void _n;
  }

  // The `ok` discriminant narrows both directions on its own.
  if (r.ok) {
    const _n: Assert<IsEqual<typeof r, Ok<number>>> = true;
    void _n;
  } else {
    const _n: Assert<IsEqual<typeof r, Err<LiteShipError>>> = true;
    void _n;
  }

  // A narrower arm widens into the union at the use site (what consumers rely on).
  const _wideOk: Result<number, LiteShipError> = ok(1);
  const _wideErr: Result<number, LiteShipError> = err(IoError('readFile', 'ENOENT'));

  void _union;
  void _exOk;
  void _exErr;
  void _c1;
  void _c2;
  void _wideOk;
  void _wideErr;
}
void __resultTypeContract;

describe('ok / err — the constructors', () => {
  it('ok wraps a value in the success arm with the literal `true` discriminant', () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
    expect(r.ok).toBe(true);
    expect(r.value).toBe(42);
  });

  it('err wraps an error in the failure arm with the literal `false` discriminant', () => {
    const e = IoError('readFile', 'ENOENT', { path: '/x' });
    const r = err(e);
    expect(r).toEqual({ ok: false, error: e });
    expect(r.ok).toBe(false);
    expect(r.error).toBe(e);
  });

  it('LAW: the payload is carried BY REFERENCE — never copied or wrapped', () => {
    const value = { rows: [1, 2, 3] };
    const error = ParseError('cbor', 'bad');
    expect(ok(value).value).toBe(value); // same identity, not a structural clone
    expect(err(error).error).toBe(error);
  });

  it('LAW: a falsy value is still a success — `ok` keys on the arm, not truthiness', () => {
    // The classic bug this design forecloses: `if (result.value)` conflating a
    // legitimate 0/''/false/null payload with failure. Only the `ok` field decides.
    for (const falsy of [0, '', false, null, undefined, Number.NaN] as const) {
      const r = ok(falsy);
      expect(r.ok).toBe(true);
      expect(isOk(r)).toBe(true);
      expect(isErr(r)).toBe(false);
    }
  });
});

describe('isOk / isErr — the narrowing guards', () => {
  it('isOk selects the success arm and narrows `.value` into scope', () => {
    const r: Result<number, LiteShipError> = ok(7);
    if (isOk(r)) {
      expect(r.value).toBe(7); // narrowed — `.value` is reachable, `.error` is not
    } else {
      throw new Error('isOk should have matched a success');
    }
    expect(isErr(r)).toBe(false);
  });

  it('isErr selects the failure arm and narrows `.error` into scope', () => {
    const r: Result<number, LiteShipError> = err(ParseError('profile.json', 'not an object'));
    if (isErr(r)) {
      expect(hasTag(r.error, 'ParseError')).toBe(true); // narrowed to the failure arm
      expect(r.error.source).toBe('profile.json');
    } else {
      throw new Error('isErr should have matched a failure');
    }
    expect(isOk(r)).toBe(false);
  });

  it('LAW: the guards are exact complements — exactly one holds for any result', () => {
    const results: readonly Result<number, LiteShipError>[] = [ok(1), err(IoError('spawn', 'EACCES'))];
    for (const r of results) {
      expect(isOk(r)).toBe(!isErr(r)); // total + mutually exclusive
    }
  });
});

describe('exhaustive dispatch on the `ok` discriminant', () => {
  // The consumer contract: fold a Result to one type by handling both arms. With
  // only two arms and a literal discriminant, the compiler forces both to be
  // covered — the errors-as-values analogue of matchTag over a closed union.
  const fold = (r: Result<number, LiteShipError>): string =>
    r.ok ? `ok:${r.value}` : matchTag(r.error, {
      ValidationError: (e) => `err:${e.module}`,
      ParseError: (e) => `err:${e.source}`,
      IoError: (e) => `err:${e.operation}`,
      HostCapabilityError: (e) => `err:${e.capability}`,
      InvariantViolationError: (e) => `err:${e.invariant}`,
      NotFoundError: (e) => `err:${e.kind}`,
      UnsupportedError: (e) => `err:${e.subject}`,
      IntegrityError: (e) => `err:${e.subject}`,
    });

  it('routes the success arm to its branch', () => {
    expect(fold(ok(9))).toBe('ok:9');
  });

  it('routes the failure arm through the tagged-error matcher', () => {
    expect(fold(err(IoError('readFile', 'ENOENT')))).toBe('err:readFile');
    expect(fold(err(ParseError('cbor', 'bad')))).toBe('err:cbor');
  });
});

describe('LAW (property): construct → discriminate round-trips any payload', () => {
  // Seeded so the run is deterministic; Object.is compares by identity (and pins
  // the NaN case, where `===` would lie).
  const SEED = 0x5_2717;

  it('ok(v) is always a success carrying v by identity', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const r = ok(value);
        expect(r.ok).toBe(true);
        expect(isOk(r)).toBe(true);
        expect(isErr(r)).toBe(false);
        expect(Object.is(r.value, value)).toBe(true);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('err(e) is always a failure carrying e by identity', () => {
    fc.assert(
      fc.property(fc.anything(), (error) => {
        const r = err(error);
        expect(r.ok).toBe(false);
        expect(isErr(r)).toBe(true);
        expect(isOk(r)).toBe(false);
        expect(Object.is(r.error, error)).toBe(true);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });
});
