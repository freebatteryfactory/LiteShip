[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / SiteAdapterCheckDisposition

# Type Alias: SiteAdapterCheckDisposition

> **SiteAdapterCheckDisposition** = \{ `coverage`: `ReadonlyArray`\<\{ `coverageRef`: `string`; `sites`: readonly `string`[]; \}\>; `gaps`: `ReadonlyArray`\<\{ `reason`: `string`; `site`: `string`; \}\>; `lane`: [`HarnessLane`](HarnessLane.md); `status`: `"declared-integration"`; \} \| \{ `lane`: [`HarnessLane`](HarnessLane.md); `reason`: `string`; `status`: `"not-applicable"`; \}

Defined in: core/dist/harness/site-adapter.d.ts:44

Resolution of one declared siteAdapter check. Either the check is WIRED real
into its lane, or it is a typed `declared-integration` exemption (a coverage
link to a real existing suite), or a `not-applicable` exemption with a reason.
There is no skip variant by construction — a skip is exactly the thing the
harness LAW forbids.

## Union Members

### Type Literal

\{ `coverage`: `ReadonlyArray`\<\{ `coverageRef`: `string`; `sites`: readonly `string`[]; \}\>; `gaps`: `ReadonlyArray`\<\{ `reason`: `string`; `site`: `string`; \}\>; `lane`: [`HarnessLane`](HarnessLane.md); `status`: `"declared-integration"`; \}

#### coverage

> `readonly` **coverage**: `ReadonlyArray`\<\{ `coverageRef`: `string`; `sites`: readonly `string`[]; \}\>

Real-host coverage links — each a named existing suite proving a site set.

#### gaps

> `readonly` **gaps**: `ReadonlyArray`\<\{ `reason`: `string`; `site`: `string`; \}\>

Declared sites with no real-host lane — tracked gaps, never fabricated.

#### lane

> `readonly` **lane**: [`HarnessLane`](HarnessLane.md)

#### status

> `readonly` **status**: `"declared-integration"`

***

### Type Literal

\{ `lane`: [`HarnessLane`](HarnessLane.md); `reason`: `string`; `status`: `"not-applicable"`; \}
