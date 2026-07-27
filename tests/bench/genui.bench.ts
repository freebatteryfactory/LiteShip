/** Qualified generated-UI validation and identity projection benchmarks. */

import { Bench } from 'tinybench';
import { defineComponentCatalog, renderHash, validateGeneratedUITree, type GeneratedUINode } from '@liteship/genui';

const catalog = defineComponentCatalog({
  version: 'bench-v1',
  components: {
    Root: {
      props: { title: { type: 'string', required: true } },
      children: 'optional',
      allowedChildNames: ['Root', 'Text'],
    },
    Text: { props: { text: { type: 'string', required: true } }, children: 'none' },
  },
});

function buildTree(nodeCount: number): GeneratedUINode {
  const children = Array.from({ length: nodeCount - 1 }, (_, index): GeneratedUINode => ({
    name: 'Text',
    props: { text: `leaf-${index}` },
  }));
  return { name: 'Root', props: { title: 'bench' }, children };
}

const tree = buildTree(1024);
const bench = new Bench({ warmupIterations: 50 });

bench.add('genui validate -- 1024 nodes', () => {
  validateGeneratedUITree(tree, catalog);
});

bench.add('genui renderHash -- 1024 nodes', () => {
  renderHash(tree, catalog);
});

await bench.run();
console.table(bench.table());
