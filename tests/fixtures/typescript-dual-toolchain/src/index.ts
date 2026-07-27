export interface QualifiedValue {
  readonly label: string;
}

export function qualifyValue(label: string): QualifiedValue {
  return { label };
}

// Intentional admitted diagnostic: the qualification authority compares its
// identity across both compilers while still comparing emitted declarations.
export const admittedDiagnostic: string = 2322;
