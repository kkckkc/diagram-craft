import React from 'react';
import { PathBuilder, unitCoordinateSystem } from '../../geometry/pathBuilder.ts';
import { propsUtils } from '../utils/propsUtils.ts';
import { ShapeControlPoint } from '../ShapeControlPoint.tsx';
import { Point } from '../../geometry/point.ts';
import { Box } from '../../geometry/box.ts';
import { Vector } from '../../geometry/vector.ts';
import { TextPart } from '../TextPart.tsx';
import { round } from '../../utils/math.ts';
import { DiagramNode } from '../../model/diagramNode.ts';
import { CustomPropertyDefinition, NodeDefinition } from '../../model/elementDefinitionRegistry.ts';
import { Diagram } from '../../model/diagram.ts';
import { AbstractReactNodeDefinition } from '../reactNodeDefinition.ts';

declare global {
  interface NodeProps {
    star?: {
      numberOfSides?: number;
      innerRadius?: number;
    };
  }
}

export const Star = (props: Props) => {
  const path = new StarNodeDefinition().getBoundingPathBuilder(props.node).getPath();
  const svgPath = path.asSvgPath();

  return (
    <>
      <path
        d={svgPath}
        x={props.node.bounds.x}
        y={props.node.bounds.y}
        width={props.node.bounds.w}
        height={props.node.bounds.h}
        className={'svg-node__boundary svg-node'}
        {...propsUtils.filterSvgProperties(props)}
      />

      <TextPart
        id={`text_1_${props.node.id}`}
        text={props.nodeProps.text}
        bounds={props.node.bounds}
        onChange={text => {
          props.node.props.text ??= {};
          props.node.props.text.text = text;
          props.node.diagram!.updateElement(props.node);
        }}
        onMouseDown={props.onMouseDown!}
      />

      {props.isSingleSelected && (
        <>
          <ShapeControlPoint
            x={path.segments[1].start.x}
            y={path.segments[1].start.y}
            def={props.node}
            diagram={props.diagram}
            onDrag={(x, y) => {
              const distance = Point.distance({ x, y }, Box.center(props.node.bounds));
              props.node.props.star ??= {};
              props.node.props.star.innerRadius = distance / (props.node.bounds.w / 2);
              return `Inner radius: ${round(props.node.props.star.innerRadius * 100)}%`;
            }}
          />
          <ShapeControlPoint
            x={path.segments[2].start.x}
            y={path.segments[2].start.y}
            def={props.node}
            diagram={props.diagram}
            onDrag={(x, y) => {
              const angle =
                Math.PI / 2 + Vector.angle(Point.subtract({ x, y }, Box.center(props.node.bounds)));
              const numberOfSides = Math.min(100, Math.max(4, Math.ceil((Math.PI * 2) / angle)));

              props.node.props.star ??= {};
              props.node.props.star.numberOfSides = numberOfSides;
              return `Sides: ${numberOfSides}`;
            }}
          />
        </>
      )}
    </>
  );
};

export class StarNodeDefinition extends AbstractReactNodeDefinition {
  constructor() {
    super('star', 'Star');
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const sides = def.props?.star?.numberOfSides ?? 5;
    const innerRadius = def.props?.star?.innerRadius ?? 0.5;

    const theta = Math.PI / 2;
    const dTheta = (2 * Math.PI) / sides;

    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));
    pathBuilder.moveTo(Point.of(0, 1));

    for (let i = 0; i < sides; i++) {
      const angle = theta - (i + 1) * dTheta;

      const iAngle = angle + dTheta / 2;
      pathBuilder.lineTo(Point.of(Math.cos(iAngle) * innerRadius, Math.sin(iAngle) * innerRadius));

      pathBuilder.lineTo(Point.of(Math.cos(angle), Math.sin(angle)));
    }

    return pathBuilder;
  }

  getCustomProperties(def: DiagramNode): Record<string, CustomPropertyDefinition> {
    return {
      numberOfSides: {
        type: 'number',
        label: 'Sides',
        value: def.props?.star?.numberOfSides ?? 5,
        onChange: (value: number) => {
          def.props.star ??= {};
          def.props.star.numberOfSides = value;
        }
      },
      innerRadius: {
        type: 'number',
        label: 'Radius',
        value: round((def.props?.star?.innerRadius ?? 0.5) * 100),
        maxValue: 100,
        unit: '%',
        onChange: (value: number) => {
          def.props.star ??= {};
          def.props.star.innerRadius = value / 100;
        }
      }
    };
  }
}

type Props = {
  def: NodeDefinition;
  node: DiagramNode;
  diagram: Diagram;
  isSelected: boolean;
  isSingleSelected: boolean;
  nodeProps: NodeProps;
} & React.SVGProps<SVGRectElement>;
