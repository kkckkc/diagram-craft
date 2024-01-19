import { EventEmitter } from '../utils/event.ts';
import { assert } from '../utils/assert.ts';

export type UndoableAction = {
  undo: () => void;
  redo: () => void;

  description: string;
  timestamp?: Date;

  merge?: (other: UndoableAction) => boolean;
};

export class CompoundUndoableAction implements UndoableAction {
  #actions: UndoableAction[];

  constructor(actions?: UndoableAction[]) {
    this.#actions = actions ?? [];
  }

  addAction(action: UndoableAction | undefined) {
    if (!action) {
      console.warn('No undoable action provided');
      return;
    }
    this.#actions.push(action);
  }

  get description() {
    return this.#actions.map(a => a.description).join(', ');
  }

  undo() {
    for (const action of this.#actions.toReversed()) {
      action.undo();
    }
  }

  redo() {
    for (const action of this.#actions) {
      action.redo();
    }
  }

  hasActions() {
    return this.#actions.length > 0;
  }
}

export type UndoEvents = {
  /* Triggered when an action is either executed when added, undone or redone */
  execute: { action: UndoableAction; type: 'undo' | 'redo' };

  /* Triggered when any of the undo or redo stacks change */
  change: Record<string, never>;
};

const MAX_HISTORY = 100;

export class UndoManager extends EventEmitter<UndoEvents> {
  undoableActions: UndoableAction[];
  redoableActions: UndoableAction[];

  constructor() {
    super();

    this.undoableActions = [];
    this.redoableActions = [];
  }

  combine(callback: () => void) {
    const top = this.undoableActions.at(-1);
    callback();

    const actions: UndoableAction[] = [];
    while (this.undoableActions.at(-1) !== top) {
      actions.push(this.undoableActions.pop()!);
    }
    actions.reverse();

    this.add(new CompoundUndoableAction(actions));
  }

  add(action: UndoableAction) {
    if (this.undoableActions.at(-1)?.merge?.(action)) {
      return;
    }

    action.timestamp = new Date();

    this.undoableActions.push(action);
    this.redoableActions = [];
    this.prune();
  }

  addAndExecute(action: UndoableAction) {
    this.add(action);

    action.redo();
    this.emit('execute', { action, type: 'redo' });
  }

  undo() {
    if (this.undoableActions.length === 0) return;

    const action = this.undoableActions.pop();
    assert.present(action);

    this.redoableActions.push(action);
    this.prune();

    action.undo();
    this.emit('execute', { action: action, type: 'undo' });
  }

  redo() {
    if (this.redoableActions.length === 0) return;

    const action = this.redoableActions.pop();
    assert.present(action);

    this.undoableActions.push(action);
    this.prune();

    action.redo();
    this.emit('execute', { action: action, type: 'undo' });
  }

  private prune() {
    this.undoableActions = this.undoableActions.slice(-MAX_HISTORY);
    this.redoableActions = this.redoableActions.slice(-MAX_HISTORY);
    this.emit('change');
  }
}
