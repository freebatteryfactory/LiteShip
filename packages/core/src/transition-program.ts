/**
 * TransitionProgram — the explicit multi-transition algebra (#141).
 *
 * Before W9, `keyframesForRouting` collapsed `seq` / `par` / `choice_then` to the
 * SAME two endpoint frames (a routing LABEL, not an algebra). A single `EdgeType`
 * on one {@link TransitionNode} cannot express "A THEN B" vs "A WITH B" vs "A OR B"
 * — the composition is a TREE over transitions, not a flag on one.
 *
 * `TransitionProgram` is that tree. It composes {@link TransitionNode}s with REAL
 * duration composition and branch selection, then lowers to:
 *   - a deterministic `[0,1]` **timeline** of per-transition windows
 *     ({@link lowerTransitionProgram}) — seq total is `Σ`, par total is `max`,
 *     choice executes EXACTLY ONE branch;
 *   - a {@link LoweredMotionPlan} ({@link interpretProgram}) whose `css.keyframes`
 *     are REAL multi-offset stops (not the two-endpoint collapse) and whose
 *     `runtime` plan carries per-window sub-samplers (each with its own W8 easing
 *     descriptor), driven through the `client:motion` floor.
 *
 * `EdgeType` (`plan.ts`) stays the edge flavor BETWEEN adjacent transitions; the
 * program is the composition tree over it. Ordering reuses the existing Plan DAG
 * (`Plan.make`/`seq`/`par` + `topoSort`) as the substrate — acyclicity +
 * a deterministic topological order come for free, so window offsets are
 * reproducible.
 *
 * @module
 */

import type { ContentAddress, SignalInput, StateName } from './brands.js';
import type { DocumentGraph } from './document-graph.js';
import type { DiagnosticPayload } from './diagnostics.js';
import type { RuntimeEasing } from './easing.js';
import { sampleRuntimeEasing } from './easing.js';
import { clamp01 } from './math-utils.js';
import { formatTypedValue, interpolateTyped, type TypedValue } from './interpolate.js';
import { Plan } from './plan.js';
import {
  interpretTransition,
  type CssKeyframeStep,
  type CssMotionPlan,
  type LoweredMotionPlan,
  type MotionPropertyTween,
  type RuntimeWriteProperty,
  type RuntimeWritePlan,
  type RuntimeWriteWindow,
} from './interpret-transition.js';

/**
 * A predicate over a named signal's live value that selects a `choice` branch.
 * `op` mirrors the comparison vocabulary; `between` is the half-open `[lo, hi)`
 * band. Evaluated against {@link ProgramEnv} at lowering time so the selected
 * branch is a stable, auditable receipt.
 */
