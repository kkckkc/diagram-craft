import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import {
  BaseNodeComponent,
  BaseShapeBuildShapeProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { PathBuilder } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { CustomPropertyDefinition } from '@diagram-craft/model/elementDefinitionRegistry';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { round } from '@diagram-craft/utils/math';
import { LocalCoordinateSystem } from '@diagram-craft/geometry/lcs';
import { Box } from '@diagram-craft/geometry/box';
import { registerCustomNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { Anchor } from '@diagram-craft/model/anchor';

// NodeProps extension for custom props *****************************************

type Direction = 'north' | 'south' | 'east' | 'west';
function assertDirection(value: string): asserts value is Direction {
  if (!['north', 'south', 'east', 'west'].includes(value)) {
    throw new Error(`Invalid direction: ${value}`);
  }
}

type ExtraProps = {
  size?: number;
  direction?: Direction;
};

declare global {
  interface CustomNodeProps {
    cylinder?: ExtraProps;
  }
}

registerCustomNodeDefaults('cylinder', { size: 30, direction: 'north' });

// Custom properties ************************************************************

const Size = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'size',
    label: 'Size',
    type: 'number',
    value: node.renderProps.custom.cylinder.size,
    maxValue: Number.MAX_VALUE,
    unit: 'px',
    onChange: (value: number, uow: UnitOfWork) => Size.set(value, node, uow)
  }),

  set: (value: number, node: DiagramNode, uow: UnitOfWork) => {
    if (value >= node.bounds.h || value <= 0) return;
    node.updateCustomProps('cylinder', props => (props.size = round(value)), uow);
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
    value: node.renderProps.custom.cylinder.direction,
    onChange: (value: string, uow: UnitOfWork) => Direction.set(value, node, uow)
  }),

  set: (value: string, node: DiagramNode, uow: UnitOfWork) => {
    assertDirection(value);
    node.updateCustomProps('cylinder', props => (props.direction = value), uow);
  }
};

// NodeDefinition and Shape *****************************************************

export class CylinderNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('cylinder', 'Cylinder', CylinderNodeDefinition.Shape);
  }

  static Shape = class extends BaseNodeComponent<CylinderNodeDefinition> {
    buildShape(props: BaseShapeBuildShapeProps, shapeBuilder: ShapeBuilder) {
      const boundary = this.def.getBoundingPathBuilder(props.node).getPaths();
      shapeBuilder.boundaryPath(boundary.all());

      const bounds = props.node.bounds;
      const size = props.nodeProps.custom.cylinder.size;

      const direction = props.nodeProps.custom.cylinder.direction;

      let textBounds = { ...bounds, y: bounds.y + size, h: bounds.h - size };
      if (direction === 'east') {
        textBounds = { ...bounds, w: bounds.w - size };
      } else if (direction === 'west') {
        textBounds = { ...bounds, x: bounds.x + size, w: bounds.w - size };
      } else if (direction === 'south') {
        textBounds = { ...bounds, h: bounds.h - size };
      }

      shapeBuilder.text(this, '1', props.node.getText(), props.nodeProps.text, textBounds);

      if (direction === 'north') {
        shapeBuilder.controlPoint(Point.of(bounds.x, bounds.y + size / 2), ({ y }, uow) => {
          const distance = Math.max(0, y - bounds.y);
          Size.set(distance * 2, props.node, uow);
          return `Size: ${props.node.renderProps.custom.cylinder.size}px`;
        });
      }
    }
  };

  getShapeAnchors(_def: DiagramNode): Anchor[] {
    return [
      { id: '1', start: Point.of(0.5, 0), type: 'point', isPrimary: true, normal: -Math.PI / 2 },
      { id: '2', start: Point.of(1, 0.5), type: 'point', isPrimary: true, normal: 0 },
      { id: '3', start: Point.of(0.5, 1), type: 'point', isPrimary: true, normal: Math.PI / 2 },
      { id: '4', start: Point.of(0, 0.5), type: 'point', isPrimary: true, normal: Math.PI },
      { id: 'c', start: Point.of(0.5, 0.5), clip: true, type: 'center' }
    ];
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const direction = def.renderProps.custom.cylinder.direction;

    let size = def.renderProps.custom.cylinder.size / def.bounds.h;
    let bounds: Box = Box.withoutRotation(def.bounds);
    if (direction === 'south') {
      bounds = { ...bounds, r: Math.PI, x: bounds.x + bounds.w, y: bounds.y + bounds.h };
    } else if (direction === 'east') {
      bounds = { ...bounds, r: Math.PI / 2, w: bounds.h, h: bounds.w, x: bounds.x + bounds.w };
      size = def.renderProps.custom.cylinder.size / def.bounds.w;
    } else if (direction === 'west') {
      bounds = {
        ...bounds,
        r: (3 * Math.PI) / 2,
        w: bounds.h,
        h: bounds.w,
        y: bounds.y + bounds.h
      };
      size = def.renderProps.custom.cylinder.size / def.bounds.w;
    }

    const lcs = new LocalCoordinateSystem(bounds, [-1, 1], [-1, 1], true);

    const pathBuilder = new PathBuilder(p => lcs.toGlobal(p));

    pathBuilder.moveTo(Point.of(-1, 1 - size));
    pathBuilder.lineTo(Point.of(-1, -1 + size));
    pathBuilder.arcTo(Point.of(0, -1), 1, size, 0);
    pathBuilder.arcTo(Point.of(1, -1 + size), 1, size, 0);
    pathBuilder.lineTo(Point.of(1, 1 - size));
    pathBuilder.arcTo(Point.of(0, 1), 1, size, 0);
    pathBuilder.arcTo(Point.of(-1, 1 - size), 1, size, 0);
    pathBuilder.arcTo(Point.of(0, 1 - 2 * size), 1, size, 0);
    pathBuilder.arcTo(Point.of(1, 1 - size), 1, size, 0);

    return pathBuilder;
  }

  getCustomPropertyDefinitions(node: DiagramNode): Array<CustomPropertyDefinition> {
    return [Size.definition(node), Direction.definition(node)];
  }
}
