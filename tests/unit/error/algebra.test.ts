import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  taggedError,
  isTaggedError,
  hasTag,
  getTag,
  raise,
  matchTag,
  matchTagOr,
  ValidationError,
  ParseError,
  IoError,
  HostCapabilityError,
  InvariantViolationError,
  NotFoundError,
  UnsupportedError,
  IntegrityError,
  assertNever,
  err,
  LITESHIP_ERROR_TAGS,
  type TaggedError,
  type LiteShipError,
  type Result,
} from '@liteship/error';

// The error algebra is the spine of the gauntlet's Finding shape and of every
// package's failure path, so these tests pin its LAWS — the guarantees callers
// rely on — rather than the wording of any one message.

describe('taggedError — the composer', () => {
  it('composes a value that is simultaneously an Error, a tagged record, and field-carrying', () => {
    const e = taggedError('DemoError', 'something failed', { foo: 1, bar: 'x' });
    expect(e).toBeInstanceOf(Error); // real transport (stack + ecosystem interop)
    expect(typeof e.stack).toBe('string');
    expect(e._tag).toBe('DemoError');
    expect(e.name).toBe('DemoError'); // renders as `DemoError: …`, not `Error: …`
    expect(e.message).toBe('something failed');
    expect(e.foo).toBe(1);
    expect(e.bar).toBe('x');
  });

  it('LAW: the tag/message args are authoritative — a colliding field cannot spoof identity', () => {
    // Defends the discriminant: if hostile/careless field data carries `_tag`
    // or `message`, the explicit args still win.
    const e = taggedError('RealTag', 'real message', {
      _tag: 'spoofed',
      message: 'spoofed',
      name: 'spoofed',
    } as Record<string, unknown>);
    expect(e._tag).toBe('RealTag');
    expect(e.message).toBe('real message');
    expect(e.name).toBe('RealTag');
  });

  it('chains an underlying error through the standard Error.cause (preserved, not swallowed)', () => {
    const root = new Error('ENOENT');
    const wrapped = taggedError('IoError', 'read failed', { operation: 'readFile' }, { cause: root });
    expect(wrapped.cause).toBe(root); // native Error.cause, available on any variant
    // …and an unchained error stays cause-free.
    expect(taggedError('DemoError', 'm', {}).cause).toBeUndefined();
  });

  it('IoError routes opts.cause to native Error.cause and keeps path as a field', () => {
    const root = new Error('EACCES');
    const e = IoError('writeFile', 'denied', { path: '/x', cause: root });
    expect(e.cause).toBe(root); // chained via the standard slot
    expect(e.path).toBe('/x');
  });

  it('LAW (property): round-trips _tag + message for any inputs; is always a tagged Error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.dictionary(
          fc.string().filter((k) => k !== '_tag' && k !== 'message' && k !== 'name'),
          fc.anything(),
        ),
        (tag, message, fields) => {
          const e = taggedError(tag, message, fields);
          expect(e).toBeInstanceOf(Error);
          expect(e._tag).toBe(tag);
          expect(e.message).toBe(message);
          expect(getTag(e)).toBe(tag);
          expect(hasTag(e, tag)).toBe(true);
          expect(isTaggedError(e)).toBe(true);
        },
      ),
    );
  });

  it('LAW: a caller field named __proto__ cannot detach the Error prototype (proto-pollution safe)', () => {
    // A fast-check counterexample (`{ ['__proto__']: {} }`) exposed an Object.assign
    // [[Set]] trap that detached the value from Error.prototype, so it was no longer
    // `instanceof Error`. Pin the fix deterministically (same class as the cbor `__proto__` CVE).
    const e = taggedError('ValidationError', 'msg', { ['__proto__']: { polluted: true } } as object);
    expect(e).toBeInstanceOf(Error);
    expect(Object.getPrototypeOf(e)).toBe(Error.prototype);
    expect(e._tag).toBe('ValidationError');
    expect(e.message).toBe('msg');
    expect(isTaggedError(e)).toBe(true);
    // The malicious key is a harmless OWN data property; nothing global is polluted.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('built-in variants', () => {
  it('ValidationError carries module + detail', () => {
    const e = ValidationError('Boundary.make', 'state list is empty');
    expect(e._tag).toBe('ValidationError');
    expect(e.module).toBe('Boundary.make');
    expect(e.detail).toBe('state list is empty');
    expect(e.message).toBe('Boundary.make: state list is empty');
  });

  it('ParseError preserves the machine code + byte offset a decoder branches on', () => {
    const e = ParseError('cbor', 'non-shortest integer', { code: 'non_canonical', offset: 7 });
    expect(e._tag).toBe('ParseError');
    expect(e.source).toBe('cbor');
    expect(e.code).toBe('non_canonical');
    expect(e.offset).toBe(7);
    expect(e.message).toContain('@7');
  });

  it('ParseError omits optional fields when not supplied (clean records)', () => {
    const e = ParseError('profile.json', 'expected an object');
    expect('code' in e).toBe(false);
    expect('offset' in e).toBe(false);
  });

  it('IoError, HostCapabilityError, InvariantViolationError, NotFoundError, UnsupportedError tag + field correctly', () => {
    expect(IoError('readFile', 'ENOENT', { path: '/x' }).path).toBe('/x');
    expect(HostCapabilityError('WebCodecs', 'no VideoEncoder')._tag).toBe('HostCapabilityError');
    expect(InvariantViolationError('spsc.capacity', 'overrun').invariant).toBe('spsc.capacity');
    expect(NotFoundError('profile', '/p').id).toBe('/p');
    expect(UnsupportedError('platform', 'plan9').subject).toBe('platform');
  });

  it('IntegrityError preserves the verification reason + expected/actual a verifier branches on', () => {
    const e = IntegrityError('receipt-chain', 'recomputed hash differs', {
      code: 'hash_mismatch',
      expected: 'fnv1a:aaaa',
      actual: 'fnv1a:bbbb',
    });
    expect(e._tag).toBe('IntegrityError');
    expect(e.subject).toBe('receipt-chain');
    expect(e.code).toBe('hash_mismatch');
    expect(e.expected).toBe('fnv1a:aaaa');
    expect(e.actual).toBe('fnv1a:bbbb');
  });

  it('drift guard: LITESHIP_ERROR_TAGS exactly matches the exported factories', () => {
    const factories: Record<string, (...args: never[]) => TaggedError> = {
      ValidationError: ValidationError as never,
      ParseError: ParseError as never,
      IoError: IoError as never,
      HostCapabilityError: HostCapabilityError as never,
      InvariantViolationError: InvariantViolationError as never,
      NotFoundError: NotFoundError as never,
      UnsupportedError: UnsupportedError as never,
      IntegrityError: IntegrityError as never,
    };
    // Every tag has a factory whose output carries that exact tag…
    for (const tag of LITESHIP_ERROR_TAGS) {
      expect(factories[tag]).toBeTypeOf('function');
    }
    // …and there are no extra factories beyond the tag list (set equality).
    expect(Object.keys(factories).sort()).toEqual([...LITESHIP_ERROR_TAGS].sort());
  });
});

