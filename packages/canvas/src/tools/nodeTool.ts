import { AbstractTool, BACKGROUND } from '../tool';
import { addHighlight, Highlights, removeHighlight } from '../highlight';
import { ApplicationTriggers } from '../EditableCanvasComponent';
import { Point } from '@diagram-craft/geometry/point';
import { DragDopManager, Modifiers } from '../dragDropManager';
import { Diagram } from '@diagram-craft/model/diagram';
import { isNode } from '@diagram-craft/model/diagramElement';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { commitWithUndo } from '@diagram-craft/model/diagramUndoActions';

declare global {
  interface Tools {
    node: NodeTool;
  }
}

export class NodeTool extends AbstractTool {
  constructor(
    protected readonly diagram: Diagram,
    protected readonly drag: DragDopManager,
    protected readonly svg: SVGSVGElement | null,
    protected readonly applicationTriggers: ApplicationTriggers,
    protected readonly resetTool: () => void
  ) {
    super('node', diagram, drag, svg, applicationTriggers, resetTool);

    if (
      diagram.selectionState.getSelectionType() !== 'single-node' &&
      diagram.selectionState.nodes[0]?.nodeType !== 'generic-path'
    ) {
      diagram.selectionState.clear();
    }

    applicationTriggers.setHelp?.('Select element');
  }

  onMouseOver(id: string, point: Point) {
    super.onMouseOver(id, point);

    const el = this.diagram.lookup(id);
    if (this.diagram.selectionState.elements.includes(el!)) return;
    if (isNode(el)) {
      if (el.nodeType === 'generic-path') {
        addHighlight(el, Highlights.NODE__TOOL_EDIT);
      } else if (el.nodeType !== 'text') {
        addHighlight(el, Highlights.NODE__TOOL_CONVERT);
      }
    }
  }

  onMouseOut(id: string, point: Point) {
    super.onMouseOut(id, point);

    const el = this.diagram.lookup(id);
    if (isNode(el)) {
      removeHighlight(el, Highlights.NODE__TOOL_EDIT);
      removeHighlight(el, Highlights.NODE__TOOL_CONVERT);
    }
  }

  onMouseDown(id: string, _point: Readonly<{ x: number; y: number }>, _modifiers: Modifiers): void {
    const isClickOnBackground = id === BACKGROUND;

    if (isClickOnBackground) {
      this.resetTool();
      return;
    }

    const el = this.diagram.lookup(id);
    if (isNode(el)) {
      if (el.nodeType === 'generic-path') {
        this.diagram.selectionState.setElements([el]);
      } else if (el.nodeType !== 'text') {
        this.applicationTriggers.showDialog!(
          'Convert to path',
          'Do you want to convert this shape to a editable path?',
          'Yes',
          'Cancel',
          () => {
            const uow = new UnitOfWork(this.diagram, true);
            el.convertToPath(uow);
            commitWithUndo(uow, 'Convert to path');
            this.diagram.selectionState.setElements([el]);
          }
        );
      }
    }
  }

  onMouseUp(_point: Readonly<{ x: number; y: number }>): void {
    const current = this.drag.current();
    current?.onDragEnd();
    this.drag.clear();
  }

  onMouseMove(point: Readonly<{ x: number; y: number }>, modifiers: Modifiers): void {
    const current = this.drag.current();
    current?.onDrag(this.diagram.viewBox.toDiagramPoint(point), modifiers);
  }

  onKeyDown(e: KeyboardEvent) {
    const current = this.drag.current();
    current?.onKeyDown?.(e);
  }
}
