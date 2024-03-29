import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useRedraw } from '../../react-canvas-viewer/useRedraw.tsx';
import { ApplicationState } from '../../base-ui/ApplicationState.ts';
import { useEventListener } from '../../react-app/hooks/useEventListener.ts';
import { DiagramElement, isNode } from '../../model/diagramElement.ts';
import { useDragDrop } from '../../react-canvas-viewer/DragDropManager.ts';
import { AbstractDrag, Modifiers } from '../../base-ui/drag/dragDropManager.ts';
import { Point } from '../../geometry/point.ts';
import { DiagramNode } from '../../model/diagramNode.ts';
import { DiagramEdge } from '../../model/diagramEdge.ts';
import { newid } from '../../utils/id.ts';
import { ElementAddUndoableAction } from '../../model/diagramUndoActions.ts';
import { EventHelper } from '../../base-ui/eventHelper.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { EdgeEndpointMoveDrag } from '../../base-ui/drag/edgeEndpointMoveDrag.ts';
import { MoveDrag } from '../../base-ui/drag/moveDrag.ts';
import { ApplicationTriggers } from '../EditableCanvas.tsx';
import { VerifyNotReached } from '../../utils/assert.ts';
import { useDiagram } from '../../react-app/context/DiagramContext.tsx';
import { ConnectedEndpoint, FreeEndpoint, isConnected } from '../../model/endpoint.ts';

export type AnchorHandlesApi = {
  repaint: () => void;
};

class AnchorHandleDrag extends AbstractDrag {
  edge: DiagramEdge;
  private delegate: EdgeEndpointMoveDrag;

  constructor(
    private readonly node: DiagramNode,
    private readonly anchorIndex: number,
    private readonly point: Point,
    private readonly applicationTriggers: ApplicationTriggers
  ) {
    super();

    const diagram = this.node.diagram;

    this.edge = new DiagramEdge(
      newid(),
      new ConnectedEndpoint(this.anchorIndex, this.node),
      new FreeEndpoint(diagram.viewBox.toDiagramPoint(this.point)),
      {},
      [],
      diagram,
      diagram.layers.active
    );

    const uow = new UnitOfWork(diagram);
    diagram.layers.active.addElement(this.edge, uow);

    uow.updateElement(this.node);
    uow.commit();

    diagram.selectionState.setElements([this.edge]);

    // TODO: This is the wrong this.element to use
    this.delegate = new EdgeEndpointMoveDrag(diagram, this.edge, 'end');
  }

  onDragEnd() {
    const diagram = this.node.diagram;

    if (
      this.delegate.coord === undefined ||
      Point.distance(this.delegate.coord!, diagram.viewBox.toDiagramPoint(this.point)) < 5
    ) {
      UnitOfWork.execute(this.node.diagram, uow => {
        this.edge.layer.removeElement(this.edge, uow);
        this.edge.detach(uow);
      });
      diagram.selectionState.setElements([]);
      return;
    }

    this.node.diagram.undoManager.add(new ElementAddUndoableAction([this.edge], this.node.diagram));

    // TODO: Need to prevent undoable action from being added twice
    this.delegate.onDragEnd();

    // In case we have connected to an existing node, we don't need to show the popup
    if (isConnected(this.edge.end)) {
      return;
    }

    const startNode = this.edge.start;
    if (!isConnected(startNode)) throw new VerifyNotReached();
    this.applicationTriggers.showNodeLinkPopup?.(
      this.edge.end.position,
      startNode.node!.id,
      this.edge.id
    );
  }

  onDrag(coord: Point, _modifiers: Modifiers): void {
    this.delegate.onDrag(coord);
  }

  onDragEnter(id: string) {
    this.delegate.onDragEnter(id);
  }

  onDragLeave() {
    this.delegate.onDragLeave();
  }
}

// TODO: All these timeouts are a bit ugly... should find a better way
//       to describe the state machine - or somehow subscribe to mouse move events
//       to trigger the hiding of the handles
export const AnchorHandles = forwardRef<AnchorHandlesApi, Props>((props, ref) => {
  const diagram = useDiagram();
  const drag = useDragDrop();
  const [hoverNode, setHoverNode] = useState<DiagramElement | undefined>(undefined);
  const redraw = useRedraw();
  const state = useRef<'background' | 'node' | 'handle'>('background');

  useImperativeHandle(ref, () => {
    return { repaint: redraw };
  });

  const selection = diagram.selectionState;
  const shouldScale = selection.nodes.length === 1 && selection.nodes[0] === hoverNode;

  // eslint-disable-next-line
  let timeout: any | undefined;

  const triggerMouseOut = () => {
    timeout = setTimeout(
      () => {
        if (state.current === 'handle') return;
        setHoverNode(undefined);
        state.current = 'background';
      },
      shouldScale ? 400 : 50
    );
  };

  useEventListener(props.applicationState, 'hoverElementChange', ({ element }) => {
    if (timeout) clearTimeout(timeout);
    if (element === undefined) {
      triggerMouseOut();
    } else {
      timeout = undefined;
      setHoverNode(diagram.lookup(element));
      state.current = 'node';
    }
  });

  useEventListener(diagram.selectionState, 'change', () => {
    if (timeout) clearTimeout(timeout);
    redraw();
  });

  useEventListener(diagram, 'elementRemove', ({ element }) => {
    if (timeout) clearTimeout(timeout);
    if (element === hoverNode) {
      setHoverNode(undefined);
      state.current = 'background';
    }
  });

  const scale = 4;

  if (
    hoverNode === undefined ||
    !isNode(hoverNode) ||
    (drag.current() && !(drag.current() instanceof MoveDrag))
  ) {
    return null;
  }

  const node = hoverNode;

  if (shouldScale || selection.isDragging()) return null;

  const scaledBounds = node.bounds;

  return (
    <>
      {node.anchors.map((a, idx) =>
        a.clip ? null : (
          <g
            key={`${node.id}_${idx}`}
            transform={`translate(${scaledBounds.x + a.point.x * scaledBounds.w} ${
              scaledBounds.y + a.point.y * scaledBounds.h
            })`}
            onMouseOver={() => (state.current = 'handle')}
            onMouseOut={() => {
              state.current = 'background';
              if (timeout) clearTimeout(timeout);
              triggerMouseOut();
            }}
            onMouseDown={e => {
              drag.initiate(
                new AnchorHandleDrag(
                  node,
                  idx,
                  EventHelper.point(e.nativeEvent),
                  props.applicationTriggers
                )
              );
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <path
              className={'svg-anchor-handle'}
              d={`M 0 -${scale}, L ${scale} 0, L 0 ${scale}, L -${scale} 0, L 0 -${scale}`}
            />
          </g>
        )
      )}
    </>
  );
});

type Props = {
  applicationState: ApplicationState;
  applicationTriggers: ApplicationTriggers;
};
