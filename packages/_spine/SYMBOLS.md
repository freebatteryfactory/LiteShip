# @liteship/_spine symbol index

Generated from the 16 declaration leaf owners. A symbol cannot enter the root barrel unless it has type meaning, one owner, and declaration documentation.

| Symbol | Kind | Owner leaf | Purpose |
| --- | --- | --- | --- |
| `AstroLoggerLike` | interface | `astro.d.ts` | Minimal Astro logger capability required by the diagnostic bridge. |
| `CrossOriginEmbedderPolicy` | type | `astro.d.ts` | Cross-origin isolation modes supported by the Astro worker integration. |
| `FetchLayerNext` | type | `astro.d.ts` | Downstream request handler invoked by a LiteShip fetch layer. |
| `IntegrationConfig` | interface | `astro.d.ts` | Options projected into the LiteShip Astro integration and its nested Vite host. |
| `LiteshipFetchLayer` | type | `astro.d.ts` | Composable fetch-layer function used outside Astro's middleware object model. |
| `LiteshipFetchLayerConfig` | interface | `astro.d.ts` | Fetch-layer options including edge-serving and host-rendering decisions. |
| `LiteshipLocals` | interface | `astro.d.ts` | LiteShip request-local evidence exposed to Astro pages and middleware. |
| `LiteshipMiddlewareConfig` | interface | `astro.d.ts` | Configuration shared by Astro middleware and fetch-layer adapters. |
| `QuantizeProps` | interface | `astro.d.ts` | Props accepted by the Astro \`<Quantize>\` component for one boundary-owned region. |
| `ServerIslandContext` | interface | `astro.d.ts` | Request evidence used to choose an Astro server island's initial boundary state. |
| `BeatComponent` | interface | `beats.d.ts` | Scene/world beat marker — timeline space. Consumed by \`@liteship/scene\`; what \`SyncSystem\` queries via \`world.query('Beat')\`. |
| `BeatMarkerSet` | interface | `beats.d.ts` | Raw beat-marker projection — asset/sample space. Produced by \`@liteship/assets\`. \`beats\` are strictly-increasing **sample indices** (not milliseconds); convert with the source audio's sample rate. This is the shape the \`asset:beats\` capability carries. |
| `BeatProjectionResolutionInput` | interface | `beats.d.ts` | Input contract for the projection → scene-beats resolver (\`resolveBeatProjectionToSceneBeats\`, owned by \`@liteship/scene\`). The resolver is the official bridge between the two stages: it converts each sample index to milliseconds (\`timeMs = index / sampleRate * 1000\`), preserves order and count, and stamps a deterministic strength. |
| `BeatSpawn` | interface | `beats.d.ts` | ECS spawn descriptor — one per resolved {@link BeatComponent}. |
| `CapsuleCommandDescriptor` | interface | `command.d.ts` | Identity + contract that drives CLI listing AND MCP tools/list from ONE source. |
| `CapsuleCommandInvocation` | interface | `command.d.ts` | A transport-neutral request to run a command with already-parsed (not argv) args. |
| `CapsuleCommandResult` | interface | `command.d.ts` | The structured outcome of a command. The CLI adapter serializes \`payload\` to a stdout JSON line; the MCP adapter returns the same \`payload\` as structuredContent. No stdout capture, no flattening. |
| `CapsuleResultMetaKey` | type | `command.d.ts` | Product-owned \`_meta\` key under which a {@link CapsuleResultReceipt} rides on an MCP result (no maintainer identity). |
| `CapsuleResultReceipt` | interface | `command.d.ts` | LiteShip result identity carried in an MCP tool result's \`_meta\` under the reverse-DNS key {@link CapsuleResultMetaKey} (CUT D1). Provenance, NOT the semantic payload: \`structuredContent\` carries the payload (what an \`outputSchema\` will describe in D2); this carries who produced it plus a content-addressed identity. A cross-adapter pure type — the MCP skin populates it now; the CLI may project the same identity later. |
| `CommandAnnotations` | interface | `command.d.ts` | Surface hints for a command, expressed as DATA rather than two hand-edited arrays (the CLI/MCP subset divergence becomes a field, not a maintenance gap). |
| `CommandExecutionKind` | type | `command.d.ts` | What execution shape a command is — the central command law: - \`handler\`: finite structured invocation → returns a \`CapsuleCommandResult\` via a \`@liteship/command\` handler. The only kind eligible for MCP exposure. - \`cli-orchestration\`: terminal UX, inherited stdio, long-running servers, destructive workflows, visible repairs, streaming receipts, or catalog projections. Registry-described for identity/discovery, but intentionally has NO handler — the CLI owns its execution. Never MCP-exposed. Making this explicit (vs. inferring "no handler ⇒ fine") means a finite command that lost its handler is a detectable bug, not a silent gap. |
| `CommandJsonSchema` | interface | `command.d.ts` | Minimal JSON-Schema object shape for a command's input/output contract. |
| `SceneCompilation` | interface | `command.d.ts` | Host-projected facts from one real scene compilation. |
| `WallClockTimestamp` | type | `command.d.ts` | A volatile wall-clock timestamp (CUT B2): an ISO-8601 string stamped at the moment a result/receipt is produced. It is **identity-irrelevant** — excluded from \`resultId\` (idempotency) and never used for causal ordering. It is NOT an \`HLC\` (the causal, monotonic, hash/chain-relevant clock). Use this alias for every volatile command/result timestamp so the contract is visible at the type level without a breaking field rename. |
| `AIAction` | interface | `compiler.d.ts` | One action an agent may propose through the manifest. |
| `AIConstraint` | interface | `compiler.d.ts` | Machine-readable constraint attached to an AI manifest. |
| `AIDimension` | interface | `compiler.d.ts` | One state dimension described to an agent. |
| `AIManifest` | interface | `compiler.d.ts` | Agent-facing manifest projected from one adaptive definition. |
| `AIManifestCompileResult` | interface | `compiler.d.ts` | AI manifest projection together with its generated tool definitions. |
| `AIManifestInput` | interface | `compiler.d.ts` | Authoring-time manifest input; omitted fields default (version '1.0', empty records, no constraints). |
| `AIParamSchema` | interface | `compiler.d.ts` | Restricted parameter schema used by agent action declarations. |
| `AISlot` | interface | `compiler.d.ts` | One named content slot available to an agent-authored composition. |
| `AIToolDefinition` | interface | `compiler.d.ts` | Tool definition synthesized from an agent-visible action. |
| `AIValidationIssue` | interface | `compiler.d.ts` | Structured validation failure for AI-generated output — the teach-by-data shape consumed by LLM re-prompting loops. \`message\` is the prose form surfaced through the parallel \`errors\` array. |
| `ARIACompileResult` | interface | `compiler.d.ts` | Accessibility attributes and announcements projected per adaptive state. |
| `ARIAStates` | interface | `compiler.d.ts` | State-indexed accessibility output accepted by compiler dispatch. |
| `CSSCompileResult` | interface | `compiler.d.ts` | Deterministic stylesheet projection and its structured rule inventory. |
| `CSSContainerRule` | interface | `compiler.d.ts` | One container-scoped CSS rule emitted by the low-level style compiler. |
| `CSSRule` | interface | `compiler.d.ts` | One selector/declaration pair emitted by a CSS compiler. |
| `CSSStateBody` | interface | `compiler.d.ts` | Structured declarations for a state, including optional pseudo selectors. |
| `CSSStateInput` | type | `compiler.d.ts` | Shorthand or structured authored CSS declarations for one state. |
| `CSSStates` | type | `compiler.d.ts` | State-indexed CSS property tables accepted by compiler dispatch. |
| `CompileResult` | type | `compiler.d.ts` | Closed union returned by the compiler dispatcher for every target. |
| `CompilerDef` | type | `compiler.d.ts` | Closed union of definition projections accepted by the compiler dispatcher. |
| `ConfigTemplateResult` | interface | `compiler.d.ts` | Generated host-configuration template and its destination filename. |
| `DefKind` | type | `compiler.d.ts` | Definition kinds accepted by the component-level compiler projections. |
| `GLSLCompileResult` | interface | `compiler.d.ts` | GLSL source plus the uniforms and defines required to drive it. |
| `GLSLDefine` | interface | `compiler.d.ts` | One preprocessor define emitted into a GLSL program. |
| `GLSLStates` | type | `compiler.d.ts` | State-indexed GLSL numeric uniform tables accepted by compiler dispatch. |
| `GLSLType` | type | `compiler.d.ts` | GLSL uniform types supported by LiteShip's shader projection. |
| `GLSLUniform` | interface | `compiler.d.ts` | One named GLSL uniform declaration and its authored default. |
| `StyleCSSResult` | interface | `compiler.d.ts` | CSS projection of one adaptive style definition. |
| `ThemeCSSResult` | interface | `compiler.d.ts` | CSS projection of a theme and its named variants. |
| `TokenCSSResult` | interface | `compiler.d.ts` | CSS custom-property projection of a token definition. |
| `TokenJSResult` | interface | `compiler.d.ts` | JavaScript-friendly data projection of a token definition. |
| `TokenTailwindResult` | interface | `compiler.d.ts` | Tailwind theme extension projected from a token definition. |
| `WGSLBinding` | interface | `compiler.d.ts` | One WGSL resource binding in a declared bind group. |
| `WGSLCompileResult` | interface | `compiler.d.ts` | WGSL source plus its bindings, uniforms, and generated structures. |
| `WGSLStates` | type | `compiler.d.ts` | State-indexed WGSL uniform tables accepted by compiler dispatch. |
| `WGSLStruct` | interface | `compiler.d.ts` | Named WGSL structure and its ordered field declarations. |
| `WGSLType` | type | `compiler.d.ts` | WGSL scalar and vector types supported by LiteShip's shader projection. |
| `WGSLUniformValue` | type | `compiler.d.ts` | Runtime value accepted by a generated WGSL uniform. |
| `WGSLUniformVector` | type | `compiler.d.ts` | Fixed-width numeric tuple accepted as a WGSL uniform vector. |
| `Config` | interface | `config.d.ts` | Immutable, content-addressed project configuration consumed by LiteShip hosts. |
| `ConfigInput` | interface | `config.d.ts` | User-facing input — no id, no _tag |
| `ReadonlyConfigValue` | type | `config.d.ts` | Recursive immutable snapshot applied to retained project-configuration values. |
| `AddressedDigest` | interface | `core.d.ts` | A pair of hashes over the same canonical bytes: the ergonomic identity ({@link ContentAddress}, fnv1a) plus a cryptographic digest ({@link IntegrityDigest}, sha256 or blake3). Used by external-artifact carriers like ShipCapsule (ADR-0011). \`algo\` records which hash family minted the integrity digest; v0.1.0 emits \`sha256\`, v0.2 will emit \`blake3\`. |
| `Animation` | namespace | `core.d.ts` | Frame sampling and interpolation helpers for time-based animation. |
| `AsyncOwnedResource` | interface | `core.d.ts` | A resource that owns its teardown through LiteShip's one public lifecycle. Synchronous finalizers run before \`dispose()\` returns; the promise joins async finalizers and carries aggregate failure. \`[Symbol.asyncDispose]\` makes the value usable with \`await using\`. |
| `BlendNode` | interface | `core.d.ts` | One weighted input node in a blend tree. |
| `BlendTree` | interface | `core.d.ts` | Mutable weighted blend graph over homogeneous numeric records. |
| `Boundary` | interface | `core.d.ts` | Immutable threshold partition that maps one numeric input to named states. |
| `BoundaryCrossing` | type | `core.d.ts` | Discriminated union of boundary crossings |
| `BoundarySpec` | interface | `core.d.ts` | Optional per-boundary activation filter: gate a boundary on device capabilities, an epoch-ms time window, or experiment participation. When a spec is present and \`BoundarySpec.isActive\` returns false for the current context, the boundary is skipped during evaluation. |
| `CapSet` | interface | `core.d.ts` | Boolean capability set paired with a rendering tier decision. |
| `CapTier` | type | `core.d.ts` | Ordered rendering-capability tier from static markup through GPU execution. |
| `CaptureConfig` | interface | `core.d.ts` | Browser capture dimensions, frame rate, duration, and codec preferences. |
| `CaptureFrame` | interface | `core.d.ts` | One timestamped RGBA frame emitted by a capture source. |
| `CaptureResult` | interface | `core.d.ts` | Completed capture bytes and their media metadata. |
| `Cell` | interface | `core.d.ts` | Reactive state container over CellKernel.replay1 (Effect-free, Wave 6) |
| `CellEnvelope` | interface | `core.d.ts` | Typed live-cell payload with its kind and transport metadata. |
| `CellKernel` | namespace | `core.d.ts` | CellKernel — the shared replay-current / fan-out reactive substrate extracted from the compositor's notification seam. \`replay1\` replays the current value on subscribe (Compositor.changes / Cell); \`fanout\` is the strictly-simpler no-replay channel (Zap / crossings / BlendTree.changes). |
| `CellKind` | type | `core.d.ts` | Closed family of live-cell transport and projection roles. |
| `CellMeta` | interface | `core.d.ts` | Optional sequencing metadata attached to a cell emission. |
| `ChainValidationError` | type | `core.d.ts` | Closed reasons a receipt chain can fail structural or cryptographic validation. |
| `ChainValidationOptions` | interface | `core.d.ts` | Optional trust material and bounds used while validating a receipt chain. |
| `CheckpointResult` | interface | `core.d.ts` | Result of anchoring or validating a checkpoint in a receipt graph. |
| `Clock` | interface | `core.d.ts` | A monotonic-ish millisecond time source — the injectable shape runtime time is read through (mirrors \`@liteship/core\`'s \`clock.ts\` export). \`now()\` returns milliseconds, a relative duration source (deltas), never a stable identity input to a hashed artifact. Threaded through {@link Zap.throttle} so the throttle window is measured deterministically under an injected clock, defaulting to the runtime's \`systemClock\` (the monotonic \`performance.now\` boundary). |
| `Codec` | interface | `core.d.ts` | Bidirectional schema-backed codec between input and decoded values. |
| `ColorSpace` | type | `core.d.ts` | Color spaces supported by typed runtime motion values. |
| `CompositeState` | interface | `core.d.ts` | Named compositor state with deterministic numeric properties. |
| `Compositor` | interface | `core.d.ts` | Live compositor that evaluates and blends registered states. |
| `ContentAddress` | type | `core.d.ts` | Content-addressed hash (FNV-1a, fnv1a:hex format). APEX of THREE intentional homes (ADR-0013) — do NOT merge them. This spine type is the strictest: a symbol-brand, so a raw \`fnv1a:...\` string cannot be typed as ContentAddress without a validating constructor. \`@liteship/core\` and \`@liteship/genui\` re-anchor this brand (\`type ContentAddress = _ContentAddress\`) with validating constructors; \`@liteship/canonical\` is intentionally zero-dep (only \`@liteship/error\`) and uses a \`\` \`fnv1a:${string}\` \`\` template-literal brand instead. Merging the homes would either break canonical's zero-dep property or weaken this symbol-brand to a template literal. The three are parity-guarded at runtime by tests/unit/core/schema/brand-validators.test.ts ("ContentAddress three-home parity drift-guard"). |
| `ControllableSignal` | interface | `core.d.ts` | Signal whose host can seek, pause, and resume the underlying source. |
| `DAGNode` | interface | `core.d.ts` | One receipt and its parent hashes in a receipt DAG. |
| `DenseStore` | interface | `core.d.ts` | Dense, fixed-capacity numeric ECS component storage. |
| `DenseSystem` | interface | `core.d.ts` | ECS system that operates on dense-packed component stores |
| `Derived` | interface | `core.d.ts` | Read-only derived computation over CellKernel.replay1 (Effect-free, Wave 6) |
| `DirtyFlags` | interface | `core.d.ts` | Constant-time dirty-bit tracker over a closed key set. |
| `Easing` | namespace | `core.d.ts` | Easing functions and spring configuration used by motion programs. |
| `EdgeType` | type | `core.d.ts` | Control-flow relation between two plan steps. |
| `Entity` | interface | `core.d.ts` | ECS entity view containing its identifier and component map. |
| `EntityId` | type | `core.d.ts` | Branded identifier minted for an ECS entity. |
| `ForkViolation` | interface | `core.d.ts` | Evidence that a receipt graph violates its declared fork policy. |
| `FrameBudget` | interface | `core.d.ts` | Frame-time admission controller for prioritized work. |
| `FrameCapture` | interface | `core.d.ts` | Live browser capture handle that produces and releases encoded frames. |
| `HLC` | interface | `core.d.ts` | Hybrid Logical Clock -- physical time + logical counter + node identity |
| `HLCClock` | interface | `core.d.ts` | A managed HLC clock handle — a plain (Effect-free) mutable holder over the pure increment/merge ops, reading wall time through an injected {@link Clock} (Wave 6). \`tick\`/\`receive\` advance the closure-held timestamp and return it; \`current\` reads without advancing. |
| `IntegrityDigest` | type | `core.d.ts` | Cryptographic content digest. Format: \`sha256:<64-hex>\` or \`blake3:<64-hex>\`. The algorithmic complement to {@link ContentAddress}: same canonical bytes, stronger hash. Carried by {@link AddressedDigest} on external/release artifacts where collision resistance matters (see ADR-0011). |
| `Lifetime` | interface | `core.d.ts` | Lifetime — the disposal primitive that replaces \`Scope\`/\`ManagedRuntime\` at the shed seams. Owns a LIFO finalizer stack disposed exactly once; \`signal\` projects cancellation, and \`dispose()\` settles once every async finalizer settles. |
| `LiveCell` | interface | `core.d.ts` | Reactive cell specialized to a declared transport or projection kind. |
| `MergeResult` | interface | `core.d.ts` | Result of merging receipt DAGs, including conflicts and resulting heads. |
| `Millis` | type | `core.d.ts` | Branded millisecond duration -- forces explicit wrapping of raw numbers at temporal API boundaries. Non-negative millisecond duration. Fractional values allowed. Use Millis(0) for immediate. |
| `MotionTier` | type | `core.d.ts` | The runtime motion tier — derived from device capability + user preference (notably \`prefers-reduced-motion\`) and used to gate animation / output targets. Canonical declaration; \`_spine/detect.d.ts\` and \`_spine/quantizer.d.ts\` re-anchor from here, and \`packages/core/src/evidence/ui-quality.ts\` re-exports it. Order is from lowest capability to highest. \`none\` is forced by \`prefers-reduced-motion: reduce\` regardless of GPU tier; \`compute\` unlocks every output target including the Rust/WASM kernels. |
| `OpType` | type | `core.d.ts` | Operation kinds represented by a plan step. |
| `OutputsFor` | type | `core.d.ts` | Generate valid output shapes per state |
| `Part` | interface | `core.d.ts` | Authored ECS component contract pairing a name with its schema. |
| `Plan` | namespace | `core.d.ts` | Constructors, validation, and topological ordering for plan IR. |
| `PlanBuilder` | interface | `core.d.ts` | Fluent builder that emits an immutable plan IR. |
| `PlanEdge` | interface | `core.d.ts` | Typed directed edge between two plan steps. |
| `PlanIR` | interface | `core.d.ts` | Immutable directed execution plan consumed by runtime coordinators. |
| `PlanStep` | interface | `core.d.ts` | One named operation and dependencies in a plan IR. |
| `PlanValidationError` | type | `core.d.ts` | Closed structural errors produced by plan validation. |
| `PlanValidationResult` | type | `core.d.ts` | Success or bounded failure result from plan validation. |
| `Prettify` | type | `core.d.ts` | Flatten branded intersections for clean IDE hints |
| `Primitive` | type | `core.d.ts` | Discriminated union of all primitives |
| `Priority` | type | `core.d.ts` | Scheduling priority used by frame-budget admission. |
| `ProgramUniforms` | interface | `core.d.ts` | Uniform values bound while executing a plan program. |
| `Quantizer` | interface | `core.d.ts` | Immutable output mapping for every state of a boundary. |
| `QuantizerCrossings` | type | `core.d.ts` | No-replay crossing subscription side (was \`Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>\`): a late subscriber never sees a prior crossing. |
| `QuantizerState` | type | `core.d.ts` | Replay-1 current-state read side (was \`Effect.Effect<StateUnion<B>>\`): \`read()\` returns the current discrete state; a subscriber is replayed the current value on attach. |
| `ReactiveQuantizer` | interface | `core.d.ts` | Reactive quantizer — the {@link Quantizer} base plus its reactive substrate on the extracted {@link CellKernel}. This is the shape \`@liteship/quantizer\`'s live evaluator produces; a purely-synchronous quantizer omits this extension. |
| `ReceiptDAG` | interface | `core.d.ts` | Indexed receipt graph with head tracking and canonical ordering. |
| `ReceiptEnvelope` | interface | `core.d.ts` | Hash-linked receipt carrying deterministic evidence payload and causality. |
| `ReceiptSubject` | interface | `core.d.ts` | Stable identity of the artifact or definition described by a receipt. |
| `RuntimeCoordinator` | interface | `core.d.ts` | Live coordinator surface shared by the core runtime and worker host. |
| `RuntimeCoordinatorConfig` | interface | `core.d.ts` | Construction options for the shared runtime coordinator. |
| `RuntimeCoordinatorDenseStore` | interface | `core.d.ts` | Internal dense numeric-store projection carried by the coordinator. |
| `RuntimeEasing` | interface | `core.d.ts` | Serializable easing descriptor consumed by runtime write plans. |
| `RuntimePhase` | type | `core.d.ts` | Named phases of the shared runtime coordinator's frame plan. |
| `RuntimeWritePlan` | interface | `core.d.ts` | Deterministic sequence of runtime property-write windows. |
| `RuntimeWriteProperty` | interface | `core.d.ts` | One property transition from a typed source value to a typed target value. |
| `RuntimeWriteWindow` | interface | `core.d.ts` | Timed write window containing the properties active over one interval. |
| `Scheduler` | interface | `core.d.ts` | Host-neutral frame scheduler used by animation and quantization runtimes. |
| `SchemaPort` | type | `core.d.ts` | The permanent schema contract: the phantom \`Type\`/\`Encoded\` pair every schema value carries (\`A\` decodes out, \`I\` is the encoded form). Structural, so an effect \`Schema\`/\`Codec\` value and a kernel schema both satisfy it — the spine names this instead of effect's \`Schema\` (ADR-0010, spine-first). |
| `Signal` | interface | `core.d.ts` | Reactive signal over CellKernel.replay1 (Effect-free, Wave 6) |
| `SignalInput` | type | `core.d.ts` | Branded input signal name -- e.g. 'viewport.width', 'prefers-color-scheme' |
| `SignalSource` | type | `core.d.ts` | Discriminant payloads default to the common case when omitted: viewport \`axis: 'width'\`, time \`mode: 'elapsed'\`, pointer \`axis: 'x'\`, scroll \`axis: 'y'\`, audio \`mode: 'sample'\`. \`createSignal\` normalizes the source, so the returned signal's \`source\` always carries explicit values. Audio modes: \`sample\`/\`normalized\` are offline/scrub reads; \`amplitude\` (0..1 RMS) / \`beat\` (0/1 onset pulse) are live analyser-driven feeds published by a host runtime producer. |
| `SignalSourceType` | type | `core.d.ts` | Built-in and host-defined source families understood by reactive signals. |
| `StateName` | type | `core.d.ts` | Branded state name -- e.g. 'mobile', 'tablet', 'desktop' |
| `StateUnion` | type | `core.d.ts` | Extract literal union of state names from a Boundary |
| `Store` | interface | `core.d.ts` | TEA-style reducer store over CellKernel.replay1 (Effect-free, Wave 6) |
| `System` | interface | `core.d.ts` | ECS system that evaluates entities matching a component-name query. |
| `ThresholdValue` | type | `core.d.ts` | Branded threshold number on a boundary |
| `Timeline` | interface | `core.d.ts` | Quantizer over time on CellKernel.replay1 ({distinct} state channel, Effect-free, Wave 6) |
| `TopoSortResult` | type | `core.d.ts` | Topological plan order or the cycle that prevents one. |
| `TransformPart` | interface | `core.d.ts` | Partial transform components composed into a rendered transform value. |
| `TypedRef` | interface | `core.d.ts` | Content-addressed reference to a payload validated against a schema hash. |
| `TypedValue` | type | `core.d.ts` | Runtime value whose unit or color space is explicit in the type. |
| `VectorClock` | interface | `core.d.ts` | Immutable peer-counter map used for causal ordering. |
| `VideoConfig` | interface | `core.d.ts` | Dimensions, frame rate, and duration of a video render schedule. |
| `VideoFrameOutput` | interface | `core.d.ts` | One scheduled video frame and the compositor state that produced it. |
| `VideoRenderer` | interface | `core.d.ts` | Canonical frame scheduler over a compositor and video configuration. |
| `World` | interface | `core.d.ts` | Live ECS world that owns entities, dense stores, and scheduled systems. |
| `Zap` | interface | `core.d.ts` | Push-based event channel over a no-replay {@link CellKernel} fan-out |
| `CSSCustomProp` | type | `design.d.ts` | Syntactically valid CSS custom-property name. |
| `CSSLength` | type | `design.d.ts` | CSS length units accepted by design-token and style declarations. |
| `CSSProp` | type | `design.d.ts` | LiteShip-owned CSS custom-property name. |
| `CSSTime` | type | `design.d.ts` | CSS time value accepted by transitions and animations. |
| `Component` | interface | `design.d.ts` | Reusable styled component definition with named content slots. |
| `ShadowLayer` | interface | `design.d.ts` | One box-shadow layer with explicit geometry and color. |
| `SlotConfig` | interface | `design.d.ts` | Authored contract for one named component content slot. |
| `SlotsOf` | type | `design.d.ts` | Slot-name union carried by a component definition. |
| `Style` | interface | `design.d.ts` | Content-addressed adaptive style bound to one boundary definition. |
| `StyleLayer` | interface | `design.d.ts` | Property, shadow, and pseudo declarations for one style state. |
| `StyleTransitionConfig` | interface | `design.d.ts` | \`defineStyle\` transition input — plain \`number\` durations are branded with {@link Millis} internally. |
| `Theme` | interface | `design.d.ts` | Named token variants projected as an immutable theme. |
| `Token` | interface | `design.d.ts` | Immutable, content-addressed design token with optional adaptive axes. |
| `TokenRef` | type | `design.d.ts` | Branded reference to a named token definition. |
| `TokensOf` | type | `design.d.ts` | Token-name union carried by a theme definition. |
| `VariantsOf` | type | `design.d.ts` | Variant-name union carried by a theme definition. |
| `DesignTier` | type | `detect.d.ts` | Ordered visual-detail tier selected from device evidence. |
| `DetectionResult` | interface | `detect.d.ts` | Base capability evidence and the rendering tier derived from it. |
| `DeviceCapabilities` | interface | `detect.d.ts` | Browser-observed hardware, preference, viewport, and connection capabilities. |
| `Disposer` | type | `detect.d.ts` | A teardown function — call it to remove the listeners it added. |
| `ExtendedDetectionResult` | interface | `detect.d.ts` | Detection result extended with motion and design-tier decisions. |
| `ExtendedDeviceCapabilities` | interface | `detect.d.ts` | Optional browser capabilities used by richer host decisions. |
| `GPUTier` | type | `detect.d.ts` | Coarse GPU capability bucket reported by browser detection. |
| `BoundaryCache` | interface | `edge.d.ts` | Async cache contract for content-addressed boundary outputs. |
| `BoundaryManifest` | type | `edge.d.ts` | Immutable boundary-manifest index keyed by boundary content address. |
| `BoundaryManifestEntry` | interface | `edge.d.ts` | One boundary's precompiled target outputs indexed by tier pair. |
| `BoundaryManifestFile` | interface | `edge.d.ts` | Versioned, content-addressed serialized boundary manifest. |
| `ClientHints` | namespace | `edge.d.ts` | Parsers and normalizers for edge-visible client-hint evidence. |
| `ClientHintsHeaders` | interface | `edge.d.ts` | HTTP client-hint headers consumed by edge capability resolution. |
| `CompiledGLSLOutput` | interface | `edge.d.ts` | GLSL source and numeric uniforms stored in an edge manifest. |
| `CompiledOutputs` | interface | `edge.d.ts` | Precompiled CSS, shader, accessibility, and agent projections for a boundary. |
| `CompiledWGSLOutput` | interface | `edge.d.ts` | WGSL source and uniform values stored in an edge manifest. |
| `EdgeHostAdapter` | interface | `edge.d.ts` | Host-neutral edge adapter that resolves request evidence into LiteShip outputs. |
| `EdgeHostAdapterConfig` | interface | `edge.d.ts` | Complete configuration accepted by an edge host adapter. |
| `EdgeHostBoundaryConfig` | interface | `edge.d.ts` | Boundary manifest and precompiled-asset inputs for edge host resolution. |
| `EdgeHostBoundaryResolution` | interface | `edge.d.ts` | Resolved state and compiled outputs for one boundary. |
| `EdgeHostCacheConfig` | interface | `edge.d.ts` | TTL, tags, and cache implementation used by an edge host. |
| `EdgeHostCacheStatus` | type | `edge.d.ts` | Observable cache disposition of an edge host resolution. |
| `EdgeHostCacheTags` | type | `edge.d.ts` | Static cache tags or a resolver derived from one edge compile context. |
| `EdgeHostCompileContext` | interface | `edge.d.ts` | Edge host context extended with the selected manifest entry and tiers. |
| `EdgeHostContext` | interface | `edge.d.ts` | Request evidence available to an edge host adapter. |
| `EdgeHostResolution` | interface | `edge.d.ts` | Tier, theme, boundary, asset, and cache evidence returned by an edge host. |
| `EdgeTier` | namespace | `edge.d.ts` | Conservative edge-tier inference helpers. |
| `EdgeTierResult` | interface | `edge.d.ts` | Provisional tier decision and the evidence available at the edge. |
| `EdgeWGSLUniformValue` | type | `edge.d.ts` | Scalar or vector WGSL uniform retained in an edge manifest. |
| `EdgeWGSLUniformVector` | type | `edge.d.ts` | Fixed-width WGSL vector retained in an edge manifest. |
| `KVNamespace` | interface | `edge.d.ts` | Minimal key-value namespace capability required by the edge cache. |
| `ThemeCompileConfig` | interface | `edge.d.ts` | Options controlling edge-side theme stylesheet generation. |
| `ThemeCompileResult` | interface | `edge.d.ts` | Compiled theme CSS and its normalized declaration inventory. |
| `ThemeDeclaration` | interface | `edge.d.ts` | Internal normalized custom-property declaration for one theme variant. |
| `TierKey` | type | `edge.d.ts` | Stable cache partition composed from motion and design tiers. |
| `ComponentCatalog` | interface | `genui.d.ts` | Host-registered component catalog for generated UI. |
| `ComponentDef` | interface | `genui.d.ts` | Catalog component definition — props and child constraints. |
| `ComponentPropDef` | interface | `genui.d.ts` | Prop schema entry for a catalog component. |
| `GeneratedUINode` | interface | `genui.d.ts` | Structured UI node emitted by model/runtime — references catalog components by name. |
| `GeneratedUIValidationError` | interface | `genui.d.ts` | Validation failure for generated UI trees. |
| `AnimatedQuantizer` | interface | `quantizer.d.ts` | Reactive quantizer extended with transition progress and interruption semantics. |
| `DefineQuantizerOptions` | interface | `quantizer.d.ts` | Immutable definition options for state outputs, tier gating, and spring motion. |
| `EvaluateResult` | interface | `quantizer.d.ts` | Pure boundary-evaluation result with hysteresis bookkeeping. |
| `InterpolatedFrame` | interface | `quantizer.d.ts` | An interpolated animation frame emitted during a crossing. |
| `LiveQuantizer` | interface | `quantizer.d.ts` | Running quantizer that publishes state and target updates from a signal. |
| `OutputRecord` | type | `quantizer.d.ts` | The resolved per-target output record a {@link LiveQuantizer} dispatches. |
| `OutputTarget` | type | `quantizer.d.ts` | Closed compiler targets a quantizer can project for each state. |
| `OwnedAnimatedQuantizer` | type | `quantizer.d.ts` | A live animated quantizer that owns its teardown directly ({@link AsyncOwnedResource}): \`await animated.dispose()\` stops observing the wrapped quantizer's crossings, aborts any in-flight animation, and closes the \`interpolated\` fan-out. The value IS the disposable — no pair to destructure. |
| `OwnedQuantizer` | type | `quantizer.d.ts` | A live reactive quantizer that owns its teardown directly ({@link AsyncOwnedResource}): \`await quantizer.dispose()\` closes the state / outputs / crossings kernels. The value IS the disposable — no pair to destructure — with the owning \`lifetime\` still reachable. |
| `QuantizerConfig` | interface | `quantizer.d.ts` | Immutable, content-addressed quantizer definition (authored intent). Pass it to \`createQuantizer\` to materialize a live {@link LiveQuantizer} paired with the {@link Lifetime } that owns its teardown. |
| `QuantizerOutputs` | interface | `quantizer.d.ts` | Complete target-specific output tables for every boundary state. |
| `QuantizerRuntime` | interface | `quantizer.d.ts` | Per-instantiation runtime injection for \`createQuantizer\`: the wall-clock boundary advancing this instance's monotonic crossing HLC (defaults to \`wallClock\`) and the HLC node id. Injected at instantiation, never part of the cached config's content-addressed identity. |
| `ReadonlyQuantizerValue` | type | `quantizer.d.ts` | Recursive immutable snapshot applied to retained quantizer values. |
| `SpringConfig` | interface | `quantizer.d.ts` | Physical spring parameters used for animated state transitions. |
| `Transition` | interface | `quantizer.d.ts` | One running transition between two states of a boundary. |
| `TransitionConfig` | interface | `quantizer.d.ts` | Duration and easing applied to one state-to-state transition. |
| `TransitionMap` | type | `quantizer.d.ts` | Sparse transition configuration indexed by source and destination state. |
| `RemotionVideoConfig` | interface | `remotion.d.ts` | The timing/resolution shape Remotion already holds — exactly what \`useVideoConfig()\` and \`calculateMetadata\` return (extra fields ignored). |
| `BeatHandle` | interface | `scene.d.ts` | Beat handle produced by \`Beat(count)\` — a musical position the scene compiler resolves to a frame index using the scene's BPM + fps. Spec 1 §5.4: "scene BPM converts Beat(n) → Millis at compile time". |
| `EaseName` | type | `scene.d.ts` | Closed set of parameterless named easings (Spec 1 §5.4 catalog). |
| `EaseTag` | type | `scene.d.ts` | Serializable ease reference stored on a TransitionTrack and emitted as the \`Ease\` ECS component. Names — not functions — keep the compiled scene pure data (content-addressable, dense-store-safe). \`{ stepped: n }\` carries the step count for the \`ease.stepped(n)\` factory. |
| `FadeEnvelope` | interface | `scene.d.ts` | Fade envelope (linear over a beat span). Authored via \`fade.in\` / \`fade.out\`. |
| `FrameMark` | type | `scene.d.ts` | Timeline mark accepted by track \`from\` / \`to\` fields and \`Scene.include\` offsets: a raw frame index, a \`Beat(n)\` handle, or a deferred frame+beat sum. \`compileScene\` normalizes every mark to a numeric frame index (via the scene's BPM + fps) before invariants run. |
| `FrameMarkSum` | interface | `scene.d.ts` | Deferred sum of frame-space and beat-space offsets. Produced by \`addFrameMarks\` when a beat mark and a numeric frame mark are combined (e.g. \`Scene.include(sub, { offset: Beat(8) })\` over a sub-scene authored in raw frames). Resolved by \`compileScene\` as \`frames + resolveBeat(Beat(beats), { bpm, fps })\`. |
| `PulseEnvelope` | interface | `scene.d.ts` | Pulse envelope (periodic, amplitude-scaled). Authored via \`pulse.every\`. |
| `ResolvedEnvelope` | type | `scene.d.ts` | Compile-time-resolved envelope — the \`Envelope\` ECS component shape emitted by \`compileScene\`. Beat spans are pre-resolved to frame counts so the per-tick read stays arithmetic-only (ADR-0002). |
| `TrackEnvelope` | type | `scene.d.ts` | Track envelope union — the optional automation curve a track may declare. |
| `TrackId` | type | `scene.d.ts` | Branded track identifier, keyed by track kind. The phantom parameter \`K\` is encoded in the brand symbol's value so \`TrackId<'video'>\` and \`TrackId<'audio'>\` are distinct nominal types. Cross-kind assignment fails at compile time. |
| `TrackKind` | type | `scene.d.ts` | Closed set of track kinds. |
| `BoundaryAssetUrlMap` | type | `vite.d.ts` | Boundary threshold-to-asset URL table emitted for host consumption. |
| `CollectBoundaryManifestOptions` | interface | `vite.d.ts` | Inputs required to assemble a build-time boundary manifest. |
| `HMRPayload` | interface | `vite.d.ts` | Typed payload sent when a LiteShip definition changes during HMR. |
| `PluginConfig` | interface | `vite.d.ts` | LiteShip Vite plugin discovery, HMR, environment, and WASM options. |
| `PrimitiveKind` | type | `vite.d.ts` | Authored definition kinds discovered by the Vite integration. |
| `PrimitiveResolution` | interface | `vite.d.ts` | Resolved authored definition and the source file that owns it. |
| `QuantizeBlock` | interface | `vite.d.ts` | Parsed \`@quantize\` block and its source location. |
| `QuantizeNestedRule` | interface | `vite.d.ts` | Nested selector or at-rule preserved inside a quantized state block. |
| `QuantizeSheetContext` | interface | `vite.d.ts` | Sheet-level aggregation context for viewport containment: thread ONE instance through every \`compileQuantizeBlock\` call of a stylesheet and emit a single \`:root\` rule via \`viewportContainmentRule\` (\`container-name\` is a replaced property -- per-block rules would overwrite each other). |
| `QuantizeStateBody` | interface | `vite.d.ts` | Parsed declarations and nested rules for one quantized state. |
| `StyleBlock` | interface | `vite.d.ts` | Parsed style directive and its state-layer declarations. |
| `ThemeBlock` | interface | `vite.d.ts` | Parsed theme directive and its named variant declarations. |
| `TokenBlock` | interface | `vite.d.ts` | Parsed token directive and its normalized declaration data. |
| `VirtualModuleData` | interface | `vite.d.ts` | Data projected into LiteShip's generated Vite virtual modules. |
| `VirtualModuleId` | type | `vite.d.ts` | Closed virtual-module identifiers served by the Vite plugin. |
| `VitePrimitive` | type | `vite.d.ts` | Definition type selected by a Vite primitive kind. |
| `BackpressureHint` | interface | `web.d.ts` | Queue pressure evidence exposed to an SSE producer or consumer. |
| `FocusState` | interface | `web.d.ts` | Focused element and text-selection offsets captured from the DOM. |
| `IMEState` | interface | `web.d.ts` | Input-method composition state retained across DOM updates. |
| `IslandMode` | type | `web.d.ts` | Hydration capability selected for one registered island. |
| `MatchPriority` | type | `web.d.ts` | Match authority used to pair old and new DOM nodes. |
| `MatchResult` | interface | `web.d.ts` | Node match together with the evidence that justified it. |
| `MorphCallbacks` | interface | `web.d.ts` | Lifecycle callbacks emitted around a DOM morph operation. |
| `MorphConfig` | interface | `web.d.ts` | Safety, matching, and preservation options for one DOM morph. |
| `MorphHints` | interface | `web.d.ts` | Optional identity and preservation hints applied during DOM matching. |
| `MorphRejection` | interface | `web.d.ts` | Stable reason and context for a refused DOM morph. |
| `MorphResult` | type | `web.d.ts` | Success or explicit rejection returned by a DOM morph. |
| `OverflowPolicy` | type | `web.d.ts` | Backpressure policy applied when an SSE queue reaches capacity. |
| `PhysicalState` | interface | `web.d.ts` | Browser state captured before DOM morphing and restored afterward. |
| `ReconnectConfig` | interface | `web.d.ts` | Bounded exponential-backoff parameters for SSE reconnection. |
| `RenderFn` | type | `web.d.ts` | Host renderer invoked for each browser-capture frame. |
| `ResumeResponse` | type | `web.d.ts` | Host response to a stream-resumption request. |
| `ResumptionConfig` | interface | `web.d.ts` | Bounds and storage hooks used to resume an interrupted event stream. |
| `ResumptionState` | interface | `web.d.ts` | Last accepted event identity and buffered recovery state. |
| `ResumptionStateInput` | type | `web.d.ts` | Input accepted by \`Resumption.saveState\`. The stored shape keeps \`timestamp\` required; on input it defaults to \`Date.now()\` — only the engine reads it. |
| `SSEClient` | interface | `web.d.ts` | Live resumable SSE client with explicit connection and teardown control. |
| `SSEConfig` | interface | `web.d.ts` | Endpoint, retry, heartbeat, and queue options for an SSE client. |
| `SSEMessage` | type | `web.d.ts` | Parsed data, heartbeat, or control message received over SSE. |
| `SSEState` | type | `web.d.ts` | Observable lifecycle states of an SSE client. |
| `ScrollPosition` | interface | `web.d.ts` | Scroll coordinates retained for one document or element path. |
| `SelectionState` | interface | `web.d.ts` | Serialized browser selection endpoints and direction. |
| `SlotEntry` | interface | `web.d.ts` | Registered DOM slot, its element, and current island mode. |
| `SlotEntryInput` | interface | `web.d.ts` | Input accepted by \`SlotRegistry.register\`. Registered entries are normalized to a full {@link SlotEntry}: \`mode\` defaults to \`'partial'\` and \`mounted\` defaults to \`true\`. |
| `SlotPath` | type | `web.d.ts` | Branded absolute path identifying a DOM morphing slot. |
| `SlotRegistry` | interface | `web.d.ts` | Live registry that owns DOM slots and observes their lifecycle. |
| `WebCodecsCapture` | namespace | `web.d.ts` | Browser WebCodecs capture constructor and capability surface. |
| `WebCodecsCaptureOptions` | interface | `web.d.ts` | Canvas, timing, and codec options for browser video capture. |
| `AddQuantizerMessage` | interface | `worker.d.ts` | Host command registering one quantizer with the worker. |
| `ApplyResolvedStateMessage` | interface | `worker.d.ts` | Host command applying a newer authoritative state snapshot. |
| `ApplyUpdatesMessage` | interface | `worker.d.ts` | Host command applying an ordered batch of worker updates. |
| `BootstrapQuantizerRegistration` | interface | `worker.d.ts` | Quantizer definition and initial evidence transferred during bootstrap. |
| `BootstrapQuantizersMessage` | interface | `worker.d.ts` | Batched quantizer registrations sent before live computation starts. |
| `BootstrapResolvedStateMessage` | interface | `worker.d.ts` | Authoritative state snapshot installed during worker bootstrap. |
| `CompositorWorker` | interface | `worker.d.ts` | Live worker handle that owns quantization and compositor state. |
| `CompositorWorkerStartupStage` | type | `worker.d.ts` | Named stages measured while starting or resetting a compositor worker. |
| `CompositorWorkerStartupTelemetry` | interface | `worker.d.ts` | Per-stage timing and path evidence from compositor-worker startup. |
| `CompositorWorkerState` | type | `worker.d.ts` | A \`CompositeState\` snapshot emitted by the compositor worker, optionally annotated with per-quantizer generation counters so receivers can drop stale out-of-order messages. |
| `ComputeMessage` | interface | `worker.d.ts` | Host command requesting one worker computation step. |
| `DisposeMessage` | interface | `worker.d.ts` | Host command releasing the worker and its owned resources. |
| `ErrorMessage` | interface | `worker.d.ts` | Bounded worker failure sent to the host. |
| `EvaluateMessage` | interface | `worker.d.ts` | Host command evaluating one registered quantizer input. |
| `EvaluateUpdate` | interface | `worker.d.ts` | Batch update that evaluates one quantizer. |
| `FrameMessage` | interface | `worker.d.ts` | Worker publication of one rendered frame. |
| `FromWorkerMessage` | type | `worker.d.ts` | Closed protocol union sent from a LiteShip worker to its host. |
| `InitMessage` | interface | `worker.d.ts` | Host-to-worker initialization command. |
| `Messages` | namespace | `worker.d.ts` | Constructors and guards for the worker message protocol. |
| `MetricsMessage` | interface | `worker.d.ts` | Worker performance and queue telemetry sent to the host. |
| `MotionSampleMessage` | interface | `worker.d.ts` | Transferable motion sample delivered to a worker-side timeline. |
| `QuantizerBoundarySource` | interface | `worker.d.ts` | The boundary surface addQuantizer derives a registration from — structurally satisfied by a \`defineBoundary\` result from |
| `ReadyMessage` | interface | `worker.d.ts` | Worker acknowledgement that initialization completed. |
| `RemoveQuantizerMessage` | interface | `worker.d.ts` | Host command removing a registered quantizer. |
| `RemoveQuantizerUpdate` | interface | `worker.d.ts` | Batch update that removes one quantizer. |
| `RenderCompleteMessage` | interface | `worker.d.ts` | Worker publication that a requested render completed. |
| `RenderWorker` | interface | `worker.d.ts` | Live rendering worker that owns canvas transfer and frame production. |
| `ResolvedStateAckMessage` | interface | `worker.d.ts` | Worker acknowledgement of an applied authoritative state snapshot. |
| `ResolvedStateAckPayload` | interface | `worker.d.ts` | Acknowledgement payload emitted by the worker after it applies a resolved-state update from the main thread. |
| `ResolvedStateEntry` | interface | `worker.d.ts` | A single resolved discrete-state entry in a bootstrap/apply message. \`generation\` increases monotonically so receivers can discard stale out-of-order deliveries. |
| `SPSCRing` | interface | `worker.d.ts` | Single-producer/single-consumer shared-memory ring buffer. |
| `SPSCRingPair` | interface | `worker.d.ts` | A matched producer/consumer pair sharing one \`SharedArrayBuffer\`, returned by {@link SPSCRing.createPair}. Named (rather than an inline anonymous object) so the pair shape is a single referenceable type. |
| `SetBlendMessage` | interface | `worker.d.ts` | Host command updating the blend weight of one compositor state. |
| `SetBlendUpdate` | interface | `worker.d.ts` | Batch update that changes one compositor blend weight. |
| `StartRenderMessage` | interface | `worker.d.ts` | Host command starting the worker's render loop. |
| `StartupComputeMessage` | interface | `worker.d.ts` | Worker command executing the initial compute packet. |
| `StartupComputePacket` | interface | `worker.d.ts` | First compute payload bundled with worker bootstrap. |
| `StateMessage` | interface | `worker.d.ts` | Worker publication of a computed state transition. |
| `StopRenderMessage` | interface | `worker.d.ts` | Host command stopping the worker's render loop. |
| `ToWorkerMessage` | type | `worker.d.ts` | Closed protocol union sent from the host to a LiteShip worker. |
| `TransferCanvasMessage` | interface | `worker.d.ts` | Host command transferring an offscreen canvas into the worker. |
| `TransferableCanvas` | interface | `worker.d.ts` | The canvas surface attachCanvas needs — HTMLCanvasElement satisfies it structurally. |
| `WarmResetMessage` | interface | `worker.d.ts` | Host command resetting mutable worker state while retaining allocations. |
| `WorkerConfig` | interface | `worker.d.ts` | Capacity and optional transport settings used to initialize a worker runtime. |
| `WorkerErrorCode` | type | `worker.d.ts` | Failure site codes the built-in workers emit. |
| `WorkerHost` | interface | `worker.d.ts` | Host coordinator that owns worker transport, state, and teardown. |
| `WorkerHostRenderConfig` | interface | `worker.d.ts` | Render configuration for WorkerHost.startRender — only durationMs is required. |
| `WorkerLike` | interface | `worker.d.ts` | Structural worker boundary used by browser hosts and deterministic test doubles. |
| `WorkerMetrics` | type | `worker.d.ts` | The performance sample delivered to \`CompositorWorker.onMetrics\` listeners — a single record reusing the wire {@link MetricsMessage} shape (not positional \`(fps, budgetUsed)\` arguments), so a future metric can be added without changing the callback's arity (F1). |
| `WorkerUpdate` | type | `worker.d.ts` | Closed mutation language accepted by a batched worker update. |

Value-only leaf declarations excluded from the type root: 117.
