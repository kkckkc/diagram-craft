import { UndoAction } from './actions/undoAction.ts';
import { RedoAction } from './actions/redoAction.ts';
import { Emitter, EventEmitter } from '../utils/event.ts';
import { SelectAllAction } from './actions/selectAllAction.ts';
import { EditableDiagram } from '../model-editor/editable-diagram.ts';
import { AlignAction } from './actions/alignAction.ts';
import { ToggleMagnetTypeAction } from './actions/toggleMagnetTypeAction.ts';
import { DistributeAction } from './actions/distributeAction.ts';
import { Point } from '../geometry/point.ts';
import { WaypointAddAction } from './actions/waypointAddAction.ts';
import { WaypointDeleteAction } from './actions/waypointDeleteAction.ts';
import { ToggleRulerAction } from './actions/toggleRulerAction.ts';
import { SelectionDeleteAction } from './actions/selectionDeleteAction.ts';
import { SelectionRestackAction } from './actions/selectionRestackAction.ts';

export type ActionEvents = {
  actionchanged: { action: Action };
  actiontriggered: { action: Action };
};

export type ActionContext = {
  point?: Point;
  id?: string;
};

export interface Action extends Emitter<ActionEvents> {
  execute: (context: ActionContext) => void;
  enabled: boolean;
}

export abstract class SelectionAction extends EventEmitter<ActionEvents> implements Action {
  enabled = true;

  protected constructor(protected readonly diagram: EditableDiagram) {
    super();
    const cb = () => {
      this.enabled = !this.diagram.selectionState.isEmpty();
      this.emit('actionchanged', { action: this });
    };
    this.diagram.selectionState.on('add', cb);
    this.diagram.selectionState.on('remove', cb);
  }

  abstract execute(): void;
}

export interface ToggleAction extends Action {
  state: boolean;
}

export type State = {
  diagram: EditableDiagram;
};

export type KeyMap = Record<string, keyof ActionMap>;

declare global {
  interface ActionMap {}
}

export type ActionMapFactory = (state: State) => Partial<ActionMap>;

// TODO: Maybe we can move this entry by entry into each action file?
export const defaultCanvasActions: ActionMapFactory = (state: State) => ({
  UNDO: new UndoAction(state.diagram),
  REDO: new RedoAction(state.diagram),
  SELECT_ALL: new SelectAllAction(state.diagram, 'all'),
  SELECT_ALL_NODES: new SelectAllAction(state.diagram, 'nodes'),
  SELECT_ALL_EDGES: new SelectAllAction(state.diagram, 'edges'),
  SELECTION_DELETE: new SelectionDeleteAction(state.diagram),
  SELECTION_RESTACK_BOTTOM: new SelectionRestackAction(state.diagram, 'bottom'),
  SELECTION_RESTACK_DOWN: new SelectionRestackAction(state.diagram, 'down'),
  SELECTION_RESTACK_TOP: new SelectionRestackAction(state.diagram, 'top'),
  SELECTION_RESTACK_UP: new SelectionRestackAction(state.diagram, 'up'),
  ALIGN_TOP: new AlignAction(state.diagram, 'top'),
  ALIGN_BOTTOM: new AlignAction(state.diagram, 'bottom'),
  ALIGN_CENTER_HORIZONTAL: new AlignAction(state.diagram, 'center-horizontal'),
  ALIGN_LEFT: new AlignAction(state.diagram, 'left'),
  ALIGN_RIGHT: new AlignAction(state.diagram, 'right'),
  ALIGN_CENTER_VERTICAL: new AlignAction(state.diagram, 'center-vertical'),
  TOGGLE_MAGNET_TYPE_SIZE: new ToggleMagnetTypeAction(state.diagram, 'size'),
  TOGGLE_MAGNET_TYPE_GRID: new ToggleMagnetTypeAction(state.diagram, 'grid'),
  TOGGLE_MAGNET_TYPE_CANVAS: new ToggleMagnetTypeAction(state.diagram, 'canvas'),
  TOGGLE_MAGNET_TYPE_NODE: new ToggleMagnetTypeAction(state.diagram, 'node'),
  TOGGLE_MAGNET_TYPE_DISTANCE: new ToggleMagnetTypeAction(state.diagram, 'distance'),
  DISTRIBUTE_HORIZONTAL: new DistributeAction(state.diagram, 'horizontal'),
  DISTRIBUTE_VERTICAL: new DistributeAction(state.diagram, 'vertical'),
  WAYPOINT_ADD: new WaypointAddAction(state.diagram),
  WAYPOINT_DELETE: new WaypointDeleteAction(state.diagram),
  TOGGLE_RULER: new ToggleRulerAction(state.diagram)
});

export const makeActionMap = (...factories: ActionMapFactory[]): ActionMapFactory => {
  return (state: State) => {
    const actions: Partial<ActionMap> = {};
    for (const factory of factories) {
      Object.assign(actions, factory(state));
    }
    return actions;
  };
};

export const defaultMacKeymap: KeyMap = {
  'M-KeyZ': 'UNDO',
  'MS-KeyZ': 'REDO',
  Backspace: 'SELECTION_DELETE'
};

export const findAction = (
  e: KeyboardEvent,
  keyMap: KeyMap,
  actionMap: Partial<ActionMap>
): Action | undefined => {
  const actionKey = `${e.altKey ? 'A' : ''}${e.ctrlKey ? 'C' : ''}${e.metaKey ? 'M' : ''}${
    e.shiftKey ? 'S' : ''
  }-${e.code}`;
  if (actionKey.startsWith('-')) return actionMap[keyMap[actionKey.slice(1)]];
  return actionMap[keyMap[actionKey]];
};

export const executeAction = (
  e: KeyboardEvent,
  actionContext: ActionContext,
  keyMap: KeyMap,
  actionMap: Partial<ActionMap>
): boolean => {
  const action = findAction(e, keyMap, actionMap);
  if (!action || !action.enabled) return false;

  action.execute(actionContext);
  return true;
};

export const findKeyBindings = (action: keyof ActionMap, keyMap: KeyMap): string[] => {
  return Object.entries(keyMap)
    .filter(([, a]) => a === action)
    .map(([k]) => k);
};
