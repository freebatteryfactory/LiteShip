# Cloudflare Deployment

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/cloudflare/03_deployment/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Consume a deployable application — whoever produced it — together with an admitted configuration and a set of declared bindings, and report the outcome at the right altitude.

## Owns

- The deployment request: exact participation, the umbrella's application, admitted configuration, and declared bindings.
- The deployment outcome: deployed with binding resolutions, refused before the attempt, or failed after it.

## Does not own

- Artifact identity, address, digest, or ancestry.
- The producer of anything it deploys. There is no member with which to ask.
- Protocol handling, routing, or request policy.

## Where direct mode stops being a promise

The umbrella has carried an empty `direct-composition` arm since it was sealed, on the claim that a composition of hosts alone can produce what a framework-produced artifact would, and that the consuming path does not branch. Nothing had ever tested it. The arm was compiled in, but no consumer existed that took both.

This home is that consumer, and it consumes exactly one type. A composition point builds one application from framework-produced artifacts and another from host-only-produced artifacts, then passes both through **one function** into the same request type. There is no member the function could read to decide, which is what the claim actually meant.

The predecessor failed this precisely: its Cloudflare package required a framework sibling and shipped no direct entry at all.

## Laws

- A deployment consumes the umbrella's application whole, written against the imported authority so a local twin fails.
- A deployment cannot ask which producer was involved: six provenance keys are absent by law.
- A deployment pins its exact participation and configuration.
- Refusal precedes the attempt and failure follows it, and neither reports a deployment.
- A refused or failed deployment says why.

## Proof obligations

- That a deployed application serves the bytes its artifacts address.
- That a refusal genuinely sent nothing.
- That a partially applied failure is recoverable or reported as such.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
