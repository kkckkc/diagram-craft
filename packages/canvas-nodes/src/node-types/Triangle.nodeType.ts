import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import {
  BaseNodeComponent,
  BaseShapeBuildShapeProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { PathBuilder, unitCoordinateSystem } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { registerCustomNodeDefaults } from '@diagram-craft/model/diagramDefaults';

// NodeProps extension for custom props *****************************************

type ExtraProps = {
  direction?: 'north' | 'south' | 'east' | 'west';
};

declare global {
  interface CustomNodeProps {
    triangle?: ExtraProps;
  }
}

registerCustomNodeDefaults('triangle', { direction: 'east' });

// NodeDefinition and Shape *****************************************************

export class TriangleNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('triangle', 'Triangle', TriangleComponent);
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));

    switch (def.renderProps.custom.triangle.direction) {
      case 'east':
        pathBuilder.moveTo(Point.of(1, 0));
        pathBuilder.lineTo(Point.of(-1, -1));
        pathBuilder.lineTo(Point.of(-1, 1));
        pathBuilder.close();
        break;

      case 'west':
        pathBuilder.moveTo(Point.of(-1, 0));
        pathBuilder.lineTo(Point.of(1, -1));
        pathBuilder.lineTo(Point.of(1, 1));
        pathBuilder.close();
        break;

      case 'north':
        pathBuilder.moveTo(Point.of(0, -1));
        pathBuilder.lineTo(Point.of(-1, 1));
        pathBuilder.lineTo(Point.of(1, 1));
        pathBuilder.close();
        break;

      case 'south':
        pathBuilder.moveTo(Point.of(0, 1));
        pathBuilder.lineTo(Point.of(-1, -1));
        pathBuilder.lineTo(Point.of(1, -1));
        pathBuilder.close();
        break;
    }

    return pathBuilder;
  }
}

class TriangleComponent extends BaseNodeComponent {
  buildShape(props: BaseShapeBuildShapeProps, shapeBuilder: ShapeBuilder) {
    const boundary = new TriangleNodeDefinition().getBoundingPathBuilder(props.node).getPaths();

    shapeBuilder.boundaryPath(boundary.all());
    shapeBuilder.text(this);
  }
}
