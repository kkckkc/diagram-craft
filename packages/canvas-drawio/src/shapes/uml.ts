import {
  loadStencilsFromYaml,
  MakeStencilNodeOptsProps,
  NodeDefinitionRegistry,
  registerStencil,
  StencilPackage
} from '@diagram-craft/model/elementDefinitionRegistry';
import { UmlModuleNodeDefinition } from './umlModule';
import { Box } from '@diagram-craft/geometry/box';
import { shapeParsers, Style } from '../drawioReader';
import { Diagram } from '@diagram-craft/model/diagram';
import { Layer } from '@diagram-craft/model/diagramLayer';
import { DiagramNode, NodePropsForRendering } from '@diagram-craft/model/diagramNode';
import { parseNum } from '../utils';
import {
  SimpleShapeNodeDefinition,
  SimpleShapeNodeDefinitionProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { registerNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { coalesce } from '@diagram-craft/utils/strings';
import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import { deepClone, deepMerge } from '@diagram-craft/utils/object';
import { DeepWriteable } from '@diagram-craft/utils/types';
import { VERIFY_NOT_REACHED } from '@diagram-craft/utils/assert';
import stencils from './uml.yaml';

export const parseUMLShapes = async (
  id: string,
  bounds: Box,
  props: NodeProps,
  style: Style,
  diagram: Diagram,
  layer: Layer
) => {
  if (style.shape === 'module' || style.shape === 'component') {
    props.shapeUmlModule = {
      jettyWidth: parseNum(style.jettyWidth, 20),
      jettyHeight: parseNum(style.jettyHeight, 10)
    };
    return new DiagramNode(id, 'module', bounds, diagram, layer, props);
  } else if (style.shape === 'umlLifeline') {
    props.shapeUmlLifeline = {
      participant: style.participant
    };
  }

  return new DiagramNode(id, style.shape!, bounds, diagram, layer, props);
};

class Folder extends SimpleShapeNodeDefinition {
  constructor() {
    super('folder', 'UML Folder');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;
    const b = shapeBuilder.buildBoundary();

    b.rect(0, 15, w, h - 15);
    b.rect(0, 0, 50, 15);
    b.fillAndStroke();

    shapeBuilder.text(props.cmp);
  }
}

class UmlActor extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlActor', 'UML Actor');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.ellipse(w / 2, h / 8, w / 4, h / 8);
    b.fillAndStroke();

    b.path(w / 2, h / 4).line(w / 2, (2 * h) / 3);
    b.path(w / 2, h / 3).line(0, h / 3);
    b.path(w / 2, h / 3).line(w, h / 3);
    b.path(w / 2, (2 * h) / 3).line(0, h);
    b.path(w / 2, (2 * h) / 3).line(w, h);
    b.fillAndStroke();

    shapeBuilder.text(props.cmp, '1', props.node.renderProps.text, {
      ...props.node.bounds,
      y: props.node.bounds.y + h
    });
  }
}

class UmlBoundary extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlBoundary', 'UML Boundary');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { x, h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.path(0, h / 4).line(0, (h * 3) / 4);
    b.path(0, h / 2).line(w / 6, h / 2);
    b.stroke();

    b.ellipse((7 * w) / 12, h / 2, (w * 5) / 12, h / 2);
    b.fillAndStroke();

    shapeBuilder.text(props.cmp, '1', props.node.renderProps.text, {
      ...props.node.bounds,
      x: x + w / 6,
      w: w - w / 6
    });
  }
}

class UmlEntity extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlEntity', 'UML Entity');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.path(w / 8, h).line((w * 7) / 8, h);
    b.ellipse(w / 2, h / 2, w / 2, h / 2);
    b.stroke();

    shapeBuilder.text(props.cmp);
  }
}

class UmlControl extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlControl', 'UML Control');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { y, h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.path((w * 3) / 8, (h / 8) * 1.1).line((w * 5) / 8, 0);
    b.stroke();

    b.ellipse(w / 2, (9 / 16) * h, w / 2, (h * 7) / 16);
    b.fillAndStroke();

    const fg = shapeBuilder.buildInterior();
    fg.path((w * 3) / 8, (h / 8) * 1.1).line((w * 5) / 8, h / 4);
    fg.stroke();

    shapeBuilder.text(props.cmp, '1', props.node.renderProps.text, {
      ...props.node.bounds,
      y: y + h / 8,
      h: h - h / 8
    });
  }
}

class ProvidedRequiredInterface extends SimpleShapeNodeDefinition {
  constructor() {
    super('providedRequiredInterface', 'Provided/Required Interface');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const inset = 2 + props.node.renderProps.stroke.width;
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.ellipse(w / 2 - inset, h / 2, w / 2 - inset, h / 2 - inset);
    b.fillAndStroke();

    b.path(w / 2, 0)
      .quad(w, 0, w, h / 2)
      .quad(w, h, w / 2, h);
    b.stroke();
  }
}

class RequiredInterface extends SimpleShapeNodeDefinition {
  constructor() {
    super('requiredInterface', 'Required Interface');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.path(0, 0)
      .quad(w, 0, w, h / 2)
      .quad(w, h, 0, h);
    b.stroke();
  }
}

