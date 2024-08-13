import { edgeTextAddActions } from '@diagram-craft/canvas/actions/edgeTextAddAction';
import { clipboardActions } from './actions/clipboardAction';
import { undoActions } from './actions/undoAction';
import { redoActions } from './actions/redoAction';
import { selectAllActions } from './actions/selectAllAction';
import { selectionDeleteActions } from './actions/selectionDeleteAction';
import { selectionRestackActions } from './actions/selectionRestackAction';
import { alignActions } from './actions/alignAction';
import { toggleMagnetTypeActions } from './actions/toggleMagnetTypeAction';
import { distributeActions } from './actions/distributeAction';
import { waypointAddActions } from './actions/waypointAddAction';
import { waypointDeleteActions } from '@diagram-craft/canvas/actions/waypointDeleteAction';
import { toggleRulerActions } from './actions/toggleRulerAction';
import { textActions } from './actions/textActions';
import { edgeFlipActions } from './actions/edgeFlipAction';
import { duplicateActions } from './actions/duplicateAction';
import { dumpActions } from './actions/dumpActions';
import { layerActions } from './actions/layerActions';
import { toolActions } from './actions/toolAction';
import { ActionMapFactory, AppState, KeyMap } from '@diagram-craft/canvas/src/keyMap';
import { groupActions } from './actions/groupAction';
import { tableActions } from '@diagram-craft/canvas/actions/tableActions';
import { selectionMoveActions } from './actions/selectionMoveAction';
import { selectionResizeActions } from './actions/selectionResizeAction';
import { createLinkedNodeActions } from './actions/linkedNodeAction';
import { exportActions } from './actions/exportAction';

export const defaultCanvasActions: ActionMapFactory = (state: AppState) => ({
  ...edgeTextAddActions(state),
  ...tableActions(state),
  ...clipboardActions(state),
  ...undoActions(state),
  ...redoActions(state),
  ...selectAllActions(state),
  ...selectionDeleteActions(state),
  ...selectionMoveActions(state),
  ...selectionResizeActions(state),
  ...createLinkedNodeActions(state),
  ...selectionRestackActions(state),
  ...alignActions(state),
  ...toggleMagnetTypeActions(state),
  ...distributeActions(state),
  ...waypointAddActions(state),
  ...waypointDeleteActions(state),
  ...toggleRulerActions(state),
  ...textActions(state),
  ...edgeFlipActions(state),
  ...duplicateActions(state),
  ...groupActions(state),
  ...dumpActions(state),
  ...exportActions(state),
  ...layerActions(state),
  ...toolActions(state)
});

export const defaultMacKeymap: KeyMap = {
  'M-KeyZ': 'UNDO',
  'M-S-KeyZ': 'REDO',
  'M-KeyC': 'CLIPBOARD_COPY',
  'M-KeyX': 'CLIPBOARD_CUT',
  'M-KeyV': 'CLIPBOARD_PASTE',
  'M-KeyD': 'DUPLICATE',
  'Backspace': 'SELECTION_DELETE',
  'M-Digit1': 'TOOL_MOVE',
  'M-Digit4': 'TOOL_TEXT',
  'M-Digit3': 'TOOL_EDGE',
  'M-Digit6': 'TOOL_PEN',
  'M-Digit7': 'TOOL_NODE',
  'M-KeyO': 'FILE_OPEN',
  'M-KeyE': 'FILE_EXPORT_IMAGE',

  'M-KeyG': 'GROUP_GROUP',
  'M-S-KeyG': 'GROUP_UNGROUP',

  'ArrowRight': 'SELECTION_MOVE_RIGHT',
  'ArrowLeft': 'SELECTION_MOVE_LEFT',
  'ArrowUp': 'SELECTION_MOVE_UP',
  'ArrowDown': 'SELECTION_MOVE_DOWN',
  'S-ArrowRight': 'SELECTION_MOVE_GRID_RIGHT',
  'S-ArrowLeft': 'SELECTION_MOVE_GRID_LEFT',
  'S-ArrowUp': 'SELECTION_MOVE_GRID_UP',
  'S-ArrowDown': 'SELECTION_MOVE_GRID_DOWN',

  'M-ArrowRight': 'SELECTION_RESIZE_RIGHT',
  'M-ArrowLeft': 'SELECTION_RESIZE_LEFT',
  'M-ArrowUp': 'SELECTION_RESIZE_UP',
  'M-ArrowDown': 'SELECTION_RESIZE_DOWN',
  'M-S-ArrowRight': 'SELECTION_RESIZE_GRID_RIGHT',
  'M-S-ArrowLeft': 'SELECTION_RESIZE_GRID_LEFT',
  'M-S-ArrowUp': 'SELECTION_RESIZE_GRID_UP',
  'M-S-ArrowDown': 'SELECTION_RESIZE_GRID_DOWN',

  'A-C-ArrowUp': 'CREATE_LINKED_NODE_N',
  'A-C-ArrowDown': 'CREATE_LINKED_NODE_S',
  'A-C-ArrowLeft': 'CREATE_LINKED_NODE_W',
  'A-C-ArrowRight': 'CREATE_LINKED_NODE_E',
  'A-C-S-ArrowUp': 'CREATE_LINKED_NODE_KEEP_N',
  'A-C-S-ArrowDown': 'CREATE_LINKED_NODE_KEEP_S',
  'A-C-S-ArrowLeft': 'CREATE_LINKED_NODE_KEEP_W',
  'A-C-S-ArrowRight': 'CREATE_LINKED_NODE_KEEP_E'
};
