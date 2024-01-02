import React from 'react';
import { DiagramNode } from '../../model/diagramNode.ts';
import { PathBuilder, unitCoordinateSystem } from '../../geometry/pathBuilder.ts';
import { Point } from '../../geometry/point.ts';
import { propsUtils } from '../utils/propsUtils.ts';
import { Edge } from '../Edge.tsx';
import { Node } from '../Node.tsx';
import { Modifiers } from '../../base-ui/drag/dragDropManager.ts';
import { AbstractReactNodeDefinition } from '../reactNodeDefinition.ts';
import { CustomPropertyDefinition, NodeCapability } from '../../model/elementDefinitionRegistry.ts';
import { Angle } from '../../geometry/angle.ts';
import { Box } from '../../geometry/box.ts';
import { Scale, Transform } from '../../geometry/transform.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { DiagramElement } from '../../model/diagramElement.ts';
import { UndoableAction } from '../../model/undoManager.ts';

declare global {
  interface NodeProps {
    container?: {
      autoGrow?: boolean;
      layout?: 'manual' | 'horizontal' | 'vertical';
      gap?: number;
    };
  }
}

export const Container = (props: Props) => {
  const path = new ContainerNodeDefinition().getBoundingPathBuilder(props.node).getPath();
  const svgPath = path.asSvgPath();

  const center = Box.center(props.node.bounds);
  return (
    <>
      <path
        d={svgPath}
        x={props.node.bounds.pos.x}
        y={props.node.bounds.pos.y}
        width={props.node.bounds.size.w}
        height={props.node.bounds.size.h}
        stroke={props.nodeProps.highlight?.includes('drop-target') ? 'red' : 'orange'}
        strokeDasharray={'5,5'}
        fill={'transparent'}
        {...propsUtils.filterSvgProperties(props, 'fill', 'stroke', 'style')}
      />
      {props.node.children.map(child => (
        <g
          key={child.id}
          transform={`rotate(${-Angle.toDeg(props.node.bounds.rotation)} ${center.x} ${center.y})`}
        >
          {child.type === 'node' ? (
            <Node
              def={child}
              diagram={props.node.diagram}
              onDoubleClick={props.childProps.onDoubleClick}
              onMouseDown={props.childProps.onMouseDown}
              onMouseLeave={props.childProps.onMouseLeave}
              onMouseEnter={props.childProps.onMouseEnter}
            />
          ) : (
            <Edge
              def={child}
              diagram={props.node.diagram}
              onDoubleClick={props.childProps.onDoubleClick ?? (() => {})}
              onMouseDown={props.childProps.onMouseDown}
              onMouseLeave={props.childProps.onMouseLeave}
              onMouseEnter={props.childProps.onMouseEnter}
            />
          )}
        </g>
      ))}
    </>
  );
};

export class ContainerNodeDefinition extends AbstractReactNodeDefinition {
  constructor() {
    super('container', 'Container');
  }

  supports(capability: NodeCapability): boolean {
    return ['children'].includes(capability);
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));
    pathBuilder.moveTo(Point.of(-1, 1));
    pathBuilder.lineTo(Point.of(1, 1));
    pathBuilder.lineTo(Point.of(1, -1));
    pathBuilder.lineTo(Point.of(-1, -1));
    pathBuilder.lineTo(Point.of(-1, 1));

    return pathBuilder;
  }

  onTransform(transforms: ReadonlyArray<Transform>, node: DiagramNode, uow: UnitOfWork) {
    if (transforms.find(t => t instanceof Scale)) return;
    for (const child of node.children) {
      child.transform(transforms, uow, true);
    }
  }

  getCustomProperties(node: DiagramNode): Record<string, CustomPropertyDefinition> {
    return {
      autoGrow: {
        type: 'boolean',
        label: 'Grow',
        value: node.props.container?.autoGrow ?? false,
        onChange: (value: boolean) => {
          node.props.container ??= {};
          node.props.container.autoGrow = value;
        }
      },
      layout: {
        type: 'select',
        label: 'Layout',
        value: node.props.container?.layout ?? 'manual',
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' }
        ],
        onChange: (value: string) => {
          node.props.container ??= {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          node.props.container.layout = value as any;
        }
      },
      gap: {
        type: 'number',
        label: 'Gap',
        value: node.props.container?.gap ?? 0,
        unit: 'px',
        onChange: (value: number) => {
          node.props.container ??= {};
          node.props.container.gap = value;
        }
      }
    };
  }

  onDrop(
    node: DiagramNode,
    elements: ReadonlyArray<DiagramElement>,
    _uow: UnitOfWork
  ): UndoableAction | undefined {
    node.diagram.moveElement(elements, node.layer, {
      relation: 'on',
      element: node
    });

    // TODO: Need to return undoable action here
    return undefined;
  }
}

type Props = {
  node: DiagramNode;
  isSelected: boolean;
  isSingleSelected: boolean;
  nodeProps: NodeProps;
  childProps: {
    onMouseDown: (id: string, coord: Point, modifiers: Modifiers) => void;
    onMouseEnter: (id: string) => void;
    onMouseLeave: (id: string) => void;
    onDoubleClick?: (id: string, coord: Point) => void;
  };
} & Omit<
  React.SVGProps<SVGRectElement>,
  'onMouseEnter' | 'onMouseDown' | 'onMouseLeave' | 'onDoubleClick'
>;
