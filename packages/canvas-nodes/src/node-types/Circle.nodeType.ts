import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import { DiagramNode } from '@diagram-craft/model/index';
import { BaseShape, BaseShapeBuildProps } from '@diagram-craft/canvas/shape/BaseShape';
import { PathBuilder, Point, unitCoordinateSystem } from '@diagram-craft/geometry/index';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';

export class CircleNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('circle', 'Circle', () => new CircleComponent(this));
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const b = new PathBuilder(unitCoordinateSystem(def.bounds));
    b.moveTo(Point.of(0, -1));
    b.arcTo(Point.of(1, 0), 0.5, 0.5);
    b.arcTo(Point.of(0, 1), 0.5, 0.5);
    b.arcTo(Point.of(-1, 0), 0.5, 0.5);
    b.arcTo(Point.of(0, -1), 0.5, 0.5);
    return b;
  }
}

class CircleComponent extends BaseShape {
  buildShape(props: BaseShapeBuildProps, shapeBuilder: ShapeBuilder) {
    const boundary = this.nodeDefinition.getBoundingPathBuilder(props.node).getPath();

    shapeBuilder.boundaryPath(boundary);
    shapeBuilder.text(this);
  }
}