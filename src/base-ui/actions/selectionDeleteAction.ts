import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { UndoableAction } from '../../model-editor/undoManager.ts';
import { DiagramElement } from '../../model-viewer/diagramNode.ts';
import { AbstractSelectionAction } from './abstractSelectionAction.ts';
import { Layer } from '../../model-viewer/diagramLayer.ts';

declare global {
  interface ActionMap {
    SELECTION_DELETE: SelectionDeleteAction;
  }
}

class SelectionDeleteUndoableAction implements UndoableAction {
  description = 'Delete elements';
  private layer: Layer;

  constructor(
    private readonly diagram: EditableDiagram,
    private readonly elements: DiagramElement[]
  ) {
    this.layer = this.diagram.layers.active;
  }

  undo(): void {
    for (const element of this.elements) {
      this.layer.addElement(element);
    }
    this.diagram.selectionState.setElements(this.elements);
  }

  redo(): void {
    for (const element of this.elements) {
      element.layer!.removeElement(element);
    }
    this.diagram.selectionState.clear();
  }
}

export class SelectionDeleteAction extends AbstractSelectionAction {
  constructor(protected readonly diagram: EditableDiagram) {
    super(diagram);
  }

  execute(): void {
    if (this.diagram.selectionState.isEmpty()) return;

    this.diagram.undoManager.addAndExecute(
      new SelectionDeleteUndoableAction(this.diagram, this.diagram.selectionState.elements)
    );

    this.emit('actiontriggered', { action: this });
  }
}
