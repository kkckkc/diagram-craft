import { Box } from '@diagram-craft/geometry/box';
import { Diagram } from '@diagram-craft/model/diagram';
import { Layer } from '@diagram-craft/model/diagramLayer';
import { parseNum } from './utils';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { Style } from './drawioReader';
import { Angle } from '@diagram-craft/geometry/angle';
import { dataURItoBlob } from './blobUtils';
import { HAlign } from '@diagram-craft/model/diagramProps';

const makeShape = (type: string, setProps: (s: Style, p: NodeProps) => void = () => {}) => {
  return async (
    id: string,
    bounds: Box,
    props: NodeProps,
    style: Style,
    diagram: Diagram,
    layer: Layer
  ) => {
    setProps(style, props);
    return new DiagramNode(id, type, bounds, diagram, layer, props);
  };
};

export const parseHexagon = makeShape('hexagon', (style, props) => {
  props.hexagon = {
    size: parseNum(style.size, 25)
  };
});

export const parseStep = makeShape('step', (style, props) => {
  props.step = {
    size: parseNum(style.size, 25)
  };
});

export const parseCloud = makeShape('cloud');

export const parseRhombus = makeShape('diamond');

export const parseParallelogram = makeShape('parallelogram', (style, props) => {
  props.parallelogram = {
    slant: parseNum(style.size, 20)
  };
});

export const parseCylinder = makeShape('cylinder', (style, props) => {
  props.shapeCylinder = {
    size: parseNum(style.size, 8) * 2
  };
});

export const parseProcess = makeShape('process', (style, props) => {
  props.process = {
    size: parseNum(style.size, 0.125) * 100
  };
});

export const parseCurlyBracket = makeShape('curlyBracket', (style, props) => {
  props.shapeCurlyBracket = {
    size: parseNum(style.size, 0.5) * 100
  };
});

export const parseBlockArc = makeShape('blockArc', (style, props) => {
  props.shapeBlockArc = {
    innerRadius: 100 - parseNum(style.arcWidth, 0.5) * 100,
    startAngle: Angle.toDeg(Math.PI / 2 + 2 * Math.PI * (1 - parseNum(style.endAngle, 0.5))),
    endAngle: Angle.toDeg(Math.PI / 2 + 2 * Math.PI * (1 - parseNum(style.startAngle, 0.3)))
  };

  if (props.shapeBlockArc.endAngle === 0) {
    props.shapeBlockArc.endAngle = 359.999;
  }
});

export const parseTriangle = makeShape('triangle', (style, props) => {
  props.shapeTriangle = {
    direction: (style.direction ?? 'east') as 'east' | 'north' | 'south' | 'west'
  };
});

export const parseEllipse = makeShape('circle', (style, props) => {
  props.text!.align = (style.align ?? 'center') as HAlign;
});

export const parseArrow = async (
  id: string,
  bounds: Box,
  props: NodeProps,
  style: Style,
  diagram: Diagram,
  layer: Layer
) => {
  let type = 'arrow-right';
  if (style.direction === 'north') {
    type = 'arrow-up';
  } else if (style.direction === 'south') {
    type = 'arrow-down';
  }

  props.shapeArrow = {};
  props.shapeArrow.notch = parseNum(style.notch, 0);
  props.shapeArrow.y = parseNum(style.dy, 0.2) * 50;
  props.shapeArrow.x = parseNum(style.dx, 20);

  return new DiagramNode(id, type, bounds, diagram, layer, props);
};

export const parseImage = async (
  id: string,
  bounds: Box,
  props: NodeProps,
  style: Style,
  diagram: Diagram,
  layer: Layer
) => {
  const image = style.image ?? '';

  props.fill!.type = 'image';
  props.fill!.color = 'transparent';
  props.text!.valign = 'top';
  props.text!.align = 'center';

  if (!style.imageBorder) {
    props.stroke!.enabled = false;
  } else {
    props.stroke!.color = style.imageBorder;
  }

  if (image.startsWith('data:')) {
    const blob = dataURItoBlob(image);
    const attachment = await diagram.document.attachments.addAttachment(blob);

    props.fill!.image = {
      id: attachment.hash,
      fit: 'contain'
    };
  } else {
    props.fill!.image = {
      url: image,
      fit: 'contain'
    };
  }

  return new DiagramNode(id, 'drawioImage', bounds, diagram, layer, props);
};

export const parseRoundedRect = async (
  id: string,
  bounds: Box,
  props: NodeProps,
  style: Style,
  diagram: Diagram,
  layer: Layer
) => {
  props.roundedRect = {
    radius: (parseNum(style.arcSize, 10) * Math.min(bounds.w, bounds.h)) / 100
  };
  return new DiagramNode(id, 'rounded-rect', bounds, diagram, layer, props);
};
