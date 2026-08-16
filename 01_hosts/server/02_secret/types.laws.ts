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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { OwnedResource } from '../../../00_core/05_lifecycle/types.js';
import type { Assert, Equal, InputOf, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { RevealedSecret, SecretConsumer, SecretDisposition, SecretId, SecretMaterial, SecretProvider, SecretScopedReference, SecretSourceBinding, SecretUseReceipt } from './types.js';

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
 * Compile-time law: a revealed secret is an owned resource and its consumer
 * remains exact over the secret identity. Material appears only as the
 * consumer's input.
 */
export type ARevealedSecretIsOwnedAndIdentityCorrelated = Assert<
  Equal<
    [
      RevealedSecret<SecretId> extends OwnedResource ? true : false,
      Equal<RevealedSecret<SecretId>['dispose'], OwnedResource['dispose']>,
      keyof SecretUseReceipt<SecretId>,
      InputOf<SecretConsumer<SecretId>['consume']>,
      SecretConsumer<SecretId<'liteship.server.secret.law.secret-b'>> extends SecretConsumer<
        SecretId<'liteship.server.secret.law.secret-a'>
      >
        ? true
        : false,
    ],
    [true, true, 'reveals' | 'address', SecretMaterial, false]
  >
>;

/** Compile-time law: deployment supplies one addressed secret-source fact. */
export type ASecretSourceIsAddressedNotAMarker = Assert<
  Equal<
    SecretSourceBinding['address'],
    ContentAddress<'application/vnd.liteship.server-secret-source+cbor'>
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
