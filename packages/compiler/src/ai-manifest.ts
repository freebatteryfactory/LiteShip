/**
 * AI Manifest Compiler -- manifest to tool definitions + grammar validation + system prompts.
 *
 * Takes an {@link AIManifest} describing dimensions, slots, actions, and
 * constraints, and compiles it into tool definitions (function calling
 * format), JSON Schema for validation, and system prompts describing
 * available actions.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Named dimension of UI state (e.g. `theme`, `layout`, `density`).
 *
 * `exclusive: true` means exactly one state is active at a time (a radio
 * group); `exclusive: false` allows multiple concurrent states (a flag set).
 */
export interface AIDimension {
  /** Allowed state names. */
  readonly states: readonly string[];
  /** Currently-active state (must be in `states`). */
  readonly current: string;
  /** Whether only one state can be active at a time. */
  readonly exclusive: boolean;
  /** Human-readable description surfaced to the LLM. */
  readonly description: string;
}

/**
 * Named content slot that accepts a constrained set of content kinds.
 *
 * Slots parameterize a layout — the manifest declares which content kinds
 * (`'image' | 'video' | ...`) each slot will accept.
 */
export interface AISlot {
  /** Content kinds the slot accepts. */
  readonly accepts: readonly string[];
  /** Human-readable description surfaced to the LLM. */
  readonly description: string;
}

/**
 * Named action the LLM may invoke via tool calling.
 *
 * `effects` is a free-form list of effect tags the host uses to route the
 * action's side effects (repaint, persist, etc.).
 */
export interface AIAction {
  /** Parameter schemas keyed by parameter name. */
  readonly params: Record<string, AIParamSchema>;
  /** Effect tags produced when this action runs. */
  readonly effects: readonly string[];
  /** Human-readable description surfaced to the LLM. */
  readonly description: string;
}

/**
 * Parameter schema for a single {@link AIAction} parameter.
 *
 * Mirrors a subset of JSON Schema (`type`, `enum`, `min`, `max`) that is
 * losslessly translatable to both tool-calling and schema validation.
 */
export interface AIParamSchema {
  /** JSON Schema type (`'string'` | `'number'` | `'integer'` | `'boolean'` | `'array'` | `'object'`). */
  readonly type: string;
  /** Permitted enum values. */
  readonly enum?: readonly string[];
  /** Numeric minimum (inclusive). */
  readonly min?: number;
  /** Numeric maximum (inclusive). */
  readonly max?: number;
  /** Whether the parameter must be present; defaults to `false` (JSON Schema convention). */
  readonly required?: boolean;
  /** Human-readable description. */
  readonly description: string;
}

/**
 * Cross-cutting invariant declared alongside the manifest.
 *
 * `condition` is opaque at the type level — hosts evaluate it in their own
 * constraint engine (e.g. a `Plan.Shape` predicate). `message` is what the
 * LLM sees when the constraint is reported as violated.
 */
export interface AIConstraint {
  /** Stable identifier for diagnostics and citation. */
  readonly id: string;
  /** Host-defined condition payload (opaque at this layer). */
  readonly condition: unknown;
  /** Human-readable message for violation reports. */
  readonly message: string;
}

/**
 * Top-level AI manifest describing the UI surface to an LLM.
 *
 * Consumed by {@link AIManifestCompiler.compile} to produce tool
 * definitions, a JSON Schema, and a system prompt in a single pass.
 */
export interface AIManifest {
  /** Manifest schema version. */
  readonly version: string;
  /** State-space dimensions. */
  readonly dimensions: Record<string, AIDimension>;
  /** Content slots. */
  readonly slots: Record<string, AISlot>;
  /** Invocable actions. */
  readonly actions: Record<string, AIAction>;
  /** Cross-cutting invariants. */
  readonly constraints: readonly AIConstraint[];
}

/**
 * Authoring-time manifest input accepted by every {@link AIManifestCompiler}
 * entry point. All fields are optional; omitted fields default to
 * `version: '1.0'`, empty records for `dimensions`/`slots`/`actions`, and
 * `[]` for `constraints`. The normalized {@link AIManifest} (total fields)
 * is what compile results carry.
 */
