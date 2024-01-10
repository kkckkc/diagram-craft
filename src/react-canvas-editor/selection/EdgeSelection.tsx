import { DiagramEdge } from '../../model/diagramEdge.ts';
import { $c } from '../../utils/classname.ts';
import { EdgeEndpointMoveDrag } from '../../base-ui/drag/edgeEndpointMoveDrag.ts';
import { useDragDrop } from '../../react-canvas-viewer/DragDropManager.ts';
import { useState } from 'react';
import { useEventListener } from '../../react-app/hooks/useEventListener.ts';
import { useDiagram } from '../../react-app/context/DiagramContext.tsx';

export const EdgeSelection = (props: Props) => {
  const diagram = useDiagram();
  const drag = useDragDrop();

  const [isDragging, setIsDragging] = useState(!!drag.current());

  useEventListener(drag, 'dragStart', () => {
    setIsDragging(true);
  });

  useEventListener(drag, 'dragEnd', () => {
    setIsDragging(false);
  });

  return (
    <>
      <circle
        cx={props.edge.startPosition.x}
        cy={props.edge.startPosition.y}
        r="4"
        className={$c('svg-selection__handle-edge', { connected: props.edge.isStartConnected() })}
        onMouseDown={ev => {
          if (ev.button !== 0) return;
          drag.initiate(new EdgeEndpointMoveDrag(diagram, props.edge, 'start'));
          ev.stopPropagation();
        }}
        style={{ pointerEvents: isDragging ? 'none' : undefined }}
      />
      <circle
        cx={props.edge.endPosition.x}
        cy={props.edge.endPosition.y}
        r="4"
        className={$c('svg-selection__handle-edge', { connected: props.edge.isEndConnected() })}
        onMouseDown={ev => {
          if (ev.button !== 0) return;
          drag.initiate(new EdgeEndpointMoveDrag(diagram, props.edge, 'end'));
          ev.stopPropagation();
        }}
        style={{ pointerEvents: isDragging ? 'none' : undefined }}
      />
    </>
  );
};

type Props = {
  edge: DiagramEdge;
};
