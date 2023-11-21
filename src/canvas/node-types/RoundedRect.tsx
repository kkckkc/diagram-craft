import { DiagramNode } from '../../model-viewer/diagram.ts';
import React from 'react';
import { propsUtils } from '../propsUtils.ts';
import { ShapeControlPoint } from '../ShapeControlPoint.tsx';

declare global {
  interface NodeProps {
    roundedRect?: {
      radius?: number;
    };
  }
}

export const RoundedRect = (props: Props) => {
  const radius = props.def.props?.roundedRect?.radius ?? 10;

  return (
    <>
      <rect
        x={props.def.bounds.pos.x}
        y={props.def.bounds.pos.y}
        width={props.def.bounds.size.w}
        height={props.def.bounds.size.h}
        className={'node'}
        rx={radius}
        ry={radius}
        {...propsUtils.except(props, 'def', 'isSelected', 'isSingleSelected')}
      />

      {props.isSingleSelected && (
        <ShapeControlPoint
          x={props.def.bounds.pos.x + radius}
          y={props.def.bounds.pos.y}
          def={props.def}
          onDrag={x => {
            const distance = Math.max(0, x - props.def.bounds.pos.x);
            props.def.props.roundedRect ??= {};
            props.def.props.roundedRect.radius = distance;
          }}
        />
      )}
    </>
  );
};

type Props = {
  def: DiagramNode;
  isSelected: boolean;
  isSingleSelected: boolean;
} & React.SVGProps<SVGRectElement>;
