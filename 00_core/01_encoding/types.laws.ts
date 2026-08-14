/**
 * Compile-time laws for `00_core/01_encoding`.
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

import type { Assert, Equal } from '../../types.js';
import type { MediaType, MediaTypeSyntax } from './types.js';

/**
 * The content-type grammar admits lawful types and rejects malformed ones.
 *
 * Both halves matter. A grammar that rejected everything would satisfy every
 * negative fixture and make the repository unable to address a PNG; a grammar
 * that accepted everything is what `Type extends string` already was.
 *
 * The lawful side deliberately includes types that appear nowhere in this
 * repository. `image/png`, `application/wasm`, `text/css`, `font/woff2`, and
 * `model/gltf+json` are all addressable today without an architecture edit,
 * which is the difference between a syntax and a roster.
 *
 * The last negative is the one that was live: bare `string`. Every one of the
 * hundred and seven vendor literals in this tree was an unchecked spelling, so
 * a transposed letter minted an address type that would never unify with the
 * correct one and nothing could notice.
 */
export type TheContentTypeGrammarAdmitsLawfulTypesAndRejectsMalformedOnes = Assert<
  Equal<
    [
      'application/vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'application/vnd.liteship.source-map+json' extends MediaTypeSyntax ? true : false,
      'image/png' extends MediaTypeSyntax ? true : false,
      'application/wasm' extends MediaTypeSyntax ? true : false,
      'text/css' extends MediaTypeSyntax ? true : false,
      'font/woff2' extends MediaTypeSyntax ? true : false,
      'model/gltf+json' extends MediaTypeSyntax ? true : false,
      'applicaton/vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'vnd.liteship.revision+cbor' extends MediaTypeSyntax ? true : false,
      'application/' extends MediaTypeSyntax ? true : false,
      string extends MediaTypeSyntax ? true : false,
    ],
    [true, true, true, true, true, true, true, false, false, false, false]
  >
>;


/**
 * An admitted media type is not a raw string, in either direction.
 *
 * The brand is the runtime half of the split: a validated value minted by its
 * owner. A literal cannot inhabit it — that is the brand doing its job, not a
 * defect to be relaxed — and the carrier is the syntax, so an admitted type is
 * also a well-formed one.
 */
export type AnAdmittedMediaTypeIsNotARawString = Assert<
  Equal<
    [
      'image/png' extends MediaType ? true : false,
      MediaType extends MediaTypeSyntax ? true : false,
      MediaTypeSyntax extends MediaType ? true : false,
    ],
    [false, true, false]
  >
>;
