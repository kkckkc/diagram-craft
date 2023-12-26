import { DeferedMouseAction } from './types.ts';
import { MutableRefObject, RefObject } from 'react';
import { Point } from '../../geometry/point.ts';
import { DragDopManager, Modifiers } from '../../base-ui/drag/dragDropManager.ts';
import { AbstractTool } from './abstractTool.ts';
import { DiagramNode } from '../../model/diagramNode.ts';
import { newid } from '../../utils/id.ts';
import { NodeAddAction } from '../../model/diagramUndoActions.ts';
import { Diagram } from '../../model/diagram.ts';

export class TextTool extends AbstractTool {
  constructor(
    protected readonly diagram: Diagram,
    protected readonly drag: DragDopManager,
    protected readonly svgRef: RefObject<SVGSVGElement>,
    protected readonly deferedMouseAction: MutableRefObject<DeferedMouseAction | undefined>,
    protected readonly resetTool: () => void
  ) {
    super(diagram, drag, svgRef, deferedMouseAction, resetTool);
    this.svgRef.current!.style.cursor = 'text';
  }

  onMouseDown(_id: string, _point: Point, _modifiers: Modifiers) {
    // Do nothing
  }

  onMouseUp(_point: Point) {
    const nodeType = 'text';
    const nodeDef = this.diagram.nodeDefinitions.get(nodeType);

    const nd = new DiagramNode(
      newid(),
      nodeType,
      {
        pos: this.diagram.viewBox.toDiagramPoint(_point),
        size: nodeDef.getInitialConfig().size,
        rotation: 0
      },
      undefined,
      nodeDef.getDefaultProps('canvas'),
      this.diagram,
      this.diagram.layers.active
    );

    this.diagram.undoManager.addAndExecute(new NodeAddAction([nd], this.diagram, 'Add text'));

    this.diagram.selectionState.clear();
    this.diagram.selectionState.toggle(nd);

    setTimeout(() => {
      this.diagram.nodeDefinitions.get(nodeType)?.requestFocus(nd);
    }, 10);

    this.resetTool();
  }

  onMouseMove(_point: Point, _modifiers: Modifiers) {
    // Do nothing
  }
}
