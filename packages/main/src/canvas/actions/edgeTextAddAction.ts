import { ActionMapFactory, State } from '../../canvas/keyMap.ts';
import { Diagram } from '@diagram-craft/model';
import { precondition } from '@diagram-craft/utils';
import { DiagramNode } from '@diagram-craft/model';
import { newid } from '@diagram-craft/utils';
import { UnitOfWork } from '@diagram-craft/model';
import { CompoundUndoableAction } from '@diagram-craft/model';
import { ElementAddUndoableAction, SnapshotUndoableAction } from '@diagram-craft/model';
import { AbstractAction, ActionContext } from '../../canvas/action.ts';
import { LengthOffsetOnPath } from '@diagram-craft/geometry';

declare global {
  interface ActionMap {
    EDGE_TEXT_ADD: EdgeTextAddAction;
  }
}

export const edgeTextAddActions: ActionMapFactory = (state: State) => ({
  EDGE_TEXT_ADD: new EdgeTextAddAction(state.diagram)
});

export class EdgeTextAddAction extends AbstractAction {
  constructor(private readonly diagram: Diagram) {
    super();
  }

  execute(context: ActionContext): void {
    precondition.is.present(context.point);

    const edge = this.diagram.edgeLookup.get(context.id!);

    precondition.is.present(edge);

    const path = edge.path();
    const projection = path.projectPoint(context.point);

    const uow = new UnitOfWork(this.diagram, true);

    const textNode = new DiagramNode(
      newid(),
      'text',
      {
        ...projection.point,
        r: 0,
        w: 100,
        h: 10
      },
      this.diagram,
      this.diagram.layers.active,
      {
        text: { text: 'Label', align: 'center' },
        labelForEdgeId: edge.id,
        fill: {
          enabled: true,
          color: '#ffffff'
        }
      }
    );

    if (edge.parent) {
      edge.parent.setChildren([...edge.parent.children, textNode], uow);
    }
    edge.layer.addElement(textNode, uow);

    edge.addLabelNode(
      {
        timeOffset: LengthOffsetOnPath.toTimeOffsetOnPath(projection, path).pathT,
        offset: { x: 0, y: 0 },
        id: textNode.id,
        node: textNode,
        type: 'horizontal'
      },
      uow
    );

    uow.updateElement(edge);

    const snapshots = uow.commit();
    this.diagram.undoManager.add(
      new CompoundUndoableAction([
        new ElementAddUndoableAction([textNode], this.diagram),
        new SnapshotUndoableAction(`Add edge text`, this.diagram, snapshots.onlyUpdated())
      ])
    );

    setTimeout(() => {
      this.diagram.nodeDefinitions.get('text').requestFocus(textNode);
    }, 10);
  }
}