export type BranchCondition =
  | { readonly op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'; readonly value: number }
  | { readonly op: 'between'; readonly lo: number; readonly hi: number };

/** One `choice` arm: a condition over a named signal source guarding a sub-program. */
export interface TransitionBranch {
  readonly when: BranchCondition;
  readonly source: SignalInput;
  readonly body: TransitionProgram;
}

/**
 * The composition tree over {@link TransitionNode}s.
 *
 * - `step` — one transition (Pose→Pose), optionally preceded by `delayMs` dead time.
 * - `seq` — deterministic duration composition: total is `Σ` children (+ delays),
 *   each child mapped to a disjoint sub-window.
 * - `par` — total is the `max` child duration; children share the window, each
 *   scaled to its own duration; a short child holds its final pose after completing.
 * - `choice` — EXACTLY ONE branch executes, selected by {@link BranchCondition}
 *   over its named signal source; unchosen branches never write.
 */
export type TransitionProgram =
  | { readonly kind: 'step'; readonly transitionId: ContentAddress; readonly delayMs?: number }
  | { readonly kind: 'seq'; readonly children: readonly TransitionProgram[] }
  | { readonly kind: 'par'; readonly children: readonly TransitionProgram[] }
  | { readonly kind: 'choice'; readonly branches: readonly TransitionBranch[]; readonly otherwise?: TransitionProgram };

/** Resolved signal values a `choice` selects against (e.g. `{ 'viewport.width': 1024 }`). */
export interface ProgramEnv {
  readonly signals: Readonly<Record<string, number>>;
}

/** The auditable record of which `choice` arm a window came from. */
export interface BranchGuard {
  readonly source: string;
  readonly when?: BranchCondition;
  readonly branchId: string;
}

/** One entry in a lowered program timeline: a transition mapped to its `[0,1]` window. */
export interface ProgramTimelineEntry {
  readonly transitionId: ContentAddress;
  /** Global normalized window start in `[0,1]`. */
  readonly windowStart: number;
  /** Global normalized window end in `[0,1]`. */
  readonly windowEnd: number;
  /** Present iff this entry was selected from a `choice` — the audit receipt. */
  readonly branchGuard?: BranchGuard;
}

/** Result of {@link lowerTransitionProgram}: the composed duration + ordered windows. */
export interface LoweredProgramTimeline {
  /** Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch). */
  readonly totalMs: number;
  readonly entries: readonly ProgramTimelineEntry[];
  /** The `branchId` of every executed `choice` arm, in traversal order (auditable). */
  readonly selectedBranchIds: readonly string[];
  readonly diagnostics: readonly DiagnosticPayload[];
}

/** Per-transition lowering pulled once from {@link interpretTransition} and reused. */
interface StepInfo {
  readonly transitionId: ContentAddress;
  readonly durationMs: number;
  readonly runtimeProps: readonly RuntimeWriteProperty[];
  readonly cssProps: readonly MotionPropertyTween[];
  readonly easing: RuntimeEasing;
  readonly fromState: StateName;
  readonly toState: StateName;
  readonly target: string;
  readonly signals: readonly SignalInput[];
}

/** An absolute-ms window (pre-normalization) referencing its step lowering. */
interface AbsWindow {
  readonly step: StepInfo;
  readonly startMs: number;
  readonly endMs: number;
  readonly branchGuard?: BranchGuard;
}

interface LayoutResult {
  readonly totalMs: number;
  readonly windows: readonly AbsWindow[];
  readonly selectedBranchIds: readonly string[];
}

function stepInfo(
  graph: DocumentGraph,
  transitionId: ContentAddress,
  diagnostics: DiagnosticPayload[],
): StepInfo | undefined {
  const plan = interpretTransition(graph, transitionId);
  if (!plan.css || !plan.runtime) {
    for (const d of plan.diagnostics) diagnostics.push(d);
    diagnostics.push({
      source: 'interpretProgram',
      code: 'step-unresolved',
      message: `transition step ${transitionId} did not lower to a motion plan`,
    });
    return undefined;
  }
  return {
    transitionId,
    durationMs: plan.css.durationMs,
    runtimeProps: plan.runtime.properties,
    cssProps: plan.css.properties,
    easing: plan.runtime.easing,
    fromState: plan.css.fromState,
    toState: plan.css.toState,
    target: plan.target,
    signals: plan.signals,
  };
}

/**
 * Order a composition's children through the Plan DAG so the sub-window offsets are
 * deterministic. A `seq` chains consecutive steps with `Plan.seq` edges (topo order
 * == authored order); a `par` leaves them edge-free (all in-degree 0 → insertion
 * order). `Plan.topoSort` surfaces the canonical order and validates acyclicity —
 * the ordering substrate the spec mandates reusing.
 */
function orderChildren(count: number, edge: 'seq' | 'par'): number[] {
  let builder = Plan.make(`transition-${edge}`);
  for (let i = 0; i < count; i++) builder = builder.step(`c${i}`, { type: 'noop' });
  if (edge === 'seq') {
    for (let i = 1; i < count; i++) builder = builder.seq(`step-${i}`, `step-${i + 1}`);
  }
  const ir = builder.build();
  const sorted = Plan.topoSort(ir).sorted;
  return sorted.map((id) => Number(id.slice('step-'.length)) - 1);
}

function evalCondition(cond: BranchCondition, value: number): boolean {
  switch (cond.op) {
    case 'lt':
      return value < cond.value;
    case 'lte':
      return value <= cond.value;
    case 'gt':
      return value > cond.value;
    case 'gte':
      return value >= cond.value;
    case 'eq':
      return value === cond.value;
    case 'between':
      return value >= cond.lo && value < cond.hi;
  }
}

interface SelectedBranch {
  readonly body: TransitionProgram;
  readonly guard: BranchGuard;
}

function selectBranch(
  program: Extract<TransitionProgram, { kind: 'choice' }>,
  env: ProgramEnv,
  diagnostics: DiagnosticPayload[],
): SelectedBranch | undefined {
  for (let i = 0; i < program.branches.length; i++) {
    const branch = program.branches[i]!;
    const value = env.signals[branch.source];
    if (value !== undefined && evalCondition(branch.when, value)) {
      return { body: branch.body, guard: { source: branch.source, when: branch.when, branchId: `branch-${i}` } };
    }
  }
  if (program.otherwise) {
    return { body: program.otherwise, guard: { source: '(otherwise)', branchId: 'otherwise' } };
  }
  diagnostics.push({
    source: 'interpretProgram',
    code: 'choice-unmatched',
    message: 'no choice branch matched the signal environment and no otherwise arm was provided',
    detail: { sources: program.branches.map((b) => b.source) },
  });
  return undefined;
}

function layout(
  graph: DocumentGraph,
  program: TransitionProgram,
  env: ProgramEnv,
  diagnostics: DiagnosticPayload[],
): LayoutResult {
  switch (program.kind) {
    case 'step': {
      const delay = program.delayMs ?? 0;
      const info = stepInfo(graph, program.transitionId, diagnostics);
      if (!info) return { totalMs: delay, windows: [], selectedBranchIds: [] };
      return {
        totalMs: delay + info.durationMs,
        windows: [{ step: info, startMs: delay, endMs: delay + info.durationMs }],
        selectedBranchIds: [],
      };
    }
    case 'seq': {
      const order = orderChildren(program.children.length, 'seq');
      const windows: AbsWindow[] = [];
      const selected: string[] = [];
      let cursor = 0;
      for (const idx of order) {
        const child = layout(graph, program.children[idx]!, env, diagnostics);
        for (const w of child.windows) windows.push({ ...w, startMs: w.startMs + cursor, endMs: w.endMs + cursor });
        selected.push(...child.selectedBranchIds);
        cursor += child.totalMs;
      }
      return { totalMs: cursor, windows, selectedBranchIds: selected };
    }
    case 'par': {
      const order = orderChildren(program.children.length, 'par');
      const windows: AbsWindow[] = [];
      const selected: string[] = [];
      let total = 0;
      for (const idx of order) {
        const child = layout(graph, program.children[idx]!, env, diagnostics);
        windows.push(...child.windows);
        selected.push(...child.selectedBranchIds);
        total = Math.max(total, child.totalMs);
      }
      return { totalMs: total, windows, selectedBranchIds: selected };
    }
    case 'choice': {
      const sel = selectBranch(program, env, diagnostics);
      if (!sel) return { totalMs: 0, windows: [], selectedBranchIds: [] };
      const child = layout(graph, sel.body, env, diagnostics);
      diagnostics.push({
        source: 'interpretProgram',
        code: 'choice-selected',
        message: `choice executed exactly one branch: ${sel.guard.branchId}`,
        detail: { branchId: sel.guard.branchId, source: sel.guard.source },
      });
      return {
        totalMs: child.totalMs,
        windows: child.windows.map((w) => ({ ...w, branchGuard: w.branchGuard ?? sel.guard })),
        selectedBranchIds: [sel.guard.branchId, ...child.selectedBranchIds],
      };
    }
  }
}

function normalize(startMs: number, totalMs: number): number {
  return totalMs <= 0 ? 0 : startMs / totalMs;
}

/**
 * Lower a {@link TransitionProgram} to a deterministic `[0,1]` timeline of
 * per-transition windows.
 *
 * The window MATH is the algebra, pinned as law: `seq` total is `Σ` child
 * durations (+ delays) with disjoint contiguous windows; `par` total is the `max`
 * child duration with children sharing `[0,1]`, each scaled to its own duration (a
 * shorter child ends before `1` and holds); `choice` lays out ONLY the branch
 * selected by {@link BranchCondition} over `env`, recording its `branchId`.
 * Ordering runs through `Plan.topoSort` for deterministic offsets.
 */
export function lowerTransitionProgram(
  graph: DocumentGraph,
  program: TransitionProgram,
  env: ProgramEnv = { signals: {} },
): LoweredProgramTimeline {
  const diagnostics: DiagnosticPayload[] = [];
  const result = layout(graph, program, env, diagnostics);
  const entries: ProgramTimelineEntry[] = result.windows.map((w) => ({
    transitionId: w.step.transitionId,
    windowStart: normalize(w.startMs, result.totalMs),
    windowEnd: normalize(w.endMs, result.totalMs),
    ...(w.branchGuard ? { branchGuard: w.branchGuard } : {}),
  }));
  return Object.freeze({
    totalMs: result.totalMs,
    entries: Object.freeze(entries),
    selectedBranchIds: Object.freeze(result.selectedBranchIds),
    diagnostics: Object.freeze(diagnostics),
  });
}

/** One keyed tween (opaque `key` — a `cssVar` for the runtime, a CSS `property` for keyframes). */
interface KeyedTween {
  readonly key: string;
  readonly from: TypedValue;
  readonly to: TypedValue;
}

/** A `[0,1]` window carrying its own easing over a set of keyed tweens. */
interface WalkWindow {
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly easing: RuntimeEasing;
  readonly tweens: readonly KeyedTween[];
}

/**
 * THE window-walk — the single source of truth every non-CSS target and the CSS
 * keyframe generator share (Law 4). At global `t`, each window is sampled at its
 * LOCAL progress (`clamp01((t - windowStart) / span)`); `mode` selects the easing:
 *
 *   - `'authored'` — the window's own {@link RuntimeEasing} (the continuous curve the
 *     runtime floor, scene, stage, remotion, and worker samplers all render);
 *   - `'identity'` — linear local progress, for declarative CSS `@keyframes` whose
 *     spring/ease SHAPE lives in the `linear()` timing function, not the stop values
 *     (baking easing into both would double-apply it).
 *
 * Last-window-wins applies ONLY among windows that have reached their start
 * (`t >= windowStart`): a `seq` seam is a defined settled state and a completed
 * program (`t=1`) is the terminal pose. A window that has NOT started yet is clamped
 * to its `from`, so it must never overwrite an earlier ACTIVE window on the same key
 * (that would freeze an in-progress tween at the next step's start value — e.g. a
 * `0→1` fade masked by a following `1→0` window's `from=1`). Such a not-yet-started
 * window only SEEDS a key that no started/prior window has valued, so a key that
 * first appears in a future window still holds its initial `from` until it begins.
 */
function walkWindows(
  windows: readonly WalkWindow[],
  t: number,
  mode: 'authored' | 'identity',
): Map<string, TypedValue> {
  const byKey = new Map<string, TypedValue>();
  for (const window of windows) {
    const span = window.windowEnd - window.windowStart;
    const started = t >= window.windowStart;
    const localRaw = span <= 0 ? (started ? 1 : 0) : (t - window.windowStart) / span;
    const clamped = clamp01(localRaw);
    const eased = mode === 'identity' ? clamped : sampleRuntimeEasing(window.easing)(clamped);
    for (const tween of window.tweens) {
      // Started windows take the key (last-window-wins); unstarted windows only seed
      // a key nothing has valued yet — never clobbering an earlier active window.
      if (started || !byKey.has(tween.key)) {
        byKey.set(tween.key, interpolateTyped(tween.from, tween.to, eased));
      }
    }
  }
  return byKey;
}

/** Project composed {@link AbsWindow}s onto the shared {@link WalkWindow} shape, keyed by CSS `property`. */
function cssWalkWindows(windows: readonly AbsWindow[], totalMs: number): { walk: WalkWindow[]; offsets: number[] } {
  const offsets = new Set<number>([0, 1]);
  const walk: WalkWindow[] = windows.map((w) => {
    const windowStart = normalize(w.startMs, totalMs);
    const windowEnd = normalize(w.endMs, totalMs);
    offsets.add(windowStart);
    offsets.add(windowEnd);
    return {
      windowStart,
      windowEnd,
      easing: w.step.easing,
      tweens: w.step.cssProps.map((p) => ({ key: p.property, from: p.from, to: p.to })),
    };
  });
  return { walk, offsets: [...offsets].sort((a, b) => a - b) };
}

/** Stable value-identity for a {@link RuntimeEasing} so distinct curves compare by value. */
function easingKey(easing: RuntimeEasing): string {
  return easing.kind === 'spring'
    ? `spring:${easing.spring?.stiffness ?? ''}:${easing.spring?.damping ?? ''}:${easing.spring?.mass ?? ''}`
    : easing.kind;
}

/**
 * Build REAL multi-offset `@keyframes` stops from the composed windows — by sampling
 * the SAME `walkWindows` kernel the runtime samplers read (Law 4), so declarative
 * CSS and every non-CSS sampler provably agree. A stop is emitted at every window
 * boundary; at each stop EVERY property is valued (its animated value inside its own
 * window, its held endpoint outside), so `seq` steps that touch different properties
 * produce distinct stops. `'identity'` mode keeps the stop values LINEAR — the spring/
 * ease shape rides the timing function, never double-eased into the values. Chained
 * same-property windows resolve last-window-wins, matching the runtime.
 *
 * When the program uses any NON-DEFAULT easing, the animation-level `animation-timing-function`
 * (which `MotionCompiler` defaults to `ease`) would sample every segment as `ease` on a native
 * `animation-timeline` browser while the JS/stage/worker floors use each window's own curve (a
 * cross-target parity gap — whether the curves are uniform or mixed). To close it, each stop that
 * begins a segment carries THAT segment's easing as a per-keyframe `animation-timing-function`
 * (`CssKeyframeStep.easing`). A default-`ease` program carries none (the compiler default already
 * matches — byte-identical to before). An overlapping segment whose windows DISAGREE on easing
 * (a `par` of differently-eased children) cannot be expressed by one per-keyframe curve, so the
 * shared `@keyframes` stop simply carries no per-keyframe easing there. This is NOT an
 * approximation that ships: a composed program's faithful renderer is the per-window RUNTIME floor
 * (`RuntimeWriteWindow.easing`, sampled by `sampleRuntimeEasing`), which drives `client:motion` and
 * renders each child's curve exactly — the native single-`@keyframes` leg is reserved for single
 * transitions and uniform-easing programs. The former `mixed-easing-overlap-approximated`
 * diagnostic is therefore RETIRED (#148): it flagged a native path composed programs never take.
 */
function buildKeyframes(windows: readonly AbsWindow[], totalMs: number): CssKeyframeStep[] {
  const { walk, offsets } = cssWalkWindows(windows, totalMs);
  // Carry per-keyframe easing whenever ANY window uses a NON-DEFAULT curve — not only when
  // curves are MIXED. `CssMotionPlan` carries no plan-level easing and `MotionCompiler.compile`
  // defaults an omitted curve to `ease`, so a UNIFORM non-default program (e.g. every step a
  // `spring`) would otherwise be sampled as `ease` natively while the runtime/stage/worker
  // floors use the authored curve (Codex P2). Uniform-`ease` programs emit none — the compiler
  // default already matches, so those keyframes stay byte-identical.
  const needsEasing = walk.some((w) => easingKey(w.easing) !== 'ease');

  return offsets.map((offset, i) => {
    const properties: Record<string, string> = {};
    for (const [property, value] of walkWindows(walk, offset, 'identity')) {
      properties[property] = formatTypedValue(value);
    }
    // Default-`ease` programs need no per-keyframe curve; the final stop begins no segment.
    if (!needsEasing || i === offsets.length - 1) return { offset, properties };

    // Every window boundary is an offset, so a window either FULLY covers the segment
    // [offset, next] or misses it — the windows active here are exactly those spanning it.
    const next = offsets[i + 1]!;
    const active = walk.filter((w) => w.windowStart <= offset && w.windowEnd >= next);
    const distinct = new Set(active.map((w) => easingKey(w.easing)));
    if (distinct.size === 1) return { offset, properties, easing: active[0]!.easing };
    // Windows disagree on easing over this shared segment — no single per-keyframe curve
    // serves them. The per-window runtime floor renders each child's curve exactly; the
    // native `@keyframes` stop simply carries no easing here (#148, no diagnostic).
    return { offset, properties };
  });
}

function emptyProgramPlan(graphId: ContentAddress, diagnostics: readonly DiagnosticPayload[]): LoweredMotionPlan {
  return Object.freeze({
    graphId,
    target: '',
    signals: Object.freeze([]),
    diagnostics: Object.freeze([...diagnostics]),
  });
}

/**
 * Interpret a {@link TransitionProgram} into a {@link LoweredMotionPlan} whose
 * `css.keyframes` are REAL multi-offset stops and whose `runtime.windows` are
 * per-transition sub-samplers (each carrying its own easing). This is the program
 * analogue of {@link interpretTransition} — the single-step reader stays the leaf;
 * `interpretProgram` walks the composition tree over it.
 *
 * `env` resolves `choice` branches; the selected `branchId`s ride the diagnostics
 * as an auditable receipt. Under reduced-motion the composite `runtime.toState` +
 * the `t=1` window sample settle to the terminal step's `toPose`.
 */
export function interpretProgram(
  graph: DocumentGraph,
  program: TransitionProgram,
  env: ProgramEnv = { signals: {} },
): LoweredMotionPlan {
  const diagnostics: DiagnosticPayload[] = [];
  const result = layout(graph, program, env, diagnostics);

  if (result.totalMs <= 0 || result.windows.length === 0) {
    diagnostics.push({
      source: 'interpretProgram',
      code: 'empty-program',
      message: 'the transition program lowered to no windows (empty composition or unmatched choice)',
    });
    return emptyProgramPlan(graph.id, diagnostics);
  }

  // A composed program drives ONE host: `LoweredMotionPlan` carries a single
  // `css.selector` / `target` and the runtime windows have no per-window boundary. A
  // MULTI-TARGET program (e.g. `staggerProgram` over distinct children `a`/`b`) cannot
  // be collapsed onto the first boundary — every later child window would silently write
  // to the wrong element. Reject it loudly (Law 1); multi-target motion is lowered
  // PER-TARGET (compile each child, or drive each with its own client:motion).
  const targets = new Set(result.windows.map((w) => w.step.target));
  if (targets.size > 1) {
    diagnostics.push({
      source: 'interpretProgram',
      code: 'multi-target-program',
      message:
        `a composed TransitionProgram spans ${targets.size} boundaries (${[...targets].join(', ')}), but one ` +
        'LoweredMotionPlan drives ONE host element. Multi-target motion (e.g. a stagger over distinct children) ' +
        'must be lowered PER-TARGET — compile each child separately, or drive each with its own client:motion. ' +
        'Refusing to collapse every window onto the first boundary.',
    });
    return emptyProgramPlan(graph.id, diagnostics);
  }

  const first = result.windows[0]!;
  const last = result.windows[result.windows.length - 1]!;

  // Runtime windows — the per-window sub-samplers the floor scrubs.
  const windows: RuntimeWriteWindow[] = result.windows.map((w) => ({
    windowStart: normalize(w.startMs, result.totalMs),
    windowEnd: normalize(w.endMs, result.totalMs),
    properties: w.step.runtimeProps,
    easing: w.step.easing,
  }));

  // Union of runtime props (dedup by cssVar). A repeated cssVar is folded to ONE
  // end-to-end tween: the FIRST occurrence's `from` (the chain's initial value) and
  // the LAST occurrence's `to` (its terminal value). The animated curve still rides
  // `windows`; this flat fallback settles `from(first)→to(last)` — never the last
  // leg alone, which would drop the first step's start.
  const runtimeByVar = new Map<string, RuntimeWriteProperty>();
  for (const w of result.windows)
    for (const p of w.step.runtimeProps) {
      const prior = runtimeByVar.get(p.cssVar);
      runtimeByVar.set(p.cssVar, prior ? { cssVar: prior.cssVar, from: prior.from, to: p.to } : p);
    }
  const unionRuntime = [...runtimeByVar.values()];

  // Union of CSS tweens (dedup by property name). Same fold: the first `from` seeds
  // @property init, the last `to` is the terminal value — so a repeated property's
  // flat metadata (and its `t=1` keyframe) settle to the program's end, matching the
  // runtime sampler instead of freezing at the first step's `to`.
  const cssByProp = new Map<string, MotionPropertyTween>();
  for (const w of result.windows)
    for (const p of w.step.cssProps) {
      const prior = cssByProp.get(p.property);
      cssByProp.set(p.property, prior ? { property: prior.property, from: prior.from, to: p.to } : p);
    }
  const unionCss = [...cssByProp.values()];

  const signals = [...new Set(result.windows.flatMap((w) => w.step.signals))];
  const selector = `[data-czap-boundary="${first.step.target}"]`;

  const css: CssMotionPlan = Object.freeze({
    selector,
    fromState: first.step.fromState,
    toState: last.step.toState,
    properties: Object.freeze(unionCss),
    durationMs: result.totalMs,
    routing: 'seq',
    keyframes: Object.freeze(buildKeyframes(result.windows, result.totalMs)),
    transitionProperty: unionCss.map((p) => p.property).join(', '),
  });

  const runtime: RuntimeWritePlan = Object.freeze({
    properties: Object.freeze(unionRuntime),
    durationMs: result.totalMs,
    routing: 'seq',
    fromState: first.step.fromState,
    toState: last.step.toState,
    easing: last.step.easing,
    windows: Object.freeze(windows),
  });

  return Object.freeze({
    graphId: graph.id,
    target: first.step.target,
    signals: Object.freeze(signals),
    css,
    runtime,
    diagnostics: Object.freeze(diagnostics),
  });
}

/** One sampled leaf: a `cssVar` and its interpolated {@link TypedValue} at a given `t`. */
export interface ProgramSample {
  readonly cssVar: string;
  readonly value: TypedValue;
}

/** Project per-window runtime sub-samplers onto the shared {@link WalkWindow} shape, keyed by `cssVar`. */
function runtimeWalkWindows(windows: readonly RuntimeWriteWindow[]): WalkWindow[] {
  return windows.map((w) => ({
    windowStart: w.windowStart,
    windowEnd: w.windowEnd,
    easing: w.easing,
    tweens: w.properties.map((p) => ({ key: p.cssVar, from: p.from, to: p.to })),
  }));
}

/**
 * The per-window runtime sub-sampler — the READER of `RuntimeWritePlan.windows`
 * (Law 16). At global `t`, each window is sampled at its LOCAL eased progress,
 * interpolated `from`→`to`, last-window-wins. Delegates to the shared
 * `walkWindows` kernel so a multi-step chain and the CSS `@keyframes` are one
 * code path. Prefer `sampleProgram`, which also handles a flat single-tween plan.
 */
export function sampleProgramWindows(windows: readonly RuntimeWriteWindow[], t: number): readonly ProgramSample[] {
  return [...walkWindows(runtimeWalkWindows(windows), t, 'authored').entries()].map(([cssVar, value]) => ({
    cssVar,
    value,
  }));
}

/**
 * `sampleProgram` — THE shared motion kernel every non-CSS target samples (#130, Law 4).
 *
 * Given a lowered {@link RuntimeWritePlan} and a normalized time `t ∈ [0,1]`, returns the
 * typed leaf value of every animated `cssVar`. It unifies BOTH lowering shapes behind one
 * reader:
 *   - a composed {@link TransitionProgram} (`plan.windows` present) → the per-window
 *     sub-samplers ({@link sampleProgramWindows});
 *   - a single-step plan (`interpretTransition`, no windows) → one implicit window `[0,1]`
 *     carrying `plan.easing` over `plan.properties`.
 *
 * The browser runtime floor (`writeContinuousMap`), the scene / stage / remotion frame
 * samplers, and the worker off-thread sampler ALL call this one function; the declarative
 * CSS `@keyframes` are generated from the SAME `walkWindows` kernel (see
 * `buildKeyframes`). The differential oracle (`motion-parity.test.ts`) is the
 * reader that pins every target to this reference.
 */
export function sampleProgram(plan: RuntimeWritePlan, t: number): readonly ProgramSample[] {
  if (plan.windows && plan.windows.length > 0) return sampleProgramWindows(plan.windows, t);
  const flat: WalkWindow[] = [
    {
      windowStart: 0,
      windowEnd: 1,
      easing: plan.easing,
      tweens: plan.properties.map((p) => ({ key: p.cssVar, from: p.from, to: p.to })),
    },
  ];
  return [...walkWindows(flat, t, 'authored').entries()].map(([cssVar, value]) => ({ cssVar, value }));
}

/**
 * Map a 0-based frame index to the normalized program time `t ∈ [0,1]` that
 * {@link sampleProgram} samples — ENDPOINT-INCLUSIVE: `frame / max(1, totalFrames - 1)`,
 * so `frame = 0 → 0` and `frame = totalFrames - 1 → 1` (the last frame lands exactly on
 * the terminal pose). A degenerate timeline (`totalFrames ≤ 1`) has no span, so its only
 * frame maps to `0`. Out-of-range frames are clamped to `[0,1]`.
 */
export function frameToT(frame: number, totalFrames: number): number {
  return clamp01(frame / Math.max(1, totalFrames - 1));
}

/** Strip the `--czap-` prefix and kebab→snake a `cssVar` into a WGSL struct field name. */
function wgslFieldFromCssVar(cssVar: string): string {
  const stripped = cssVar.startsWith('--') ? cssVar.slice(2) : cssVar;
  const withoutPrefix = stripped.startsWith('czap-') ? stripped.slice(5) : stripped;
  return withoutPrefix.replace(/-/g, '_');
}

/** The uniform payload a `sampleProgram` sample projects to: formatted CSS + GPU-bound WGSL scalars. */
export interface ProgramUniforms {
  /** Every animated `cssVar` formatted for a CSS custom-property / style write. */
  readonly css: Record<string, string>;
  /** GPU-bound numeric props (kind `number`/`opacity`) keyed by their WGSL struct field. */
  readonly wgsl: Record<string, number>;
}

/**
 * Project a `sampleProgram` sample into the `czap:uniform-update` payload — the ONE
 * uniform-building path shared by the `client:motion` floor (`writeContinuousMap`, which
 * adds the DOM writes) and the `@czap/worker` off-thread sampler (which posts it across the
 * worker boundary). Keeping the formatting here (not forked per host) is Law 4: the leaf a
 * browser writes and the leaf a worker posts are byte-identical because they format ONE
 * kernel sample.
 */
export function sampleProgramUniforms(plan: RuntimeWritePlan, t: number): ProgramUniforms {
  const css: Record<string, string> = {};
  const wgsl: Record<string, number> = {};
  for (const { cssVar, value } of sampleProgram(plan, t)) {
    css[cssVar] = formatTypedValue(value);
    if (value.k === 'number' || value.k === 'opacity') {
      wgsl[wgslFieldFromCssVar(cssVar)] = value.v;
    }
  }
  return { css, wgsl };
}
