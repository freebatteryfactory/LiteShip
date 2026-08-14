/**
 * Compile-time laws for `01_hosts/server/02_secret`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { Assert, Equal, InputOf, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { RevealedSecret, SecretConsumer, SecretDisposition, SecretId, SecretMaterial, SecretProvider, SecretScopedReference, SecretUseReceipt } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That material never leaks into logs, receipts, addresses, or generated
// artifacts is a `system/assurance` obligation over the shipping path.
// ---------------------------------------------------------------------------

/** Compile-time law: revelation is identity-correlated — A's revelation is not B's. */
export type RevelationIsIdentityCorrelated = Assert<
  Equal<
    [
      SecretProvider['resolve'] extends (
        reference: SecretScopedReference<SecretId<'liteship.server.secret.law.secret-a'>>,
      ) => Result<
        RevealedSecret<SecretId<'liteship.server.secret.law.secret-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      RevealedSecret<SecretId<'liteship.server.secret.law.secret-b'>> extends RevealedSecret<
        SecretId<'liteship.server.secret.law.secret-a'>
      >
        ? true
        : false,
    ],
    [true, false]
  >
>;


/**
 * Compile-time law: a revealed secret's members are exactly the identity,
 * the scoped use operation, and the disposal — material is not a member of
 * the revelation or the receipt; it appears only as the consumer's input,
 * and a consumer of secret B cannot be used for secret A.
 */
export type ARevealedSecretHasNoSerializationSurface = Assert<
  Equal<
    [
      keyof RevealedSecret<SecretId>,
      'material' extends keyof RevealedSecret<SecretId> ? true : false,
      keyof SecretUseReceipt<SecretId>,
      InputOf<SecretConsumer<SecretId>['consume']>,
      SecretConsumer<SecretId<'liteship.server.secret.law.secret-b'>> extends SecretConsumer<
        SecretId<'liteship.server.secret.law.secret-a'>
      >
        ? true
        : false,
    ],
    ['reveals' | 'use' | 'dispose', false, 'reveals' | 'address', SecretMaterial, false]
  >
>;


/** Compile-time law: disposition is observable without revelation, over closed arms. */
export type DispositionNeverReveals = Assert<
  Equal<
    [SecretProvider['disposition'], TagOf<SecretDisposition>],
    [
      Signature<SecretScopedReference, SecretDisposition, NonEmptyTuple<Diagnostic>>,
      'current' | 'rotated' | 'revoked',
    ]
  >
>;
