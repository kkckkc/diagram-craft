import { ActionEvents, ToggleAction } from '../keyMap.ts';
import { EventEmitter } from '../../utils/event.ts';
import { EditableDiagram } from '../../model-editor/editable-diagram.ts';

declare global {
  interface ActionMap {
    TOGGLE_RULER: ToggleRulerAction;
  }
}

export class ToggleRulerAction extends EventEmitter<ActionEvents> implements ToggleAction {
  enabled = false;
  state: boolean;

  constructor(private readonly diagram: EditableDiagram) {
    super();
    this.state = diagram.props.ruler?.enabled ?? true;

    this.diagram.on('canvaschanged', () => {
      this.state = diagram.props.ruler?.enabled ?? true;
      this.emit('actionchanged', { action: this });
    });
  }

  execute(): void {
    this.diagram.props.ruler ??= {};
    if (this.state) {
      this.diagram.props.ruler.enabled = false;
    } else {
      this.diagram.props.ruler.enabled = true;
    }
    this.diagram.update();
  }
}
