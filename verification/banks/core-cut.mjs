// The semantic cut: one coordinate, four axes, two authority kinds.
//
// The cut exists because the same four facts were being carried as loose
// siblings in four places, and every mutation here is one way of putting them
// back. If any survives, the cut is a container rather than a constraint.

import { runBank } from '../harness.mjs';

const ID = '00_core/02_identity/types.ts';
const ST = '00_core/08_state/types.ts';
const RT = '00_core/16_runtime/types.ts';
const ED = '00_core/17_editor/types.ts';

const M = [
  // --- the four axes -------------------------------------------------------
  ['the cut forgets which world it belongs to', ST,
    `  readonly world: WorldReference<World>;
  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`,
    `  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`],

  ['the world axis broadens on the committed cut', ST,
    `  readonly world: WorldReference<World>;
  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`,
    `  readonly world: WorldReference;
  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`],

  ['the revision axis broadens on the committed cut', ST,
    `  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`,
    `  readonly revision: RevisionReference;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`],

  ['the evidence axis broadens on the committed cut', ST,
    `  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`,
    `  readonly evidence: EvidenceCutReference;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`],

  ['the cut stops being addressed', ST,
    `  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.`,
    `}

/**
 * The same coordinate over a candidate revision that was never committed.`],

  // --- committed versus draft ----------------------------------------------
  ['the draft cut takes a committed revision reference', ST,
    `  readonly revision: DraftRevisionReference<Revision>;`,
    `  readonly revision: RevisionReference<Revision>;`],

  ['the draft revision reference stops being exact', ID,
    `export type DraftRevisionReference<Id extends RevisionId = RevisionId> = Reference<'draft-revision', Id>;`,
    `export type DraftRevisionReference<Id extends RevisionId = RevisionId> = Reference<'draft-revision', RevisionId>;`],

  ['the draft reference kind collapses into the committed one', ID,
    `export type DraftRevisionReference<Id extends RevisionId = RevisionId> = Reference<'draft-revision', Id>;`,
    `export type DraftRevisionReference<Id extends RevisionId = RevisionId> = Reference<'revision', Id>;`],

  // --- the commit owns it once ---------------------------------------------
  ['the commit reacquires a sibling result revision', ST,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
}`,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
  readonly result: RevisionReference;
}`],

  ['the commit reacquires a sibling time cut', ST,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
}`,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
  readonly time: TimeCut;
}`],

  ['the commit loses its cut entirely', ST,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
}`,
    `  readonly base: RevisionReference;
  readonly result: RevisionReference;
  readonly time: TimeCut;
}`],

  ['the commit accepts a draft cut', ST,
    `  readonly base: RevisionReference;
  readonly cut: SemanticCut;
}`,
    `  readonly base: RevisionReference;
  readonly cut: DraftSemanticCut;
}`],

  // --- the execution request -----------------------------------------------
  ['the execution request reacquires a sibling base revision', RT,
    `  readonly base: SemanticCut;
  readonly generation: TransactionGeneration;`,
    `  readonly base: SemanticCut;
  readonly baseRevision: RevisionReference;
  readonly generation: TransactionGeneration;`],

  ['the execution request reacquires a sibling time cut', RT,
    `  readonly base: SemanticCut;
  readonly generation: TransactionGeneration;`,
    `  readonly base: SemanticCut;
  readonly time: TimeCut;
  readonly generation: TransactionGeneration;`],

  ['the execution request departs from a draft cut', RT,
    `  readonly base: SemanticCut;
  readonly generation: TransactionGeneration;`,
    `  readonly base: DraftSemanticCut;
  readonly generation: TransactionGeneration;`],

  // --- the editor ----------------------------------------------------------
  ['the working overlay goes back to a loose revision and time', ED,
    `  readonly base: SemanticCut;
  readonly entries: readonly OverlayEntry[];
}`,
    `  readonly base: RevisionReference;
  readonly entries: readonly OverlayEntry[];
  readonly time: TimeCut;
}`],

  ['preview hands back a committed cut', ED,
    `  readonly result: DraftSemanticCut;`,
    `  readonly result: SemanticCut;`],

  ['preview loses its cut for a bare draft revision', ED,
    `  readonly result: DraftSemanticCut;`,
    `  readonly result: DraftRevisionReference;`],
];

process.exit(runBank('core-cut', M).clean ? 0 : 1);
