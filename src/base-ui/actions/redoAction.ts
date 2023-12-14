import { Action, ActionEvents } from '../keyMap.ts';
import { EventEmitter } from '../../utils/event.ts';
import { EditableDiagram } from '../../model-editor/editable-diagram.ts';

declare global {
  interface ActionMap {
    REDO: RedoAction;
  }
}

export class RedoAction extends EventEmitter<ActionEvents> implements Action {
  enabled = false;

  constructor(private readonly diagram: EditableDiagram) {
    super();
    const cb = () => {
      this.enabled = this.diagram.undoManager.redoableActions.length > 0;
      this.emit('actionchanged', { action: this });
    };
    this.diagram.undoManager.on('change', cb);
  }

  execute(): void {
    this.diagram.undoManager.redo();
    this.emit('actiontriggered', { action: this });
  }
}