export interface AIManifestInput {
  /** Manifest schema version; defaults to `'1.0'`. */
  readonly version?: string;
  /** State-space dimensions; defaults to `{}`. */
  readonly dimensions?: Record<string, AIDimension>;
  /** Content slots; defaults to `{}`. */
  readonly slots?: Record<string, AISlot>;
  /** Invocable actions; defaults to `{}`. */
  readonly actions?: Record<string, AIAction>;
  /** Cross-cutting invariants; defaults to `[]`. */
  readonly constraints?: readonly AIConstraint[];
}

/** Normalize an {@link AIManifestInput} into a total {@link AIManifest} with documented defaults. */
function normalizeManifest(input: AIManifestInput): AIManifest {
  // Identity-preserving for already-total manifests so compile results keep
  // referencing the caller's object (and re-normalization is free).
  if (
    input.version !== undefined &&
    input.dimensions !== undefined &&
    input.slots !== undefined &&
    input.actions !== undefined &&
    input.constraints !== undefined
  ) {
    return input as AIManifest;
  }
  return {
    version: input.version ?? '1.0',
    dimensions: input.dimensions ?? {},
    slots: input.slots ?? {},
    actions: input.actions ?? {},
    constraints: input.constraints ?? [],
  };
}

/**
 * Tool definition in the function-calling format emitted by
 * {@link AIManifestCompiler.generateToolDefinitions}.
 *
 * Directly consumable by the Anthropic, OpenAI, and Google tool-calling
 * APIs — fields are a superset of their intersecting requirements.
 */
export interface AIToolDefinition {
  /** Action name. */
  readonly name: string;
  /** Action description (becomes the tool description). */
  readonly description: string;
  /** JSON Schema for parameters. */
  readonly parameters: Record<string, unknown>;
  /** JSON Schema for the return shape. */
  readonly returns: Record<string, unknown>;
}

/**
 * Output of {@link AIManifestCompiler.compile}.
 *
 * Bundles the source manifest together with the three derived artifacts
 * (tools, schema, prompt) so consumers can wire all three into an LLM
 * session in a single step.
 */
export interface AIManifestCompileResult {
  /** The source manifest. */
  readonly manifest: AIManifest;
  /** Tool definitions for function calling. */
  readonly toolDefinitions: readonly AIToolDefinition[];
  /** JSON Schema for validating LLM output. */
  readonly jsonSchema: Record<string, unknown>;
  /** System prompt describing dimensions, slots, actions, and constraints. */
  readonly systemPrompt: string;
}

// ---------------------------------------------------------------------------
// Tool Definition Generation
// ---------------------------------------------------------------------------

/**
 * Convert an AIParamSchema to a JSON Schema property definition.
 */
function paramToJsonSchema(param: AIParamSchema): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: param.type,
    description: param.description,
  };

  if (param.enum && param.enum.length > 0) {
    schema['enum'] = [...param.enum];
  }
  if (param.min !== undefined) {
    schema['minimum'] = param.min;
  }
  if (param.max !== undefined) {
    schema['maximum'] = param.max;
  }

  return schema;
}

/**
 * Generate tool definitions (function calling format) from an AIManifest's actions.
 *
 * @example
 * ```ts
 * import { AIManifestCompiler } from '@czap/compiler';
 *
 * const tools = AIManifestCompiler.generateToolDefinitions(manifest);
 * // tools[0] => { name: 'setTheme', description: '...', parameters: {...}, returns: {...} }
 * ```
 *
 * @param input - The AI manifest containing action definitions (omitted fields take documented defaults)
 * @returns An array of {@link AIToolDefinition} objects
 */
function generateToolDefinitions(input: AIManifestInput): readonly AIToolDefinition[] {
  const manifest = normalizeManifest(input);
  const tools: AIToolDefinition[] = [];

  for (const [actionName, action] of Object.entries(manifest.actions)) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [paramName, param] of Object.entries(action.params)) {
      properties[paramName] = paramToJsonSchema(param);
      if (param.required) {
        required.push(paramName);
      }
    }

    const tool: AIToolDefinition = {
      name: actionName,
      description: action.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
      returns: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          effects: {
            type: 'array',
            items: { type: 'string' },
            description: 'Side effects produced by this action',
          },
        },
      },
    };

    tools.push(tool);
  }

  return tools;
}

// ---------------------------------------------------------------------------
// JSON Schema Generation
// ---------------------------------------------------------------------------

