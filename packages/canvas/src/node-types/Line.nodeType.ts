import { ShapeNodeDefinition } from '../shape/shapeNodeDefinition';
import { BaseNodeComponent } from '../components/BaseNodeComponent';
import { PathBuilder, unitCoordinateSystem } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { DiagramNode } from '@diagram-craft/model/diagramNode';

export class LineNodeDefinition extends ShapeNodeDefinition {
  constructor(name = 'line', displayName = 'Line') {
    super(name, displayName, LineComponent);
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));
    pathBuilder.moveTo(Point.of(-1, 0));
    pathBuilder.lineTo(Point.of(1, 0));

    return pathBuilder;
  }
}

class LineComponent extends BaseNodeComponent {}
