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

/** Sample a property's value at a global offset, holding endpoints outside its window. */
function sampleTween(from: TypedValue, to: TypedValue, ws: number, we: number, offset: number): TypedValue {
  if (offset <= ws || we <= ws) return from;
  if (offset >= we) return to;
  return interpolateTyped(from, to, (offset - ws) / (we - ws));
}

/** One CSS property's windows across the whole program (chained same-property steps). */
interface PropWindow {
  readonly property: string;
  readonly from: TypedValue;
  readonly to: TypedValue;
  readonly ws: number;
  readonly we: number;
}

/**
 * Build REAL multi-offset `@keyframes` stops from the composed windows. A stop is
 * emitted at every window boundary; at each stop EVERY property is valued (its
 * animated value inside its own window, its held endpoint outside), so `seq` steps
 * that touch different properties produce distinct stops instead of the pre-W9
 * two-endpoint collapse. Chained same-property windows resolve last-window-wins,
 * matching the runtime sub-sampler.
 */
function buildKeyframes(windows: readonly AbsWindow[], totalMs: number): CssKeyframeStep[] {
  const propWindows: PropWindow[] = [];
  const offsets = new Set<number>([0, 1]);
  for (const w of windows) {
    const ws = normalize(w.startMs, totalMs);
    const we = normalize(w.endMs, totalMs);
    offsets.add(ws);
    offsets.add(we);
    for (const p of w.step.cssProps) propWindows.push({ property: p.property, from: p.from, to: p.to, ws, we });
  }
  const propNames = [...new Set(propWindows.map((p) => p.property))];
  const sortedOffsets = [...offsets].sort((a, b) => a - b);

  return sortedOffsets.map((offset) => {
    const properties: Record<string, string> = {};
    for (const name of propNames) {
      const forProp = propWindows.filter((p) => p.property === name).sort((a, b) => a.ws - b.ws);
      // Last window whose start is at/behind this offset governs; else the first `from`.
      let governing = forProp[0]!;
      for (const pw of forProp) if (pw.ws <= offset) governing = pw;
      properties[name] = formatTypedValue(
        sampleTween(governing.from, governing.to, governing.ws, governing.we, offset),
      );
    }
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

  const first = result.windows[0]!;
  const last = result.windows[result.windows.length - 1]!;

  // Runtime windows — the per-window sub-samplers the floor scrubs.
  const windows: RuntimeWriteWindow[] = result.windows.map((w) => ({
    windowStart: normalize(w.startMs, result.totalMs),
    windowEnd: normalize(w.endMs, result.totalMs),
    properties: w.step.runtimeProps,
    easing: w.step.easing,
  }));

  // Union of runtime props (dedup by cssVar; last window wins for the flat fallback).
  const runtimeByVar = new Map<string, RuntimeWriteProperty>();
  for (const w of result.windows) for (const p of w.step.runtimeProps) runtimeByVar.set(p.cssVar, p);
  const unionRuntime = [...runtimeByVar.values()];

  // Union of CSS tweens (dedup by property name; first occurrence for @property init).
  const cssByProp = new Map<string, MotionPropertyTween>();
  for (const w of result.windows)
    for (const p of w.step.cssProps) if (!cssByProp.has(p.property)) cssByProp.set(p.property, p);
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

/**
 * The per-window runtime sub-sampler — the READER of `RuntimeWritePlan.windows`
 * (Law 16). At global `t`, each window is sampled at its LOCAL eased progress
 * (`clamp01((t - windowStart) / (windowEnd - windowStart))`), interpolated `from`→`to`;
 * later windows overwrite earlier ones per `cssVar`, so a `seq` seam is a defined
 * settled state and a completed program (`t=1`) is the terminal pose. Shared by the
 * `client:motion` floor (`writeContinuousMap`) and its differential tests.
 */
export function sampleProgramWindows(
  windows: readonly RuntimeWriteWindow[],
  t: number,
): ReadonlyArray<{ readonly cssVar: string; readonly value: TypedValue }> {
  const byVar = new Map<string, TypedValue>();
  for (const window of windows) {
    const span = window.windowEnd - window.windowStart;
    const localRaw = span <= 0 ? (t >= window.windowStart ? 1 : 0) : (t - window.windowStart) / span;
    const clamped = localRaw < 0 ? 0 : localRaw > 1 ? 1 : localRaw;
    const eased = sampleRuntimeEasing(window.easing)(clamped);
    for (const prop of window.properties) {
      byVar.set(prop.cssVar, interpolateTyped(prop.from, prop.to, eased));
    }
  }
  return [...byVar.entries()].map(([cssVar, value]) => ({ cssVar, value }));
}
