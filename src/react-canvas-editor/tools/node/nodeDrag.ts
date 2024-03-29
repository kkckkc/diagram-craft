import { AbstractDrag, Modifiers } from '../../../base-ui/drag/dragDropManager.ts';
import { Point } from '../../../geometry/point.ts';
import { EditablePath } from './editablePath.ts';
import { UnitOfWork } from '../../../model/unitOfWork.ts';
import { commitWithUndo } from '../../../model/diagramUndoActions.ts';

export class NodeDrag extends AbstractDrag {
  private startTime: number;
  private lastPoint: Point | undefined;
  private uow: UnitOfWork;

  constructor(
    private readonly editablePath: EditablePath,
    private readonly waypointIdx: number,
    private readonly startPoint: Point
  ) {
    super();
    this.startTime = new Date().getTime();
    this.uow = new UnitOfWork(this.editablePath.diagram, true);
  }

  onDrag(coord: Point, _modifiers: Modifiers) {
    this.lastPoint = coord;
    this.editablePath.updateWaypoint(this.waypointIdx, {
      point: this.editablePath.toLocalCoordinate(coord)
    });

    this.editablePath.commitToNode(this.uow);
    this.uow.notify();
  }

  onDragEnd(): void {
    // Abort drag if too short and if the drag was too small
    if (
      this.lastPoint === undefined ||
      (new Date().getTime() - this.startTime < 200 &&
        Point.distance(this.lastPoint, this.startPoint) < 5)
    ) {
      return;
    }

    this.editablePath.commitToNode(this.uow);
    commitWithUndo(this.uow, 'Edit path');
  }
}
