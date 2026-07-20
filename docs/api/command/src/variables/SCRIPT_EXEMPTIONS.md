[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SCRIPT\_EXEMPTIONS

# Variable: SCRIPT\_EXEMPTIONS

> `const` **SCRIPT\_EXEMPTIONS**: readonly [`ScriptExemption`](../interfaces/ScriptExemption.md)[]

Defined in: [command/src/checks/script-exemptions.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/script-exemptions.ts#L30)

The exempt root scripts. Grouped by kind (build/gen, component-of-aggregate,
alias, plumbing-helper, workflow, lifecycle) via comment bands; the array is a
flat list the meta-gate folds against the script inventory.
