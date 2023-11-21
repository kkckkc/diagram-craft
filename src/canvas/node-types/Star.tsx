import { DiagramNode } from '../../model-viewer/diagram.ts';
import React from 'react';
import { Path } from '../../geometry/path.ts';
import { propsUtils } from '../propsUtils.ts';
import { ShapeControlPoint } from '../ShapeControlPoint.tsx';
import { Point } from '../../geometry/point.ts';
import { Box } from '../../geometry/box.ts';
import { Vector } from '../../geometry/vector.ts';

export const Star = (props: Props) => {
  const sides = (props.def.props?.numberOfSides ?? 5) as number;
  const innerRadius = (props.def.props?.innerRadius ?? 0.5) as number;

  const theta = Math.PI / 2;
  const dTheta = (2 * Math.PI) / sides;

  const path = new Path('UNIT', props.def.bounds);
  path.moveTo(0, 1);

  for (let i = 0; i < sides; i++) {
    const angle = theta - (i + 1) * dTheta;

    const iAngle = angle + dTheta / 2;
    path.lineTo(Math.cos(iAngle) * innerRadius, Math.sin(iAngle) * innerRadius);

    path.lineTo(Math.cos(angle), Math.sin(angle));
  }

  const svgPath = path.asSvgPath();

  return (
    <>
      <path
        d={svgPath}
        x={props.def.bounds.pos.x}
        y={props.def.bounds.pos.y}
        width={props.def.bounds.size.w}
        height={props.def.bounds.size.h}
        className={'node'}
        {...propsUtils.except(props, 'def', 'isSelected', 'isSingleSelected')}
      />

      {props.isSingleSelected && (
        <>
          <ShapeControlPoint
            x={path.positionAt(1).x}
            y={path.positionAt(1).y}
            def={props.def}
            onDrag={(x, y) => {
              const distance = Point.distance({ x, y }, Box.center(props.def.bounds));
              props.def.props ??= {};
              props.def.props.innerRadius = distance / (props.def.bounds.size.w / 2);
            }}
          />
          <ShapeControlPoint
            x={path.positionAt(2).x}
            y={path.positionAt(2).y}
            def={props.def}
            onDrag={(x, y) => {
              const angle =
                Math.PI / 2 + Vector.angle(Point.subtract({ x, y }, Box.center(props.def.bounds)));
              const numberOfSides = Math.min(100, Math.max(4, Math.ceil((Math.PI * 2) / angle)));

              props.def.props ??= {};
              props.def.props.numberOfSides = numberOfSides;
            }}
          />
        </>
      )}
    </>
  );
};

type Props = {
  def: DiagramNode;
  isSelected: boolean;
  isSingleSelected: boolean;
} & React.SVGProps<SVGRectElement>;
