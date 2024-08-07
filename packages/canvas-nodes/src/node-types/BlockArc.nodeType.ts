import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import {
  BaseNodeComponent,
  BaseShapeBuildShapeProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { PathBuilder, unitCoordinateSystem } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { CustomPropertyDefinition } from '@diagram-craft/model/elementDefinitionRegistry';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { round } from '@diagram-craft/utils/math';
import { Angle } from '@diagram-craft/geometry/angle';
import { Box } from '@diagram-craft/geometry/box';
import { pointInBounds } from '@diagram-craft/canvas/pointInBounds';
import { registerCustomNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { BoundaryDirection } from '@diagram-craft/model/anchor';

// NodeProps extension for custom props *****************************************

type ExtraProps = {
  innerRadius?: number;
  startAngle?: number;
  endAngle?: number;
};

declare global {
  interface CustomNodeProps {
    blockArc?: ExtraProps;
  }
}

const $defaults = registerCustomNodeDefaults('blockArc', {
  innerRadius: 70,
  startAngle: -40,
  endAngle: 200
});

// Custom properties ************************************************************

const InnerRadius = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'innerRadius',
    label: 'Inner Radius',
    type: 'number',
    value: node.renderProps.custom.blockArc.innerRadius,
    maxValue: 99,
    unit: '%',
    onChange: (value: number, uow: UnitOfWork) => InnerRadius.set(value, node, uow)
  }),

  set: (value: number, node: DiagramNode, uow: UnitOfWork) => {
    if (value >= 99 || value <= 0) return;
    node.updateCustomProps('blockArc', props => (props.innerRadius = round(value)), uow);
  }
};

const StartAngle = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'startAngle',
    label: 'Start Angle',
    type: 'number',
    value: node.renderProps.custom.blockArc.startAngle,
    maxValue: 360,
    unit: '°',
    onChange: (value: number, uow: UnitOfWork) => StartAngle.set(value, node, uow)
  }),

  set: (value: number, node: DiagramNode, uow: UnitOfWork) => {
    if (value >= 360 || value <= -360) return;
    if (value >= $defaults(node.editProps.custom!.blockArc!).endAngle) {
      StartAngle.set(value - 360, node, uow);
      return;
    }
    node.updateCustomProps('blockArc', props => (props.startAngle = round(value)), uow);
  }
};

const EndAngle = {
  definition: (node: DiagramNode): CustomPropertyDefinition => ({
    id: 'endAngle',
    label: 'End Angle',
    type: 'number',
    value: node.renderProps.custom.blockArc.endAngle,
    maxValue: 360,
    unit: '°',
    onChange: (value: number, uow: UnitOfWork) => EndAngle.set(value, node, uow)
  }),

  set: (value: number, node: DiagramNode, uow: UnitOfWork) => {
    if (value >= 360 || value <= -360) return;
    if (value <= $defaults(node.editProps.custom?.blockArc).startAngle) {
      EndAngle.set(value + 360, node, uow);
      return;
    }
    node.updateCustomProps('blockArc', props => (props.endAngle = round(value)), uow);
  }
};

// NodeDefinition and Shape *****************************************************

export class BlockArcNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('blockArc', 'BlockArc', BlockArcNodeDefinition.Shape);
  }

  static Shape = class extends BaseNodeComponent<BlockArcNodeDefinition> {
    buildShape(props: BaseShapeBuildShapeProps, shapeBuilder: ShapeBuilder) {
      super.buildShape(props, shapeBuilder);

      const bounds = props.node.bounds;

      const innerRadius = props.nodeProps.custom.blockArc.innerRadius;
      const startAngle = Angle.toRad(props.nodeProps.custom.blockArc.startAngle);
      const endAngle = Angle.toRad(props.nodeProps.custom.blockArc.endAngle);

      const startInnerX = (innerRadius / 100) * Math.cos(startAngle);
      const startInnerY = (innerRadius / 100) * Math.sin(startAngle);

      const startX = Math.cos(startAngle);
      const startY = Math.sin(startAngle);

      const endX = Math.cos(endAngle);
      const endY = Math.sin(endAngle);

      shapeBuilder.controlPoint(
        pointInBounds(Point.of(startInnerX, startInnerY), bounds),
        (p, uow) => {
          const distance = Point.distance(Box.center(bounds), p);
          const radius = Point.distance(
            Box.center(bounds),
            pointInBounds(Point.of(startX, startY), bounds)
          );

          InnerRadius.set((distance / radius) * 100, props.node, uow);
          return `Inner Radius: ${props.node.renderProps.custom.blockArc.innerRadius}%`;
        }
      );

      shapeBuilder.controlPoint(pointInBounds(Point.of(startX, startY), bounds), (p, uow) => {
        const angle = Math.atan2(Box.center(bounds).y - p.y, p.x - Box.center(bounds).x);
        StartAngle.set(Angle.toDeg(angle), props.node, uow);
        return `Start Angle: ${props.node.renderProps.custom.blockArc.startAngle}°`;
      });

      shapeBuilder.controlPoint(pointInBounds(Point.of(endX, endY), bounds), (p, uow) => {
        const angle = Math.atan2(Box.center(bounds).y - p.y, p.x - Box.center(bounds).x);
        EndAngle.set(Angle.toDeg(angle), props.node, uow);
        return `End Angle: ${props.node.renderProps.custom.blockArc.endAngle}°`;
      });
    }
  };

  protected boundaryDirection(): BoundaryDirection {
    return 'clockwise';
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const innerRadius = def.renderProps.custom.blockArc.innerRadius;
    const startAngle = Angle.toRad(def.renderProps.custom.blockArc.startAngle);
    const endAngle = Angle.toRad(def.renderProps.custom.blockArc.endAngle);

    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));

    const startX = Math.cos(startAngle);
    const startY = Math.sin(startAngle);
    pathBuilder.moveTo(Point.of(startX, startY));

    const endX = Math.cos(endAngle);
    const endY = Math.sin(endAngle);

    const da = Math.abs(endAngle - startAngle);
    const largeArcFlag = da <= Math.PI || da >= 2 * Math.PI ? 0 : 1;

    pathBuilder.arcTo(Point.of(endX, endY), 1, 1, 0, largeArcFlag);

    const endInnerX = (innerRadius / 100) * Math.cos(endAngle);
    const endInnerY = (innerRadius / 100) * Math.sin(endAngle);
    pathBuilder.lineTo(Point.of(endInnerX, endInnerY));

    const startInnerX = (innerRadius / 100) * Math.cos(startAngle);
    const startInnerY = (innerRadius / 100) * Math.sin(startAngle);
    pathBuilder.arcTo(
      Point.of(startInnerX, startInnerY),
      innerRadius / 100,
      innerRadius / 100,
      0,
      largeArcFlag,
      1
    );

    pathBuilder.close();

    return pathBuilder;
  }

  getCustomPropertyDefinitions(node: DiagramNode): Array<CustomPropertyDefinition> {
    return [InnerRadius.definition(node), StartAngle.definition(node), EndAngle.definition(node)];
  }
}
