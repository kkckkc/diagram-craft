import React from 'react';
import { propsUtils } from '../utils/propsUtils.ts';
import { ShapeControlPoint } from '../ShapeControlPoint.tsx';
import { TextPart } from '../TextPart.tsx';
import { DiagramNode } from '../../model/diagramNode.ts';
import { CustomPropertyDefinition } from '../../model/elementDefinitionRegistry.ts';
import { Diagram } from '../../model/diagram.ts';
import { PathBuilder, unitCoordinateSystem } from '../../geometry/pathBuilder.ts';
import { Point } from '../../geometry/point.ts';
import { AbstractReactNodeDefinition } from '../reactNodeDefinition.ts';

declare global {
  interface NodeProps {
    parallelogram?: {
      slant?: number;
    };
  }
}

export const Parallelogram = (props: Props) => {
  const slant = props.node.props?.parallelogram?.slant ?? 5;
  const path = new ParallelogramNodeDefinition().getBoundingPathBuilder(props.node).getPath();
  const svgPath = path.asSvgPath();

  return (
    <>
      <path
        d={svgPath}
        x={props.node.bounds.x}
        y={props.node.bounds.y}
        width={props.node.bounds.w}
        height={props.node.bounds.h}
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
        <ShapeControlPoint
          x={props.node.bounds.x + slant}
          y={props.node.bounds.y}
          diagram={props.diagram}
          def={props.node}
          onDrag={x => {
            const distance = Math.max(0, x - props.node.bounds.x);
            props.node.props.parallelogram ??= {};
            if (distance < props.node.bounds.w / 2 && distance < props.node.bounds.h / 2) {
              props.node.props.parallelogram.slant = distance;
            }
            return `Slant: ${props.node.props.parallelogram.slant}px`;
          }}
        />
      )}
    </>
  );
};

export class ParallelogramNodeDefinition extends AbstractReactNodeDefinition {
  constructor() {
    super('parallelogram', 'Parallelogram');
  }

  getCustomProperties(def: DiagramNode): Record<string, CustomPropertyDefinition> {
    return {
      slant: {
        type: 'number',
        label: 'Slant',
        value: def.props?.parallelogram?.slant ?? 5,
        maxValue: 60,
        unit: 'px',
        onChange: (value: number) => {
          def.props.parallelogram ??= {};
          if (value >= def.bounds.w / 2 || value >= def.bounds.h / 2) return;
          def.props.parallelogram.slant = value;
        }
      }
    };
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const slant = def.props?.parallelogram?.slant ?? 5;
    const bnd = def.bounds;

    const sr = slant / bnd.w;
    const cds = sr * 2;

    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));

    pathBuilder.moveTo(Point.of(-1 + cds, 1));
    pathBuilder.lineTo(Point.of(1, 1));
    pathBuilder.lineTo(Point.of(1 - cds, -1));
    pathBuilder.lineTo(Point.of(-1, -1));
    pathBuilder.lineTo(Point.of(-1 + cds, 1));

    return pathBuilder;
  }
}

type Props = {
  node: DiagramNode;
  diagram: Diagram;
  nodeProps: NodeProps;
  isSelected: boolean;
  isSingleSelected: boolean;
} & React.SVGProps<SVGRectElement>;
