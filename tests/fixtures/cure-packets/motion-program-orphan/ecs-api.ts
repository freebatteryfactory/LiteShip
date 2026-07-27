export interface Part<T = unknown> {
  readonly name: string;
  readonly schema: { readonly decode: (input: unknown) => T };
}

export interface Entity {
  readonly id: string;
}

export interface World {
  spawn(components?: Readonly<Record<string, unknown>>): string;
  addComponent<T>(id: string, part: Part<T>, value: T): void;
  setComponent(id: string, name: string, value: unknown): void;
  query(...componentNames: readonly string[]): readonly Entity[];
}

export interface System {
  readonly name: string;
  readonly query: readonly string[];
  execute(entities: readonly Entity[], world?: World): void;
}

export interface DenseSystem {
  readonly name: string;
  readonly query: readonly string[];
  readonly _denseSystem: true;
  execute(): void;
}

export declare function createDenseStore(name: string, capacity: number): unknown;
