import { ActionMapFactory, State } from '@diagram-craft/canvas/keyMap';
import { Diagram } from '@diagram-craft/model/index';
import { AbstractAction } from '@diagram-craft/canvas/action';
import { serializeDiagramDocument } from '@diagram-craft/model/index';

declare global {
  interface ActionMap {
    FILE_SAVE: SaveAction;
  }
}

export const saveActions: ActionMapFactory = (state: State) => ({
  FILE_SAVE: new SaveAction(state.diagram)
});
export class SaveAction extends AbstractAction {
  constructor(private readonly diagram: Diagram) {
    super();
  }

  execute(): void {
    console.log(JSON.stringify(serializeDiagramDocument(this.diagram.document!), undefined, '  '));
  }
}