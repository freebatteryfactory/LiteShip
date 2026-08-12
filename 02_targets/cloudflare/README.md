# Cloudflare Target

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/cloudflare/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Attach already-defined LiteShip meaning to a platform's registration, configuration, resource-binding, and deployment surfaces — and consume a deployable application without asking who produced it.

This child does less than its siblings. It does not author, does not compile, and does not emit. Four homes is what that honestly requires.

## Homes

| Home | Owns |
|---|---|
| `00_integration` | identity, registration, compatibility evidence |
| `01_configuration` | the raw-to-admitted trust boundary, compatibility date, routes |
| `02_binding` | platform capabilities declared as core groundings |
| `03_deployment` | the deployment relation over the umbrella's application |

## Does not own

- Any sibling target. This child imports none and names none.
- Artifact identity, address, digest, or ancestry.
- The producer of anything it deploys. There is no member with which to ask.
- A platform resource model. Core already has a vocabulary for a grounded capability.
- Credentials, accounts, tokens, or connections.
- Protocol handling, routing, or request policy.

## This child is a correction, not an addition

The predecessor's Cloudflare package is why the sibling-exclusion rule exists. It imported a framework sibling and lost its independent story entirely: no direct worker entry anywhere in the repository, a README that required the framework, a health probe labelled after the framework's output mode, and one example — the framework one. The two target packages that imported no sibling both kept first-class direct use.

That is a natural experiment with a clean result, and it is the whole argument for **coexistence does not create ownership**. A framework may genuinely deploy through this platform. That does not put the platform above the framework, or the framework above the platform, and the moment one imports the other the producer-neutral seam stops being visible to the architecture.

## Where direct mode stops being a promise

The umbrella has carried an empty `direct-composition` arm since it was sealed, on the claim that a composition of hosts alone can produce what a framework-produced artifact would and that the consuming path does not branch. Nothing had ever tested it — the arm was compiled in, but no consumer existed that took both.

`03_deployment` is that consumer, and `verification/probes/probe-direct-deployment.ts` is the test. It builds one application from framework-produced artifacts and another from host-only-produced artifacts, then passes both through **one function** into the same request type. There is no member that function could read to decide, which is what the claim actually meant.

## The deployment contract it earned

The umbrella deliberately deferred the deployable-application shape until a denominator earned it, on the grounds that naming it early would pre-decide both its cardinality and its form. Four shapes were available, and the choice was not free:

- **One artifact** cannot express a worker script beside the static files it serves.
- **A bare non-empty set** loses which member is the entry, so a consumer guesses or a convention gets invented.
- **A manifest of references** is a second artifact vocabulary — precisely what the umbrella refuses everywhere else.
- **An entry plus assets** is what remains, and it is what a deployment actually consumes.

`assets` may be empty: a worker with no static files is an ordinary deployment, not a degenerate one.

## Laws

- The roster is exactly four homes.
- Load-bearing surface members keep their declared types, named one by one.
- This child declares no second ecosystem-target identity.

## Proof obligations

- That the adapter registers and deploys with no framework present.
- That every required binding was satisfied before a deployment is considered live.
- That the stated compatibility date is the one the platform actually applied.
- That a refused deployment genuinely sent nothing.

## Implementation boundary

Specified. No adapter code, no deployment client, no runtime exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/cloudflare
  title: "Cloudflare Target"
  maturity: specified
  implementation: absent
  child_homes:
  - 00_integration
  - 01_configuration
  - 02_binding
  - 03_deployment
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - no-sibling-target-imports
  - registration-names-no-framework
  - no-provenance-questions-in-a-deployment
  - bindings-are-groundings-not-a-resource-model
  - deployable-application-is-entry-plus-assets
  - compatibility-date-is-required
  - refusal-precedes-failure-follows
  - no-secrets-in-a-binding
  production_authority: false
```
