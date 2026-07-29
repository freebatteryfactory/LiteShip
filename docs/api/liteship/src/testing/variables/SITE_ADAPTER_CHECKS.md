[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / SITE\_ADAPTER\_CHECKS

# Variable: SITE\_ADAPTER\_CHECKS

> `const` **SITE\_ADAPTER\_CHECKS**: readonly \[\{ `id`: `"round-trip-equality"`; `lane`: `"unit"`; `title`: `"round-trip equality: native -> liteship -> native preserves structure"`; \}, \{ `id`: `"host-capability-matrix"`; `lane`: `"integration"`; `title`: `"host capability matrix: each declared site supports the adapter"`; \}\]

Defined in: core/dist/harness/site-adapter.d.ts:68

The two canonical siteAdapter checks and the lane each runs in. The `lane`
here is the DECLARATIVE lane model: round-trip is a pure unit check; the host
capability matrix is an integration check. The driver
(`scripts/capsule-compile.ts`) resolves each to a concrete disposition.
