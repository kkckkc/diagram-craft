import { ActionEvents, ActionMapFactory, State, ToggleAction } from '../keyMap.ts';
import { EventEmitter } from '../../utils/event.ts';
import { Diagram } from '../../model/diagram.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { SnapshotUndoableAction } from '../../model/diagramUndoActions.ts';

declare global {
  interface ActionMap {
    TEXT_BOLD: TextAction;
    TEXT_ITALIC: TextAction;
    TEXT_UNDERLINE: TextDecorationAction;
  }
}

export const textActions: ActionMapFactory = (state: State) => ({
  TEXT_BOLD: new TextAction(state.diagram, 'bold'),
  TEXT_ITALIC: new TextAction(state.diagram, 'italic'),
  TEXT_UNDERLINE: new TextDecorationAction(state.diagram, 'underline')
});

// TODO: Both of these actions must listen for node changes and update state
export class TextAction extends EventEmitter<ActionEvents> implements ToggleAction {
  enabled = false;
  state = false;

  constructor(
    protected readonly diagram: Diagram,
    private readonly prop: 'bold' | 'italic'
  ) {
    super();
    const callback = () => {
      if (diagram.selectionState.isNodesOnly() && diagram.selectionState.nodes.length === 1) {
        this.enabled = diagram.selectionState.nodes[0].nodeType === 'text';
      } else {
        this.enabled = false;
      }
      this.emit('actionchanged', { action: this });
    };
    callback();
    diagram.selectionState.on('add', callback);
    diagram.selectionState.on('remove', callback);
  }

  execute(): void {
    // TODO: Make these undoable
    //       maybe add a property setter helper much like useNodeProperty
    const node = this.diagram.selectionState.nodes[0];

    const uow = new UnitOfWork(this.diagram, true);

    node.updateProps(p => {
      p.text ??= {};
      p.text[this.prop] ??= false;
      p.text[this.prop] = !p.text[this.prop];
    }, uow);

    const snapshots = uow.commit();
    this.diagram.undoManager.add(
      new SnapshotUndoableAction(
        `Text: ${this.prop}`,
        snapshots,
        snapshots.retakeSnapshot(this.diagram),
        this.diagram
      )
    );

    // TODO: Need to add the this state to the undoable action
    this.state = !!node.props.text![this.prop];
    this.emit('actionchanged', { action: this });
  }
}

export class TextDecorationAction extends EventEmitter<ActionEvents> implements ToggleAction {
  enabled = false;
  state = false;

  constructor(
    protected readonly diagram: Diagram,
    private readonly prop: 'underline' | 'line-through' | 'overline'
  ) {
    super();
    const callback = () => {
      if (diagram.selectionState.isNodesOnly() && diagram.selectionState.nodes.length === 1) {
        this.enabled = diagram.selectionState.nodes[0].nodeType === 'text';
      } else {
        this.enabled = false;
      }
      this.emit('actionchanged', { action: this });
    };
    callback();
    diagram.selectionState.on('add', callback);
    diagram.selectionState.on('remove', callback);
  }

  execute(): void {
    // TODO: Make these undoable
    //       maybe add a property setter helper much like useNodeProperty
    const node = this.diagram.selectionState.nodes[0];

    const uow = new UnitOfWork(this.diagram, true);

    node.updateProps(p => {
      p.text ??= {};
      if (p.text.textDecoration === this.prop) {
        p.text.textDecoration = 'none';
      } else {
        p.text.textDecoration = this.prop;
      }
    }, uow);

    const snapshots = uow.commit();
    this.diagram.undoManager.add(
      new SnapshotUndoableAction(
        `Text decoration`,
        snapshots,
        snapshots.retakeSnapshot(this.diagram),
        this.diagram
      )
    );

    // TODO: Need to add the this state to the undoable action
    this.state = node.props.text!.textDecoration === this.prop;
    this.emit('actionchanged', { action: this });
  }
}
