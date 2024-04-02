import { AbstractReactNodeDefinition } from '../reactNodeDefinition.ts';
import { DiagramNode } from '../../model/diagramNode.ts';
import { CustomPropertyDefinition } from '../../model/elementDefinitionRegistry.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { PathBuilder, unitCoordinateSystem } from '../../geometry/pathBuilder.ts';
import { Point } from '../../geometry/point.ts';
import { BaseShape, BaseShapeProps, ShapeBuilder } from '../temp/baseShape.temp.ts';

declare global {
  interface NodeProps {
    trapetzoid?: {
      slantLeft?: number;
      slantRight?: number;
    };
  }
}

export class TrapetzoidNodeDefinition extends AbstractReactNodeDefinition {
  constructor() {
    super('trapetzoid', 'Trapetzoid');
  }

  getCustomProperties(def: DiagramNode): Record<string, CustomPropertyDefinition> {
    return {
      slantLeft: {
        type: 'number',
        label: 'Slant (left)',
        value: def.props.trapetzoid?.slantLeft ?? 5,
        maxValue: 60,
        unit: 'px',
        onChange: (value: number, uow: UnitOfWork) => {
          if (value >= def.bounds.w / 2 || value >= def.bounds.h / 2) return;
          def.updateProps(props => {
            props.trapetzoid ??= {};
            props.trapetzoid.slantLeft = value;
          }, uow);
        }
      },
      slantRight: {
        type: 'number',
        label: 'Slant (right)',
        value: def.props.trapetzoid?.slantRight ?? 5,
        maxValue: 60,
        unit: 'px',
        onChange: (value: number, uow: UnitOfWork) => {
          if (value >= def.bounds.w / 2 || value >= def.bounds.h / 2) return;
          def.updateProps(props => {
            props.trapetzoid ??= {};
            props.trapetzoid.slantRight = value;
          }, uow);
        }
      }
    };
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const slantLeft = def.props.trapetzoid?.slantLeft ?? 5;
    const slantRight = def.props.trapetzoid?.slantRight ?? 5;
    const bnd = def.bounds;

    const cdSl = (slantLeft / bnd.w) * 2;
    const cdSR = (slantRight / bnd.w) * 2;

    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));

    pathBuilder.moveTo(Point.of(-1 + cdSl, 1));
    pathBuilder.lineTo(Point.of(1 - cdSR, 1));
    pathBuilder.lineTo(Point.of(1, -1));
    pathBuilder.lineTo(Point.of(-1, -1));
    pathBuilder.lineTo(Point.of(-1 + cdSl, 1));

    return pathBuilder;
  }
}

export class TrapetzoidComponent extends BaseShape {
  build(props: BaseShapeProps, shapeBuilder: ShapeBuilder) {
    const slantLeft = props.nodeProps.trapetzoid?.slantLeft ?? 5;
    const slantRight = props.nodeProps.trapetzoid?.slantRight ?? 5;

    const boundary = new TrapetzoidNodeDefinition().getBoundingPathBuilder(props.node).getPath();

    shapeBuilder.boundaryPath(boundary);
    shapeBuilder.text();

    shapeBuilder.controlPoint(
      props.node.bounds.x + slantLeft,
      props.node.bounds.y,
      (x, _y, uow) => {
        const distance = Math.max(0, x - props.node.bounds.x);
        if (distance < props.node.bounds.w / 2 && distance < props.node.bounds.h / 2) {
          props.node.updateProps(props => {
            props.trapetzoid ??= {};
            props.trapetzoid.slantLeft = distance;
          }, uow);
        }
        return `Slant: ${props.node.props.trapetzoid?.slantLeft}px`;
      }
    );

    shapeBuilder.controlPoint(
      props.node.bounds.x + props.node.bounds.w - slantRight,
      props.node.bounds.y,
      (x, _y, uow) => {
        const distance = Math.max(0, props.node.bounds.x + props.node.bounds.w - x);
        if (distance < props.node.bounds.w / 2 && distance < props.node.bounds.h / 2) {
          props.node.updateProps(props => {
            props.trapetzoid ??= {};
            props.trapetzoid.slantRight = distance;
          }, uow);
        }
        return `Slant: ${props.node.props.trapetzoid?.slantRight}px`;
      }
    );
  }
}
