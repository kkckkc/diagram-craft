import { Diagram, ResolvedNodeDef } from '../model-viewer/diagram.ts';
import { precondition } from '../utils/assert.ts';
import { Box } from '../geometry/box.ts';
import { Drag, DragActions } from './drag.ts';
import { Point } from '../geometry/point.ts';
import { SelectionState } from '../model-editor/selectionState.ts';

const updatePendingElements = (selection: SelectionState, diagram: Diagram) => {
  precondition.is.present(selection.marquee);

  const pending: ResolvedNodeDef[] = [];
  for (const e of diagram.elements) {
    if (e.type !== 'node') continue;

    // if (Box.intersects(selection.marquee!, e)) {
    if (Box.contains(selection.marquee, e.bounds)) {
      pending.push(e);
    }
  }
  selection.setPendingElements(pending);
};

export const marqueeDragActions: DragActions = {
  onDrag: (coord: Point, drag: Drag, diagram: Diagram, selection: SelectionState) => {
    selection.marquee = Box.normalize({
      pos: drag.offset,
      size: { w: coord.x - drag.offset.x, h: coord.y - drag.offset.y },
      rotation: 0
    });

    updatePendingElements(selection, diagram);
  },
  onDragEnd: (_coord: Point, _drag: Drag, _diagram: Diagram, selection: SelectionState) => {
    if (selection.pendingElements) {
      selection.convertMarqueeToSelection();
    }
  }
};