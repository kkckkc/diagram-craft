import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import {
  BaseNodeComponent,
  BaseShapeBuildProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { PathBuilder, unitCoordinateSystem } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { CustomPropertyDefinition } from '@diagram-craft/model/elementDefinitionRegistry';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { DeepReadonly } from '@diagram-craft/utils/types';
import { round } from '@diagram-craft/utils/math';

// NodeProps extension for custom props *****************************************

type ExtraProps = {
  size?: number;
  direction?: 'north' | 'south' | 'east' | 'west';
};

declare global {
  interface NodeProps {
    shapeCylinder?: ExtraProps;
  }
}

// Custom properties ************************************************************

const Size = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'size',
    label: 'Size',
    type: 'number',
    value: Size.get(node.props.shapeCylinder),
    maxValue: Number.MAX_VALUE,
    unit: 'px',
    onChange: (value: number, uow: UnitOfWork) => Size.set(value, node, uow)
  }),

  get: (props: DeepReadonly<ExtraProps> | undefined) => props?.size ?? 30,

  set: (value: number, node: DiagramNode, uow: UnitOfWork) => {
    if (value >= node.bounds.h || value <= 0) return;
    node.updateProps(props => (props.shapeCylinder = { size: round(value) }), uow);
  }
};

const Direction = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'direction',
    label: 'Direction',
    type: 'select',
    options: [
      { value: 'north', label: 'North' },
      { value: 'south', label: 'South' },
      { value: 'east', label: 'East' },
      { value: 'west', label: 'West' }
    ],
    value: Direction.get(node.props.shapeCylinder),
    onChange: (value: string, uow: UnitOfWork) => Direction.set(value, node, uow)
  }),

  get: (props: DeepReadonly<ExtraProps> | undefined) => props?.direction ?? 'north',

  set: (value: string, node: DiagramNode, uow: UnitOfWork) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node.updateProps(props => (props.shapeCylinder = { direction: value as any }), uow);
  }
};

// NodeDefinition and Shape *****************************************************

export class CylinderNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('cylinder', 'Cylinder', CylinderNodeDefinition.Shape);
  }

  static Shape = class extends BaseNodeComponent<CylinderNodeDefinition> {
    buildShape(props: BaseShapeBuildProps, shapeBuilder: ShapeBuilder) {
      const boundary = this.def.getBoundingPathBuilder(props.node).getPaths();
      shapeBuilder.boundaryPath(boundary.all());

      const bounds = props.node.bounds;
      const size = Size.get(props.nodeProps.shapeCylinder);

      shapeBuilder.text(this, '1', props.nodeProps.text, {
        x: bounds.x,
        y: bounds.y + size,
        w: bounds.w,
        h: bounds.h - size,
        r: bounds.r
      });

      shapeBuilder.controlPoint(Point.of(bounds.x, bounds.y + size / 2), ({ y }, uow) => {
        const distance = Math.max(0, y - bounds.y);
        Size.set(distance * 2, props.node, uow);
        return `Size: ${Size.get(props.node.props.shapeCylinder)}px`;
      });
    }
  };

  getBoundingPathBuilder(def: DiagramNode) {
    const size = Size.get(def.props.shapeCylinder) / def.bounds.h;

    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));

    pathBuilder.moveTo(Point.of(-1, 1 - size));
    pathBuilder.lineTo(Point.of(-1, -1 + size));
    pathBuilder.arcTo(Point.of(0, -1), 1 / 2, size / 2, 0);
    pathBuilder.arcTo(Point.of(1, -1 + size), 1 / 2, size / 2, 0);
    pathBuilder.lineTo(Point.of(1, 1 - size));
    pathBuilder.arcTo(Point.of(0, 1), 1 / 2, size / 2, 0);
    pathBuilder.arcTo(Point.of(-1, 1 - size), 1 / 2, size / 2, 0);
    pathBuilder.arcTo(Point.of(0, 1 - 2 * size), 1 / 2, size / 2, 0);
    pathBuilder.arcTo(Point.of(1, 1 - size), 1 / 2, size / 2, 0);

    return pathBuilder;
  }

  getCustomProperties(node: DiagramNode): Array<CustomPropertyDefinition> {
    return [Size.definition(node), Direction.definition(node)];
  }
}