describe('guards — the data-oriented replacement for instanceof', () => {
  it('isTaggedError accepts conforming records (even non-Error) and rejects the rest', () => {
    expect(isTaggedError({ _tag: 'X', message: 'm' })).toBe(true); // plain record, cross-realm safe
    expect(isTaggedError(ValidationError('m', 'd'))).toBe(true);
    expect(isTaggedError(new Error('plain'))).toBe(false); // no _tag
    expect(isTaggedError(null)).toBe(false);
    expect(isTaggedError('string')).toBe(false);
    expect(isTaggedError({ _tag: 1, message: 'm' })).toBe(false); // _tag not a string
  });

  it('hasTag narrows to a single variant', () => {
    const e: LiteShipError = ParseError('cbor', 'bad');
    if (hasTag(e, 'ParseError')) {
      expect(e.source).toBe('cbor'); // narrowed — `.source` is in scope
    } else {
      throw new Error('hasTag should have matched');
    }
    expect(hasTag(e, 'IoError')).toBe(false);
  });
});

describe('matchTag — exhaustive errors-as-values dispatch', () => {
  const render = (e: LiteShipError): string =>
    matchTag(e, {
      ValidationError: (x) => `validation:${x.module}`,
      ParseError: (x) => `parse:${x.source}`,
      IoError: (x) => `io:${x.operation}`,
      HostCapabilityError: (x) => `host:${x.capability}`,
      InvariantViolationError: (x) => `invariant:${x.invariant}`,
      NotFoundError: (x) => `notfound:${x.kind}`,
      UnsupportedError: (x) => `unsupported:${x.subject}`,
      IntegrityError: (x) => `integrity:${x.subject}`,
    });

  it('routes each variant to its branch', () => {
    expect(render(ValidationError('M', 'd'))).toBe('validation:M');
    expect(render(ParseError('cbor', 'd'))).toBe('parse:cbor');
    expect(render(IoError('readFile', 'd'))).toBe('io:readFile');
    expect(render(NotFoundError('profile', '/p'))).toBe('notfound:profile');
  });
});

