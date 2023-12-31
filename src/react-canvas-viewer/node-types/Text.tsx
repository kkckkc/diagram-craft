import React, { useCallback } from 'react';
import { TextPart } from '../TextPart.tsx';
import { DiagramNode } from '../../model/diagramNode.ts';
import { propsUtils } from '../utils/propsUtils.ts';
import { Extent } from '../../geometry/extent.ts';
import { Diagram } from '../../model/diagram.ts';
import { RectNodeDefinition } from './Rect.tsx';

export const Text = (props: Props) => {
  const sizeChangeCallback = useCallback(
    (size: Extent) => {
      const height = size.h;
      const width = size.w;

      props.node.bounds = {
        ...props.node.bounds,
        h: height,
        w: width
      };

      props.node.diagram!.updateElement(props.node);
      props.node.diagram!.selectionState.rebaseline();
    },
    [props.node]
  );

  return (
    <>
      <rect
        x={props.node.bounds.x}
        y={props.node.bounds.y}
        width={props.node.bounds.w}
        height={props.node.bounds.h}
        className={'svg-node svg-node__boundary'}
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
        onSizeChange={sizeChangeCallback}
        onMouseDown={props.onMouseDown!}
      />
    </>
  );
};

export class TextNodeDefinition extends RectNodeDefinition {
  constructor() {
    super('text', 'Test');
  }

  getDefaultProps(_mode: 'picker' | 'canvas'): NodeProps {
    return {
      stroke: {
        enabled: false
      },
      fill: {
        enabled: false
      },
      text: {
        align: 'left',
        text: 'Text',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      }
    };
  }

  getInitialConfig(): { size: Extent } {
    return { size: { w: 100, h: 10 } };
  }
}

type Props = {
  node: DiagramNode;
  diagram: Diagram;
  isSelected: boolean;
  isSingleSelected: boolean;
  nodeProps: NodeProps;
} & React.SVGProps<SVGRectElement>;
