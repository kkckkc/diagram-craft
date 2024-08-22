import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { Direction } from '@diagram-craft/geometry/direction';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { Translation } from '@diagram-craft/geometry/transform';
import { Anchor } from '@diagram-craft/model/anchor';
import { Point } from '@diagram-craft/geometry/point';
import { assert } from '@diagram-craft/utils/assert';
import { Box } from '@diagram-craft/geometry/box';
import { DiagramEdge } from '@diagram-craft/model/diagramEdge';
import { newid } from '@diagram-craft/utils/id';
import { AnchorEndpoint } from '@diagram-craft/model/endpoint';
import { createResizeCanvasActionToFit } from '@diagram-craft/model/helpers/canvasResizeHelper';
import { CompoundUndoableAction } from '@diagram-craft/model/undoManager';
import { ElementAddUndoableAction } from '@diagram-craft/model/diagramUndoActions';
import { State } from '@diagram-craft/canvas/keyMap';
import { AbstractSelectionAction, ElementType, MultipleType } from './abstractSelectionAction';
import { Diagram } from '@diagram-craft/model/diagram';
import { Angle } from '@diagram-craft/geometry/angle';
import { RegularLayer } from '@diagram-craft/model/diagramLayer';

const OFFSET = 100;
const SECONDARY_OFFSET = 20;

export const createLinkedNode = (
  node: DiagramNode,
  sourceAnchorId: string,
  direction: Direction
) => {
  const diagram = node.diagram;

  const uow = new UnitOfWork(diagram);
  const newNode = node.duplicate();

  if (direction === 'w') {
    newNode.transform([new Translation({ x: -(OFFSET + node.bounds.w), y: 0 })], uow);
  } else if (direction === 'e') {
    newNode.transform([new Translation({ x: OFFSET + node.bounds.w, y: 0 })], uow);
  } else if (direction === 'n') {
    newNode.transform([new Translation({ x: 0, y: -(OFFSET + node.bounds.h) })], uow);
  } else {
    newNode.transform([new Translation({ x: 0, y: OFFSET + node.bounds.h })], uow);
  }

  // We need to determine the correct anchor before we adjust along the secondary axis
  // ... as we want when creating multiple nodes that all connect to the "same" anchor
  let distance = Number.MAX_SAFE_INTEGER;
  let shortest: Anchor | undefined = undefined;
  for (const anchor of newNode.anchors) {
    const d = Point.distance(
      node._getAnchorPosition(sourceAnchorId),
      newNode._getAnchorPosition(anchor.id)
    );
    if (d < distance) {
      distance = d;
      shortest = anchor;
    }
  }
  assert.present(shortest, 'Could not find shortest anchor');

  const extent = direction === 'w' || direction === 'e' ? 'h' : 'w';
  const coord = direction === 'w' || direction === 'e' ? 'y' : 'x';

  const origBounds = newNode.bounds;

  assert.true(diagram.layers.active instanceof RegularLayer);

  // Move "right"
  let secondaryOffset = 0;
  do {
    const intersectingNode = (diagram.layers.active as RegularLayer).elements.find(e =>
      Box.intersects(e.bounds, newNode.bounds)
    );
    if (!intersectingNode) break;

    secondaryOffset += intersectingNode.bounds[extent] + SECONDARY_OFFSET;

    newNode.setBounds(
      {
        ...newNode.bounds,
        [coord]: origBounds[coord] + secondaryOffset
      },
      uow
    );

    // eslint-disable-next-line no-constant-condition
  } while (true);

  const rightSecondaryOffset = secondaryOffset;
  const rightBounds = newNode.bounds;

  // Move "left"
  newNode.setBounds(origBounds, uow);
  secondaryOffset = 0;
  do {
    const intersectingNode = (diagram.layers.active as RegularLayer).elements.find(e =>
      Box.intersects(e.bounds, newNode.bounds)
    );
    if (!intersectingNode) break;

    secondaryOffset -= intersectingNode.bounds[extent] + SECONDARY_OFFSET;

    newNode.setBounds(
      {
        ...newNode.bounds,
        [coord]: origBounds[coord] + secondaryOffset
      },
      uow
    );

    // eslint-disable-next-line no-constant-condition
  } while (true);

  // Keep the best direction
  if (Math.abs(rightSecondaryOffset) < Math.abs(secondaryOffset)) {
    newNode.setBounds(rightBounds, uow);
  }

  // In case the stylesheet doesn't include an end arrow, we add
  // a default one
  const styles = diagram.document.styles.activeEdgeStylesheet.props;
  const additionalStyles: Partial<EdgeProps> = {};
  if (!styles.arrow?.end?.type) {
    additionalStyles.arrow = { end: { type: 'SQUARE_STICK_ARROW' } };
  }

  const edge = new DiagramEdge(
    newid(),
    new AnchorEndpoint(node, sourceAnchorId),
    new AnchorEndpoint(newNode, shortest.id),
    additionalStyles,
    {
      style: diagram.document.styles.activeEdgeStylesheet.id
    },
    [],
    node.diagram,
    node.layer
  );

  const resizeAction = createResizeCanvasActionToFit(node.diagram, newNode.bounds);
  node.diagram.undoManager.addAndExecute(
    new CompoundUndoableAction([
      new ElementAddUndoableAction([newNode, edge], node.diagram, 'Link to new node'),
      ...(resizeAction ? [resizeAction] : [])
    ])
  );
  uow.commit();

  return newNode;
};

export const createLinkedNodeActions = ({ diagram }: State) => {
  return {
    CREATE_LINKED_NODE_E: new CreateLinkedNodeAction(diagram, 'e'),
    CREATE_LINKED_NODE_W: new CreateLinkedNodeAction(diagram, 'w'),
    CREATE_LINKED_NODE_N: new CreateLinkedNodeAction(diagram, 'n'),
    CREATE_LINKED_NODE_S: new CreateLinkedNodeAction(diagram, 's'),
    CREATE_LINKED_NODE_KEEP_E: new CreateLinkedNodeAction(diagram, 'e', true),
    CREATE_LINKED_NODE_KEEP_W: new CreateLinkedNodeAction(diagram, 'w', true),
    CREATE_LINKED_NODE_KEEP_N: new CreateLinkedNodeAction(diagram, 'n', true),
    CREATE_LINKED_NODE_KEEP_S: new CreateLinkedNodeAction(diagram, 's', true)
  };
};

declare global {
  interface ActionMap extends ReturnType<typeof createLinkedNodeActions> {}
}

export class CreateLinkedNodeAction extends AbstractSelectionAction {
  constructor(
    diagram: Diagram,
    protected readonly direction: Direction,
    protected readonly keepSelection: boolean = false
  ) {
    super(diagram, MultipleType.SingleOnly, ElementType.Node);
  }

  execute(): void {
    if (!this.enabled) return;

    const $sel = this.diagram.selectionState;
    const node = $sel.nodes[0];

    let best: [number, Anchor | undefined] = [Number.MAX_SAFE_INTEGER, undefined];
    for (const anchor of node.anchors) {
      if (anchor.type === 'center') continue;
      const d = Angle.normalize(anchor.normal ?? 0) + node.bounds.r;
      const diff = Math.abs(Direction.toAngle(this.direction, true) - d);
      if (diff < best[0]) {
        best = [diff, anchor];
      }
    }

    assert.present(best[1], 'Could not find best anchor');

    const newNode = createLinkedNode(node, best[1].id, this.direction);

    if (!this.keepSelection) {
      $sel.setElements([newNode]);
    }
  }
}