class UmlFrame extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlFrame', 'UML Frame');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { x, y, h, w } = props.node.bounds;

    const cw = 70;
    const ch = 30;
    const cr = 10;

    const b = shapeBuilder.buildBoundary();

    b.path(0, 0)
      .line(cw, 0)
      .line(cw, Math.max(0, ch - cr * 1.5))
      .line(Math.max(0, cw - cr), ch)
      .line(0, ch)
      .close();
    b.fillAndStroke();

    b.path(cw, 0).line(w, 0).line(w, h).line(0, h).line(0, ch);
    b.stroke();

    shapeBuilder.text(props.cmp, '1', props.node.renderProps.text, {
      ...props.node.bounds,
      x: x,
      y: y,
      w: cw,
      h: ch
    });
  }
}

class UmlDestroy extends SimpleShapeNodeDefinition {
  constructor() {
    super('umlDestroy', 'UML Destroy');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.path(w, 0).line(0, h).move(0, 0).line(w, h);
    b.stroke();
  }
}

declare global {
  interface NodeProps {
    shapeUmlLifeline?: {
      participant?: string;
    };
  }
}

registerNodeDefaults('shapeUmlLifeline', { participant: '' });

class UmlLifeline extends SimpleShapeNodeDefinition {
  constructor(private readonly registry: NodeDefinitionRegistry) {
    super('umlLifeline', 'UML Lifeline');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const { h, w } = props.node.bounds;

    // TODO: This must be read from the file
    const participantHeight = 40;

    const b = shapeBuilder.buildBoundary();
    b.path(w / 2, participantHeight).line(w / 2, h);
    b.stroke({
      ...props.nodeProps.stroke,
      pattern: 'DASHED',
      patternSpacing: 40,
      patternSize: 40
    });

    const participant = coalesce(props.node.renderProps.shapeUmlLifeline?.participant, 'rect')!;

    const shape = this.registry.get(participant)!;
    if (!shape) VERIFY_NOT_REACHED();

    const nodeComponent = (shape as ShapeNodeDefinition).component!;

    const participantProps = deepClone(props.nodeProps) as DeepWriteable<NodePropsForRendering>;
    participantProps.text.text = '';

    const node = new DiagramNode(
      `${props.node.id}-participant`,
      shape.type,
      {
        x: props.node.bounds.x,
        y: props.node.bounds.y,
        w: props.node.bounds.w,
        h: participantHeight,
        r: props.node.bounds.r
      },
      props.node.diagram,
      props.node.layer,
      participantProps
    );

    shapeBuilder.add(
      props.cmp.subComponent(() => new nodeComponent(shape as ShapeNodeDefinition), {
        mode: 'canvas',
        element: node,
        actionMap: props.actionMap,
        onDoubleClick: () => {},
        onMouseDown: () => {},
        applicationTriggers: props.applicationTriggers,
        tool: props.tool
      })
    );

    shapeBuilder.text(props.cmp, '1', props.node.renderProps.text, {
      ...props.node.bounds,
      h: participantHeight
    });
  }
}

export const registerUMLShapes = async (r: NodeDefinitionRegistry) => {
  const umlStencils: StencilPackage = { id: 'uml', name: 'UML', stencils: [] };

  umlStencils.stencils.push(...loadStencilsFromYaml(stencils));

  const props: MakeStencilNodeOptsProps = () => ({
    fill: {
      color: 'var(--canvas-bg2)'
    },
    text: {
      fontSize: 12,
      top: 7,
      left: 7,
      right: 7,
      bottom: 7
    }
  });

  const mergedProps: (p: Partial<NodeProps>) => MakeStencilNodeOptsProps = p => () =>
    deepMerge(props('picker'), p);

  registerStencil(r, umlStencils, new UmlActor(), { aspectRatio: 0.6, props });

  registerStencil(r, umlStencils, new Folder(), {
    aspectRatio: 1.5,
    props: mergedProps({
      text: {
        bold: true,
        top: 12,
        text: 'package'
      }
    })
  });

  registerStencil(r, umlStencils, new UmlEntity(), { props });

  registerStencil(r, umlStencils, new UmlControl(), { aspectRatio: 7 / 8, props });

  registerStencil(r, umlStencils, new UmlDestroy(), { size: { w: 10, h: 10 } });

  registerStencil(r, umlStencils, new UmlLifeline(r), { props });

  registerStencil(r, umlStencils, new UmlBoundary(), {
    aspectRatio: 1.25,
    props: mergedProps({
      text: {
        text: 'Boundary Object'
      }
    })
  });

  registerStencil(r, umlStencils, new UmlFrame(), { props });

  registerStencil(r, umlStencils, new UmlModuleNodeDefinition(), {
    props: mergedProps({
      text: {
        text: 'Module',
        left: 22,
        valign: 'top'
      }
    }),
    size: { w: 90, h: 50 }
  });

  registerStencil(r, umlStencils, new ProvidedRequiredInterface(), {
    props,
    size: { w: 20, h: 20 }
  });

  registerStencil(r, umlStencils, new RequiredInterface(), {
    props,
    size: { w: 20, h: 20 },
    aspectRatio: 0.5
  });

  shapeParsers['umlLifeline'] = parseUMLShapes;
  shapeParsers['module'] = parseUMLShapes;
  shapeParsers['component'] = parseUMLShapes;

  r.stencilRegistry.register(umlStencils, true);
};
