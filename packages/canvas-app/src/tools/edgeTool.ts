import { AbstractTool } from '@diagram-craft/canvas/tool';
import { newid } from '@diagram-craft/utils/index';
import {
  Diagram,
  DiagramEdge,
  ElementAddUndoableAction,
  FreeEndpoint
} from '@diagram-craft/model/index';
import { ApplicationTriggers } from '@diagram-craft/canvas/EditableCanvasComponent';
import { Point } from '@diagram-craft/geometry/index';
import { DragDopManager, Modifiers } from '@diagram-craft/canvas/dragDropManager';

declare global {
  interface Tools {
    edge: EdgeTool;
  }
}

export class EdgeTool extends AbstractTool {
  constructor(
    protected readonly diagram: Diagram,
    protected readonly drag: DragDopManager,
    protected readonly svg: SVGSVGElement | null,
    protected readonly applicationTriggers: ApplicationTriggers,
    protected readonly resetTool: () => void
  ) {
    super('edge', diagram, drag, svg, applicationTriggers, resetTool);
    if (this.svg) this.svg.style.cursor = 'crosshair';
  }

  onMouseDown(_id: string, point: Point, _modifiers: Modifiers) {
    const nd = new DiagramEdge(
      newid(),
      new FreeEndpoint(this.diagram.viewBox.toDiagramPoint(point)),
      new FreeEndpoint(Point.add(this.diagram.viewBox.toDiagramPoint(point), { x: 50, y: 50 })),
      {},
      [],
      this.diagram,
      this.diagram.layers.active
    );

    this.diagram.undoManager.addAndExecute(
      new ElementAddUndoableAction([nd], this.diagram, 'Add edge')
    );

    this.diagram.selectionState.clear();
    this.diagram.selectionState.toggle(nd);

    this.resetTool();
  }

  onMouseUp(_point: Point) {
    // Do nothing
  }

  onMouseMove(_point: Point, _modifiers: Modifiers) {
    // Do nothing
  }
}