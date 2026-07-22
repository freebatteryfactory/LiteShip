/**
 * completion — emit shell completion scripts for bash / zsh / fish.
 * Source the output in your shell rc to get tab-completion for `liteship`
 * verbs and their subcommands.
 *
 * Usage:
 *   liteship completion bash >> ~/.bashrc
 *   liteship completion zsh  >> ~/.zshrc
 *   liteship completion fish > ~/.config/fish/completions/liteship.fish
 *
 * The verb + subcommand lists are PROJECTED from the one canonical command
 * catalog in `@liteship/command` — there is no hand-maintained table to drift from
 * dispatch.ts anymore. Top-level verbs are the distinct first segments of the
 * catalog's dotted command names; subcommands are the remaining segments; the
 * shell argument values come from the `completion` descriptor's input schema.
 *
 * @module
 */

import { COMMAND_CATALOG, commandRegistry } from '@liteship/command';
import { emitError } from '../receipts.js';

/** Distinct top-level verbs, projected from the catalog's command names. */
export const TOP_LEVEL_VERBS: readonly string[] = [...new Set(COMMAND_CATALOG.map((d) => d.name.split('.')[0]!))];

/** Read the shell-argument enum declared on the `completion` descriptor. */
function shellValues(): readonly string[] {
  const shell = commandRegistry.get('completion')?.descriptor.inputSchema.properties?.shell;
  const enumValues = (shell as { enum?: readonly string[] } | undefined)?.enum;
  return enumValues ?? [];
}

/**
 * Subcommands by verb, projected from the catalog. Dotted command names
 * (`scene.compile`) contribute `scene → [compile, …]`; the `completion` verb's
 * subcommands are its shell-argument enum.
 */
export const SUBCOMMANDS: Readonly<Record<string, readonly string[]>> = (() => {
  const byVerb: Record<string, string[]> = {};
  for (const d of COMMAND_CATALOG) {
    const dot = d.name.indexOf('.');
    if (dot === -1) continue;
    const verb = d.name.slice(0, dot);
    const sub = d.name.slice(dot + 1);
    (byVerb[verb] ??= []).push(sub);
  }
  const shells = shellValues();
  if (shells.length > 0) byVerb['completion'] = [...shells];
  return byVerb;
})();

type Shell = 'bash' | 'zsh' | 'fish';

function isShell(s: string | undefined): s is Shell {
  return s === 'bash' || s === 'zsh' || s === 'fish';
}

function bashScript(): string {
  const verbs = TOP_LEVEL_VERBS.join(' ');
  const sceneSubs = (SUBCOMMANDS.scene ?? []).join(' ');
  const assetSubs = (SUBCOMMANDS.asset ?? []).join(' ');
  const capsuleSubs = (SUBCOMMANDS.capsule ?? []).join(' ');
  const shellSubs = (SUBCOMMANDS.completion ?? []).join(' ');
  return `# liteship bash completion
_liteship_completion() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  if [ "\$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( \$(compgen -W "${verbs}" -- "\$cur") )
    return
  fi
  case "\$prev" in
    scene)      COMPREPLY=( \$(compgen -W "${sceneSubs}" -- "\$cur") );;
    asset)      COMPREPLY=( \$(compgen -W "${assetSubs}" -- "\$cur") );;
    capsule)    COMPREPLY=( \$(compgen -W "${capsuleSubs}" -- "\$cur") );;
    completion) COMPREPLY=( \$(compgen -W "${shellSubs}" -- "\$cur") );;
  esac
}
complete -F _liteship_completion liteship
`;
}

function zshScript(): string {
  const verbs = TOP_LEVEL_VERBS.join(' ');
  const sceneSubs = (SUBCOMMANDS.scene ?? []).join(' ');
  const assetSubs = (SUBCOMMANDS.asset ?? []).join(' ');
  const capsuleSubs = (SUBCOMMANDS.capsule ?? []).join(' ');
  const shellSubs = (SUBCOMMANDS.completion ?? []).join(' ');
  return `# liteship zsh completion
_liteship() {
  local -a verbs
  verbs=(${verbs})
  if (( CURRENT == 2 )); then
    _describe -t commands 'liteship verb' verbs
    return
  fi
  case "\${words[2]}" in
    scene)      _values 'scene subcommand' ${sceneSubs} ;;
    asset)      _values 'asset subcommand' ${assetSubs} ;;
    capsule)    _values 'capsule subcommand' ${capsuleSubs} ;;
    completion) _values 'shell' ${shellSubs} ;;
  esac
}
compdef _liteship liteship
`;
}

function fishScript(): string {
  const lines: string[] = ['# liteship fish completion'];
  for (const v of TOP_LEVEL_VERBS) {
    lines.push(`complete -c liteship -f -n '__fish_use_subcommand' -a '${v}'`);
  }
  for (const [verb, subs] of Object.entries(SUBCOMMANDS)) {
    for (const s of subs) {
      lines.push(`complete -c liteship -f -n '__fish_seen_subcommand_from ${verb}' -a '${s}'`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Execute the completion command. Returns a process exit code. */
export function completion(shell: string | undefined): number {
  if (!isShell(shell)) {
    emitError('completion', 'cli/invalid-argument', `expected shell: bash | zsh | fish (got: ${shell ?? '<missing>'})`);
    return 1;
  }
  if (shell === 'bash') process.stdout.write(bashScript());
  else if (shell === 'zsh') process.stdout.write(zshScript());
  else process.stdout.write(fishScript());
  return 0;
}
