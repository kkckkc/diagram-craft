import { AbstractDrag } from './dragDropManager.ts';
import { Diagram, excludeLabelNodes, includeAll } from '@diagram-craft/model';
import { UnitOfWork } from '@diagram-craft/model';
import { commitWithUndo } from '@diagram-craft/model';
import { Box, Point, TransformFactory, Vector } from '@diagram-craft/geometry';

export class RotateDrag extends AbstractDrag {
  private readonly uow: UnitOfWork;

  constructor(private readonly diagram: Diagram) {
    super();
    this.uow = new UnitOfWork(this.diagram, true);
  }

  onDrag(coord: Point) {
    const selection = this.diagram.selectionState;
    selection.guides = [];

    const before = selection.bounds;

    const center = Box.center(selection.source.boundingBox);

    const newAngle = Vector.angle(Vector.from(center, coord)) + Math.PI / 2;
    this.diagram.transformElements(
      selection.elements,
      TransformFactory.fromTo(before, { ...selection.bounds, r: newAngle }),
      this.uow,
      selection.getSelectionType() === 'single-label-node' ? includeAll : excludeLabelNodes
    );

    selection.forceRotation(newAngle);

    this.setState({
      label: `angle: ${(Vector.angle(Vector.from(center, coord)) * (180 / Math.PI)).toFixed(0)}°`
    });

    this.uow.notify();

    // This is mainly a performance optimization and not strictly necessary
    this.diagram.selectionState.recalculateBoundingBox();
  }

  onDragEnd(): void {
    const selection = this.diagram.selectionState;

    if (selection.isChanged()) {
      this.uow.stopTracking();
      commitWithUndo(this.uow, 'Rotate');
    }

    selection.forceRotation(undefined);
    selection.rebaseline();
  }
}