/**
 * Generate a JSON Schema that validates the full manifest structure
 * including all dimensions, slots, and action parameters.
 */
function generateJsonSchema(manifest: AIManifest): Record<string, unknown> {
  const dimensionSchemas: Record<string, unknown> = {};
  for (const [name, dim] of Object.entries(manifest.dimensions)) {
    dimensionSchemas[name] = {
      type: 'string',
      enum: [...dim.states],
      description: dim.description,
    };
  }

  const slotSchemas: Record<string, unknown> = {};
  for (const [name, slot] of Object.entries(manifest.slots)) {
    slotSchemas[name] = {
      type: 'string',
      enum: [...slot.accepts],
      description: slot.description,
    };
  }

  const actionSchemas: Record<string, unknown> = {};
  for (const [name, action] of Object.entries(manifest.actions)) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [paramName, param] of Object.entries(action.params)) {
      properties[paramName] = paramToJsonSchema(param);
      if (param.required) {
        required.push(paramName);
      }
    }

    actionSchemas[name] = {
      type: 'object',
      properties,
      required,
      description: action.description,
    };
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      dimensions: {
        type: 'object',
        properties: dimensionSchemas,
      },
      slots: {
        type: 'object',
        properties: slotSchemas,
      },
      actions: {
        type: 'object',
        properties: actionSchemas,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// System Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate a system prompt describing all available dimensions, slots,
 * actions, and constraints from the manifest.
 *
 * @example
 * ```ts
 * import { AIManifestCompiler } from '@czap/compiler';
 *
 * const prompt = AIManifestCompiler.generateSystemPrompt(manifest);
 * // Use as the system prompt for an LLM conversation
 * ```
 *
 * @param input - The AI manifest to describe (omitted fields take documented defaults)
 * @returns A markdown-formatted system prompt string
 */
function generateSystemPrompt(input: AIManifestInput): string {
  const manifest = normalizeManifest(input);
  const sections: string[] = [];

  sections.push(`You are operating within a constraint-based adaptive rendering system (v${manifest.version}).`);
  sections.push('');

  // Dimensions
  const dimEntries = Object.entries(manifest.dimensions);
  if (dimEntries.length > 0) {
    sections.push('## Dimensions');
    sections.push('The following dimensions define the state space:');
    for (const [name, dim] of dimEntries) {
      const exclusive = dim.exclusive ? ' (exclusive -- only one state active at a time)' : ' (non-exclusive)';
      sections.push(`- **${name}**${exclusive}: ${dim.description}`);
      sections.push(`  States: ${dim.states.join(', ')} (current: ${dim.current})`);
    }
    sections.push('');
  }

  // Slots
  const slotEntries = Object.entries(manifest.slots);
  if (slotEntries.length > 0) {
    sections.push('## Slots');
    sections.push('Content slots available for rendering:');
    for (const [name, slot] of slotEntries) {
      sections.push(`- **${name}**: ${slot.description}`);
      sections.push(`  Accepts: ${slot.accepts.join(', ')}`);
    }
    sections.push('');
  }

  // Actions
  const actionEntries = Object.entries(manifest.actions);
  if (actionEntries.length > 0) {
    sections.push('## Available Actions');
    for (const [name, action] of actionEntries) {
      sections.push(`### ${name}`);
      sections.push(action.description);
      const paramEntries = Object.entries(action.params);
      if (paramEntries.length > 0) {
        sections.push('Parameters:');
        for (const [paramName, param] of paramEntries) {
          const req = param.required ? ' (required)' : ' (optional)';
          let paramDesc = `- \`${paramName}\` (${param.type})${req}: ${param.description}`;
          if (param.enum) paramDesc += ` [${param.enum.join(' | ')}]`;
          if (param.min !== undefined) paramDesc += ` min=${param.min}`;
          if (param.max !== undefined) paramDesc += ` max=${param.max}`;
          sections.push(paramDesc);
        }
      }
      if (action.effects.length > 0) {
        sections.push(`Effects: ${action.effects.join(', ')}`);
      }
      sections.push('');
    }
  }

  // Constraints
  if (manifest.constraints.length > 0) {
    sections.push('## Constraints');
    sections.push('The following constraints must be respected:');
    for (const constraint of manifest.constraints) {
      sections.push(`- [${constraint.id}] ${constraint.message}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Runtime check for a plain, non-null, non-array object whose enumerable keys
 * can be iterated via `Object.entries` as `[string, unknown]`.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow to a plain record, returning an empty record if the input is not one.
 * Used when a missing/invalid sub-object should be treated as "no parameters".
 */
function asPlainRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

/**
 * Validate AI-generated output against a manifest's constraints and schema.
 * Returns `{ valid: true, errors: [] }` or `{ valid: false, errors: [...] }`.
 *
 * @example
 * ```ts
 * import { AIManifestCompiler } from '@czap/compiler';
 *
 * const manifest = {
 *   actions: { setLayout: { params: { cols: { type: 'number', required: true, min: 1, max: 12, description: 'Column count' } }, effects: [], description: 'Set grid layout' } },
 * };
 * const check = AIManifestCompiler.validateAIOutput(
 *   { action: 'setLayout', params: { cols: 3 } },
 *   manifest,
 * );
 * console.log(check.valid); // true
 * ```
 *
 * @param output   - The AI-generated output object to validate
 * @param input - The manifest defining valid actions, dimensions, and slots (omitted fields take documented defaults)
 * @returns An object with `valid` boolean and `errors` array
 */
function validateAIOutput(output: unknown, input: AIManifestInput): { valid: boolean; errors: readonly string[] } {
  const manifest = normalizeManifest(input);
  const errors: string[] = [];

  if (output === null || output === undefined) {
    return { valid: false, errors: ['Output is null or undefined'] };
  }

  if (typeof output !== 'object') {
    return { valid: false, errors: [`Output must be an object, got ${typeof output}`] };
  }

  // If output specifies an action, validate its parameters
  if ('action' in output && typeof output.action === 'string') {
    const actionName = output.action;
    const action = manifest.actions[actionName];
    if (!action) {
      errors.push(`Unknown action '${actionName}'. Available: ${Object.keys(manifest.actions).join(', ')}`);
    } else {
      // Validate parameters
      const params = asPlainRecord('params' in output ? output.params : undefined);
      for (const [paramName, paramSchema] of Object.entries(action.params)) {
        const value = params[paramName];
        if (paramSchema.required && (value === undefined || value === null)) {
          errors.push(`Missing required parameter '${paramName}' for action '${actionName}'`);
          continue;
        }
        if (value === undefined || value === null) continue;

        // Type validation
        if (paramSchema.type === 'number' && typeof value !== 'number') {
          errors.push(`Parameter '${paramName}' must be a number, got ${typeof value}`);
        } else if (paramSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`Parameter '${paramName}' must be a string, got ${typeof value}`);
        } else if (paramSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter '${paramName}' must be a boolean, got ${typeof value}`);
        } else if (paramSchema.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) {
          errors.push(
            `Parameter '${paramName}' must be an integer, got ${typeof value === 'number' ? value : typeof value}`,
          );
        } else if (paramSchema.type === 'array' && !Array.isArray(value)) {
          errors.push(`Parameter '${paramName}' must be an array, got ${typeof value}`);
        } else if (
          paramSchema.type === 'object' &&
          (typeof value !== 'object' || value === null || Array.isArray(value))
        ) {
          errors.push(
            `Parameter '${paramName}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`,
          );
        }

        // Enum validation
        if (paramSchema.enum && !paramSchema.enum.includes(value as string)) {
          errors.push(
            `Parameter '${paramName}' must be one of [${paramSchema.enum.join(', ')}], got '${String(value)}'`,
          );
        }

        // Range validation
        if (typeof value === 'number') {
          if (paramSchema.min !== undefined && value < paramSchema.min) {
            errors.push(`Parameter '${paramName}' must be >= ${paramSchema.min}, got ${value}`);
          }
          if (paramSchema.max !== undefined && value > paramSchema.max) {
            errors.push(`Parameter '${paramName}' must be <= ${paramSchema.max}, got ${value}`);
          }
        }
      }
    }
  }

  // If output specifies dimensions, validate they match manifest dimensions
  if ('dimensions' in output && isPlainRecord(output.dimensions)) {
    for (const [dimName, dimValue] of Object.entries(output.dimensions)) {
      const dimension = manifest.dimensions[dimName];
      if (!dimension) {
        errors.push(`Unknown dimension '${dimName}'. Available: ${Object.keys(manifest.dimensions).join(', ')}`);
        continue;
      }
      if (typeof dimValue === 'string' && !dimension.states.includes(dimValue)) {
        errors.push(`Invalid state '${dimValue}' for dimension '${dimName}'. Valid: ${dimension.states.join(', ')}`);
      }
    }
  }

  // If output specifies slot content, validate accepted types
  if ('slots' in output && isPlainRecord(output.slots)) {
    for (const [slotName, slotValue] of Object.entries(output.slots)) {
      const slot = manifest.slots[slotName];
      if (!slot) {
        errors.push(`Unknown slot '${slotName}'. Available: ${Object.keys(manifest.slots).join(', ')}`);
        continue;
      }
      if (typeof slotValue === 'string' && !slot.accepts.includes(slotValue)) {
        errors.push(`Slot '${slotName}' does not accept '${slotValue}'. Accepted: ${slot.accepts.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

/**
 * Compile an AI manifest into tool definitions, JSON Schema, and a system prompt.
 *
 * Omitted manifest fields are normalized to documented defaults
 * (`version: '1.0'`, empty `dimensions`/`slots`/`actions`, no `constraints`),
 * so a manifest can declare only the surfaces it actually has.
 *
 * @example
 * ```ts
 * import { AIManifestCompiler } from '@czap/compiler';
 *
 * const manifest = {
 *   actions: {
 *     setTheme: {
 *       params: { theme: { type: 'string', enum: ['light', 'dark'], required: true, description: 'Theme' } },
 *       effects: ['theme-change'], description: 'Set the color theme',
 *     },
 *   },
 * };
 * const result = AIManifestCompiler.compile(manifest);
 * console.log(result.toolDefinitions[0].name); // 'setTheme'
 * console.log(result.systemPrompt); // system prompt describing available actions
 * ```
 *
 * @param input - The AI manifest to compile (omitted fields take documented defaults)
 * @returns An {@link AIManifestCompileResult} with tools, schema, and prompt
 */
function compile(input: AIManifestInput): AIManifestCompileResult {
  const manifest = normalizeManifest(input);
  return {
    manifest,
    toolDefinitions: generateToolDefinitions(manifest),
    jsonSchema: generateJsonSchema(manifest),
    systemPrompt: generateSystemPrompt(manifest),
  };
}

/**
 * AI manifest compiler namespace.
 *
 * Compiles an {@link AIManifest} into tool definitions (function calling format),
 * a JSON Schema for validation, and a system prompt describing available
 * dimensions, slots, actions, and constraints. Also provides validation of
 * AI-generated output against the manifest schema.
 *
 * @example
 * ```ts
 * import { AIManifestCompiler } from '@czap/compiler';
 *
 * const manifest = {
 *   dimensions: { theme: { states: ['light', 'dark'], current: 'light', exclusive: true, description: 'Color theme' } },
 *   slots: { hero: { accepts: ['image', 'video'], description: 'Hero section' } },
 *   actions: { setTheme: { params: { theme: { type: 'string', enum: ['light', 'dark'], required: true, description: 'Theme' } }, effects: ['repaint'], description: 'Switch theme' } },
 * };
 * const compiled = AIManifestCompiler.compile(manifest);
 * const valid = AIManifestCompiler.validateAIOutput(
 *   { action: 'setTheme', params: { theme: 'dark' } },
 *   manifest,
 * );
 * ```
 */
export const AIManifestCompiler = {
  compile,
  validateAIOutput,
  generateSystemPrompt,
  generateToolDefinitions,
} as const;

// NOTE (CUT D6): the former `compileAIManifest({ target:'mcp', capsules, commands })`
// free function was an ORPHANED fantasy MCP target — a no-op passthrough backed by
// no registry, the `capsules` field "reserved and ignored". It was deleted. The real
// MCP-app projection now lives in `mcp-app-manifest.ts` (`compileMcpAppManifest`),
// which projects over the actual MCP/MCP-Apps surfaces. The `AIManifest` authoring
// DSL above (dimensions/slots/actions/constraints + the `AICompiler` dispatch arm)
// is unaffected — it is a real authoring language, not a registry projection.
