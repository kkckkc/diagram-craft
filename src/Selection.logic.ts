import { Box, LocalCoordinateSystem, Point, Vector } from './geometry.ts';
import { Drag, DragActions, ResizeDrag, SelectionState } from './state.ts';
import { LoadedDiagram, MoveAction, NodeDef, ResizeAction, RotateAction } from './model/diagram.ts';
import { assert } from './assert.ts';

const selectionResize = (point: Point, selection: SelectionState, drag: ResizeDrag) => {
  const before = selection.bounds;
  const original = selection.source.boundingBox;

  const lcs = LocalCoordinateSystem.fromBox(selection.bounds);

  const localTarget = Box.asMutableSnapshot(lcs.toLocal(selection.bounds));
  const localOriginal = lcs.toLocal(original);

  const delta = Point.subtract(lcs.toLocal(point), lcs.toLocal(drag.offset));

  switch (drag.type) {
    case 'resize-e':
      localTarget.get('size').w = localOriginal.size.w + delta.x;
      break;
    case 'resize-w':
      localTarget.get('size').w = localOriginal.size.w - delta.x;
      localTarget.get('pos').x = localOriginal.pos.x + delta.x;
      break;
    case 'resize-n':
      localTarget.get('size').h = localOriginal.size.h - delta.y;
      localTarget.get('pos').y = localOriginal.pos.y + delta.y;
      break;
    case 'resize-s':
      localTarget.get('size').h = localOriginal.size.h + delta.y;
      break;
    case 'resize-nw':
      localTarget.get('size').h = localOriginal.size.h - delta.y;
      localTarget.get('pos').y = localOriginal.pos.y + delta.y;
      localTarget.get('size').w = localOriginal.size.w - delta.x;
      localTarget.get('pos').x = localOriginal.pos.x + delta.x;
      break;
    case 'resize-ne':
      localTarget.get('size').h = localOriginal.size.h - delta.y;
      localTarget.get('pos').y = localOriginal.pos.y + delta.y;
      localTarget.get('size').w = localOriginal.size.w + delta.x;
      break;
    case 'resize-se':
      localTarget.get('size').h = localOriginal.size.h + delta.y;
      localTarget.get('size').w = localOriginal.size.w + delta.x;
      break;
    case 'resize-sw':
      localTarget.get('size').h = localOriginal.size.h + delta.y;
      localTarget.get('size').w = localOriginal.size.w - delta.x;
      localTarget.get('pos').x = localOriginal.pos.x + delta.x;
      break;
  }

  selection.bounds = lcs.toGlobal(localTarget.getSnapshot());

  for (const node of selection.elements) {
    NodeDef.transform(node, before, selection.bounds);
  }
};

const selectionRotate = (coord: Point, selection: SelectionState) => {
  const before = selection.bounds;

  const center = Box.center(selection.source.boundingBox);
  selection.bounds = {
    ...selection.bounds,
    rotation: Vector.angle(Vector.from(center, coord))
  };

  for (const node of selection.elements) {
    NodeDef.transform(node, before, selection.bounds);
  }
};

export const rotateDragActions = {
  onDrag: (coord: Point, _drag: Drag, _diagram: LoadedDiagram, selection: SelectionState) => {
    assert.false(selection.isEmpty());
    return selectionRotate(coord, selection);
  },
  onDragEnd: (_coord: Point, _drag: Drag, diagram: LoadedDiagram, selection: SelectionState) => {
    if (selection.isChanged()) {
      diagram.undoManager.add(
        new RotateAction(
          selection.source.elements,
          selection.elements.map(e => e.bounds),
          selection.elements
        )
      );
      selection.rebaseline();
    }
  }
};

export const resizeDragActions: DragActions = {
  onDrag: (coord: Point, drag: Drag, _diagram: LoadedDiagram, selection: SelectionState) => {
    assert.false(selection.isEmpty());
    return selectionResize(coord, selection, drag as ResizeDrag);
  },
  onDragEnd: (_coord: Point, _drag: Drag, diagram: LoadedDiagram, selection: SelectionState) => {
    if (selection.isChanged()) {
      diagram.undoManager.add(
        new ResizeAction(
          selection.source.elements,
          selection.elements.map(e => e.bounds),
          selection.elements
        )
      );
      selection.rebaseline();
    }
  }
};

export const moveDragActions = {
  onDrag: (coord: Point, drag: Drag, _diagram: LoadedDiagram, selection: SelectionState) => {
    assert.false(selection.isEmpty());

    const d = Point.subtract(coord, Point.add(selection.bounds.pos, drag.offset));

    for (const node of selection.elements) {
      const after = node.bounds;
      NodeDef.transform(node, node.bounds, {
        ...after,
        pos: Point.add(after.pos, d)
      });
    }

    selection.recalculateBoundingBox();
  },
  onDragEnd: (_coord: Point, _drag: Drag, diagram: LoadedDiagram, selection: SelectionState) => {
    if (selection.isChanged()) {
      diagram.undoManager.add(
        new MoveAction(
          selection.source.elements,
          selection.elements.map(e => e.bounds),
          selection.elements
        )
      );
      selection.rebaseline();
    }
  }
};
