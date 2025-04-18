import { useCallback, useEffect, useState } from 'react';
import { SelectionInfoDetails } from './SelectionInfoDetails';
import { NodeInfoDetails } from './NodeInfoDetails';
import { EdgeInfoDetails } from './EdgeInfoDetails';
import { Accordion } from '@diagram-craft/app-components/Accordion';
import { useDiagram } from '../../../application';
import { DiagramInfoDetails } from './DiagramInfoDetails';

export const ObjectInfoToolWindow = () => {
  const diagram = useDiagram();
  const [state, setState] = useState<'selection' | 'node' | 'edge' | undefined>(undefined);
  const [nodeId, setNodeId] = useState<string | undefined>(undefined);
  const [edgeId, setEdgeId] = useState<string | undefined>(undefined);

  const callback = useCallback(() => {
    const selectionType = diagram.selectionState.getSelectionType();
    if (selectionType === 'single-node' || selectionType === 'single-label-node') {
      setState('node');
      setNodeId(diagram.selectionState.nodes[0].id);
    } else if (selectionType === 'single-edge') {
      setState('edge');
      setEdgeId(diagram.selectionState.edges[0].id);
    } else if (!diagram.selectionState.isEmpty()) {
      setState('selection');
    } else {
      setState(undefined);
    }
  }, [diagram.selectionState]);

  useEffect(() => {
    callback();

    diagram.selectionState.on('change', callback);
    return () => {
      diagram.selectionState.off('change', callback);
    };
  }, [callback, diagram.selectionState]);

  return (
    <Accordion.Root disabled={true} type="multiple" defaultValue={['metadata', 'props']}>
      <Accordion.Item value="props">
        <Accordion.ItemHeader>Properties</Accordion.ItemHeader>
        <Accordion.ItemContent>
          {state === 'selection' && <SelectionInfoDetails obj={diagram.selectionState} />}
          {state === 'node' && <NodeInfoDetails obj={diagram.nodeLookup.get(nodeId!)!} />}
          {state === 'edge' && <EdgeInfoDetails obj={diagram.edgeLookup.get(edgeId!)!} />}
          {state === undefined && <DiagramInfoDetails obj={diagram} />}
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
