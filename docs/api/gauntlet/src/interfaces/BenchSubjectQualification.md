[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / BenchSubjectQualification

# Interface: BenchSubjectQualification

Defined in: [gauntlet/src/gates/bench-subjects.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/bench-subjects.ts#L76)

Reachability proof and issues for one benchmark distribution.

## Properties

### issues

> `readonly` **issues**: readonly [`BenchSubjectIssue`](BenchSubjectIssue.md)[]

Defined in: [gauntlet/src/gates/bench-subjects.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/bench-subjects.ts#L77)

***

### qualifyingSutSubjects

> `readonly` **qualifyingSutSubjects**: readonly [`BenchSubject`](BenchSubject.md)[]

Defined in: [gauntlet/src/gates/bench-subjects.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/bench-subjects.ts#L80)

Reachable module/file/WASM SUTs qualify; baselines and intrinsics never do.

***

### reachableSubjects

> `readonly` **reachableSubjects**: readonly [`BenchSubject`](BenchSubject.md)[]

Defined in: [gauntlet/src/gates/bench-subjects.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/bench-subjects.ts#L78)
