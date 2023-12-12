import { SelectionAction } from '../keyMap.ts';
import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { VERIFY_NOT_REACHED } from '../../utils/assert.ts';
import { Box } from '../../geometry/box.ts';
import { NodeChangeAction } from '../../model-viewer/actions.ts';
import { DiagramNode } from '../../model-viewer/diagramNode.ts';

declare global {
  interface ActionMap {
    ALIGN_TOP: AlignAction;
    ALIGN_BOTTOM: AlignAction;
    ALIGN_CENTER_HORIZONTAL: AlignAction;
    ALIGN_LEFT: AlignAction;
    ALIGN_RIGHT: AlignAction;
    ALIGN_CENTER_VERTICAL: AlignAction;
  }
}

export class AlignAction extends SelectionAction {
  enabled = false;

  constructor(
    protected readonly diagram: EditableDiagram,
    private readonly mode:
      | 'top'
      | 'bottom'
      | 'right'
      | 'left'
      | 'center-vertical'
      | 'center-horizontal'
  ) {
    super(diagram);
  }

  execute(): void {
    const action = new NodeChangeAction(
      this.diagram.selectionState.nodes,
      this.diagram,
      `Align ${this.mode}`
    );

    const first = this.diagram.selectionState.elements[0];
    if (this.mode === 'top') {
      this.alignY(first.bounds.pos.y, 0);
    } else if (this.mode === 'bottom') {
      this.alignY(first.bounds.pos.y + first.bounds.size.h, 1);
    } else if (this.mode === 'center-horizontal') {
      this.alignY(first.bounds.pos.y + first.bounds.size.h / 2, 0.5);
    } else if (this.mode === 'left') {
      this.alignX(first.bounds.pos.x, 0);
    } else if (this.mode === 'right') {
      this.alignX(first.bounds.pos.x + first.bounds.size.w, 1);
    } else if (this.mode === 'center-vertical') {
      this.alignX(first.bounds.pos.x + first.bounds.size.w / 2, 0.5);
    } else {
      VERIFY_NOT_REACHED();
    }

    this.diagram.undoManager.add(action);
    this.emit('actiontriggered', { action: this });
  }

  // y + h === Y       => y = Y - h       => y = Y - h * offset (offset = 1)
  // y + h / 2 === Y   => y = Y - h / 2   => y = Y - h * offset (offset = 0.5)
  // y === Y           => y = Y           => y = Y - h * offset (offset = 0)
  private alignY(y: number, offset: number) {
    this.diagram.selectionState.elements.forEach(e => {
      e.bounds = Box.withY(e.bounds, y - e.bounds.size.h * offset);
      this.diagram.updateElement(e as DiagramNode);
    });
  }

  // x + w === X       => x = X - w       => x = X - w * offset (offset = 1)
  // x + w / 2 === X   => x = X - w / 2   => x = X - w * offset (offset = 0.5)
  // x === X           => x = X           => x = X - w * offset (offset = 0)
  private alignX(x: number, offset: number) {
    this.diagram.selectionState.elements.forEach(e => {
      e.bounds = Box.withX(e.bounds, x - e.bounds.size.w * offset);
      this.diagram.updateElement(e as DiagramNode);
    });
  }
}
