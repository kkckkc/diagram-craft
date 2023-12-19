import { Drag } from '../drag.ts';
import { Point } from '../../geometry/point.ts';
import { assert } from '../../utils/assert.ts';
import { Box } from '../../geometry/box.ts';
import { Vector } from '../../geometry/vector.ts';
import { TransformFactory } from '../../geometry/transform.ts';
import { RotateAction } from '../../model/diagramUndoActions.ts';
import { Diagram } from '../../model/diagram.ts';

export class RotateDrag implements Drag {
  constructor(private readonly diagram: Diagram) {}

  onDrag(coord: Point) {
    const selection = this.diagram.selectionState;
    assert.false(selection.isEmpty());

    const before = selection.bounds;

    const center = Box.center(selection.source.boundingBox);

    selection.guides = [];

    this.diagram.transformElements(
      selection.elements,
      TransformFactory.fromTo(before, {
        ...selection.bounds,
        rotation: Vector.angle(Vector.from(center, coord)) + Math.PI / 2
      })
    );
    selection.forceRotation(Vector.angle(Vector.from(center, coord)) + Math.PI / 2);

    // This is mainly a performance optimization and not strictly necessary
    this.diagram.selectionState.recalculateBoundingBox();
  }

  onDragEnd(): void {
    const selection = this.diagram.selectionState;
    if (selection.isChanged()) {
      this.diagram.undoManager.add(
        new RotateAction(
          selection.source.elementBoxes,
          selection.nodes.map(e => e.bounds),
          selection.nodes,
          this.diagram,
          'Rotate'
        )
      );
      selection.rebaseline();
    }
  }
}