describe('assertNever — statement-level exhaustiveness guard', () => {
  type Shape = { kind: 'circle' } | { kind: 'square' };
  const area = (s: Shape): string => {
    switch (s.kind) {
      case 'circle':
        return 'πr²';
      case 'square':
        return 's²';
      default:
        // Compiles only because every case above is handled (s is `never` here).
        return assertNever(s, 'Shape.kind');
    }
  };

  it('compiles when exhaustive and dispatches the real cases', () => {
    expect(area({ kind: 'circle' })).toBe('πr²');
    expect(area({ kind: 'square' })).toBe('s²');
  });

  it('throws an InvariantViolationError when an impossible value slips through at runtime', () => {
    const rogue = { kind: 'triangle' } as unknown as Shape;
    let caught: unknown;
    try {
      area(rogue);
    } catch (e) {
      caught = e;
    }
    expect(hasTag(caught, 'InvariantViolationError')).toBe(true);
    expect((caught as { invariant: string }).invariant).toBe('Shape.kind');
  });
});

describe('matchTagOr — open match with fallback (the extension-friendly matcher)', () => {
  it('handles known tags, falls back for the rest', () => {
    const classify = (e: TaggedError): 'known' | 'other' =>
      matchTagOr(e, { ParseError: () => 'known' as const, IoError: () => 'known' as const }, () => 'other' as const);
    expect(classify(ParseError('cbor', 'd'))).toBe('known');
    expect(classify(IoError('readFile', 'd'))).toBe('known');
    expect(classify(ValidationError('M', 'd'))).toBe('other');
    expect(classify(taggedError('SomeDownstreamError', 'm', {}))).toBe('other');
  });
});

describe('raise — throw a tagged value with a stack trace', () => {
  it('throws the value; the catch sees a real Error carrying the tag', () => {
    let caught: unknown;
    try {
      raise(InvariantViolationError('x', 'boom'));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(hasTag(caught, 'InvariantViolationError')).toBe(true);
  });
});

// The load-bearing claim behind the errors-as-values design: the SAME plain
// record rides any tag-keyed error channel and travels as inspectable data, not
// through a throw. Native proof — no Effect: `matchTagOr` recovers on `_tag` (the
// contract Effect's `catchTag` also keyed on), and a `Result` carries the failure
// as a value the caller discriminates. (Wave 8: this was the former "Effect
// interop" oracle; the OBSERVATION is preserved, the dependency retired.)
describe('errors-as-values — one value, the typed-channel face', () => {
  it('is recovered by a tag-keyed matcher on _tag (the catchTag-shaped contract)', () => {
    const recovered = matchTagOr(
      ValidationError('Boundary.make', 'empty'),
      { ValidationError: (e) => `recovered:${e.module}` },
      () => 'unrecovered',
    );
    expect(recovered).toBe('recovered:Boundary.make');
  });

  it('surfaces as a typed value via Result (errors-as-values, not thrown)', () => {
    const decode = (): Result<number, ParseError> => err(ParseError('cbor', 'bad', { code: 'malformed' }));
    const result = decode();
    expect(result.ok).toBe(false); // the failure channel as a value, not a throw
    if (!result.ok) {
      expect(hasTag(result.error, 'ParseError')).toBe(true);
      expect(result.error.code).toBe('malformed');
    }
  });
});

// Proves the extensibility promise: a downstream-style variant built with the
// public composer works with every helper, unchanged, with zero rebuild.
describe('extension — compose your own variant into the algebra', () => {
  interface OrderError extends TaggedError<'OrderError'> {
    readonly orderId: string;
  }
  const OrderError = (orderId: string): OrderError => taggedError('OrderError', `order ${orderId} failed`, { orderId });

  type AppError = LiteShipError | OrderError; // compose, don't inherit

  it('a custom variant satisfies the contract and rides the toolkit', () => {
    const e: AppError = OrderError('ord_123');
    expect(isTaggedError(e)).toBe(true);
    expect(hasTag(e, 'OrderError')).toBe(true);
    const label = matchTagOr(e, { OrderError: (x) => x.orderId }, () => 'n/a');
    expect(label).toBe('ord_123');
  });
});
