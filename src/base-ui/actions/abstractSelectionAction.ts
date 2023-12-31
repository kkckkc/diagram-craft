import { EventEmitter } from '../../utils/event.ts';
import { Action, ActionEvents } from '../keyMap.ts';
import { Diagram } from '../../model/diagram.ts';

export abstract class AbstractSelectionAction extends EventEmitter<ActionEvents> implements Action {
  enabled = true;

  protected constructor(
    protected readonly diagram: Diagram,
    protected readonly multiple = false
  ) {
    super();
    const cb = () => {
      this.enabled =
        !this.diagram.selectionState.isEmpty() &&
        (!this.multiple || this.diagram.selectionState.elements.length > 1);
      this.emit('actionchanged', { action: this });
    };
    this.diagram.selectionState.on('add', cb);
    this.diagram.selectionState.on('remove', cb);
    cb();
  }

  abstract execute(): void;
}
