# Edge Request Settlement

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/04_settlement/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Physically realize core's request-time settlement decisions: bind exact request evidence and deployment capabilities to the already-decided plan, produce request-settled values or exact refusals, and record explanation.

## Owns

- The settlement request: the exact request identity, exact plan ancestry, the core `SettlementDecision`, and the bound evidence — settling request A yields an outcome naming exactly request A.
- The outcome algebra: settled values with a receipt, or a refusal with diagnostics and a receipt — both arms carry receipts; no silent settlement.

## Does not own

- Settlement semantics, decisions, or plans — core's compiler. This home supplies request-time facts a decision was waiting for; it decides nothing and creates no edge-specific settlement language.
- Recomputation of earlier faithful settlements — structurally out of scope and an assurance obligation besides.

## Laws

- A settlement request binds plan ancestry, the core decision, and evidence.
- Both outcome arms carry receipts.

## Proof obligations

- Earlier faithful settlements are never recomputed on the shipping path.
- `settlement-input-population-agreement`: the plan, decision, and evidence values are heterogeneous erased core populations — that the supplied decision belongs to the named plan and the evidence rows are the ones the decision was waiting for cannot be a local generic law. Its nonconforming witness is a settlement request pairing plan A's reference with a decision derived from plan B; the assurance census must refuse it.

Both `system/01_assurance`.

## Implementation boundary

An edge-settlement realization must evaluate the exact residual demand and preserve refusal, selected placement, and diagnostics.
