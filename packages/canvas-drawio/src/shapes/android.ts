import {
  DrawioStencil,
  findStencilByName,
  loadDrawioStencils,
  toTypeName
} from '../drawioStencilLoader';
import { NodeDefinitionRegistry } from '@diagram-craft/model/elementDefinitionRegistry';
import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import {
  BaseNodeComponent,
  SimpleShapeNodeDefinition,
  SimpleShapeNodeDefinitionProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { RoundedRectComponent } from '@diagram-craft/canvas-nodes/node-types/RoundedRect.nodeType';
import { Box } from '@diagram-craft/geometry/box';
import { ShapeParser, Style } from '../drawioReader';
import { Diagram } from '@diagram-craft/model/diagram';
import { Layer } from '@diagram-craft/model/diagramLayer';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { parseNum } from '../utils';
import { registerNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { DrawioShapeNodeDefinition } from '../DrawioShape.nodeType';

const registerStencil = (
  registry: NodeDefinitionRegistry,
  name: string,
  stencils: Array<DrawioStencil>
) => {
  const stencil = findStencilByName(stencils, name);

  registry.register(
    new DrawioShapeNodeDefinition(`mxgraph.android.${toTypeName(name)}`, name, stencil)
  );
};

class Spinner2NodeDefinition extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.spinner2');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder) {
    const { w, h } = props.node.bounds;
    const k = Math.min(w / 10, h);

    const b = shapeBuilder.buildBoundary();
    b.path(0, h).line(w, h);
    b.stroke();

    b.path(w - k, h)
      .line(w, h - k)
      .line(w, h)
      .close();
    b.fillAndStroke();

    shapeBuilder.text(props.cmp);
  }
}

class AndroidRectNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.rect', RoundedRectComponent);
  }
}

class AndroidRRectNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.rrect', class extends BaseNodeComponent {});
  }
}

class AndroidCheckboxNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.checkbox', class extends BaseNodeComponent {});
  }
}

class AndroidAnchorNodeDefinition extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.anchor');
  }

  buildShape({ cmp }: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder) {
    shapeBuilder.text(cmp);
  }
}

class AndroidScrollbars2NodeDefinition extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.scrollbars2');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, builder: ShapeBuilder) {
    const { w, h } = props.node.bounds;

    const b = builder.buildBoundary();
    b.rect(w - 5, 0, 5, h - 7);
    b.fillAndStroke();

    b.rect(0, h - 5, w - 7, 5);
    b.fillAndStroke();
  }
}

/* AndroidProgressBarDefinition ************************************************************************* */

declare global {
  interface NodeProps {
    shapeAndroidProgressBar?: {
      width?: number;
      dx1?: number;
      dx2?: number;
    };
  }
}

registerNodeDefaults('shapeAndroidProgressBar', { width: 2, dx1: 0.25, dx2: 0.75 });

class AndroidProgressBarDefinition extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.progressBar');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, builder: ShapeBuilder) {
    const { w, h } = props.node.bounds;
    const { width, dx1, dx2 } = props.nodeProps.shapeAndroidProgressBar;

    const b = builder.buildBoundary();
    b.path(0, h * 0.5).line(w, h * 0.5);
    b.stroke({ color: '#444444', width });

    b.restore();
    b.path(0, h * 0.5).line(dx1 * w, h * 0.5);
    b.stroke();

    b.path(0, h * 0.5).line(dx1 * w, h * 0.5);
    b.stroke({ color: 'rgba(0, 0, 0, 0.2)', width });

    b.restore();
    b.path(0, h * 0.5).line(dx2 * w, h * 0.5);
    b.stroke();
  }
}

/* AndroidProgressScrubber ****************************************************************************** */

declare global {
  interface NodeProps {
    shapeAndroidProgressScrubber?: {
      dx?: number;
      state?: 'disabled' | 'focused' | 'pressed';
    };
  }
}

registerNodeDefaults('shapeAndroidProgressScrubber', { dx: 0.5, state: 'disabled' });

class AndroidProgressScrubber extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.progressScrubber');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, builder: ShapeBuilder) {
    const { w, h } = props.node.bounds;
    const yMid = h / 2;

    const { dx, state } = props.nodeProps.shapeAndroidProgressScrubber;
    const c = props.node.renderProps.fill.color;

    const b = builder.buildBoundary();
    b.path(0, yMid).line(w, yMid);
    b.stroke({ color: '#444444' });

    if (state === 'disabled') {
      b.circle(dx * w, yMid, 10);
      b.fill({ color: 'rgba(102, 102, 102, 0.5)' });
    } else {
      b.path(0, yMid).line(dx * w, yMid);
      b.stroke();

      b.circle(dx * w, yMid, 10);
      b.fill({
        color: `color-mix(in srgb, ${c}, transparent ${state === 'focused' ? '25%' : '50%'})`
      });

      if (state === 'pressed') {
        b.circle(dx * w, yMid, 9.25);
        b.stroke({ color: c, width: 0.5 });
      }
    }

    b.restore();
    b.circle(dx * w, yMid, 2);
    b.fill();
  }
}

/* AndroidQuickscroll2 ********************************************************************************** */

const THUMB = { w: 6, h: 20 };

declare global {
  interface NodeProps {
    shapeAndroidQuickscroll2?: {
      dy?: number;
    };
  }
}

registerNodeDefaults('shapeAndroidQuickscroll2', { dy: 0.5 });

class AndroidQuickscroll2 extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.quickscroll2');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, builder: ShapeBuilder) {
    const { w, h } = props.node.bounds;
    const { dy } = props.nodeProps.shapeAndroidQuickscroll2;

    const b = builder.buildBoundary();
    b.setStroke({ color: '#cccccc' });
    b.path(w - THUMB.w / 2, 0).line(w - THUMB.w / 2, h);
    b.stroke();

    b.restore();
    b.rect(w - THUMB.w, dy * h - THUMB.h / 2, THUMB.w, THUMB.h, 1, 1);
    b.fillAndStroke();

    b.rect(0, dy * h - THUMB.h, w - 18, 40);
    b.fill({ color: '#cccccc' });

    b.path(w - 18, dy * h - THUMB.h)
      .line(w - THUMB.w, dy * h)
      .line(w - 18, dy * h + THUMB.h)
      .close();
    b.fill({ color: '#666666' });

    b.text((w - 18) * 0.5, dy * h, 'Aa', { size: '12' });
  }
}

/* AndroidQuickscroll3 ********************************************************************************** */

declare global {
  interface NodeProps {
    shapeAndroidQuickscroll3?: {
      dy?: number;
    };
  }
}

registerNodeDefaults('shapeAndroidQuickscroll3', { dy: 0.5 });

class AndroidQuickscroll3 extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.quickscroll3');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, builder: ShapeBuilder) {
    const { w, h } = props.node.bounds;
    const { dy } = props.nodeProps.shapeAndroidQuickscroll3;

    const b = builder.buildBoundary();
    b.path(w - THUMB.w / 2, 0).line(w - THUMB.w / 2, h);
    b.stroke({ color: '#cccccc' });

    b.restore();
    b.rect(w - THUMB.w, dy * h - THUMB.h / 2, THUMB.w, THUMB.h, 1, 1);
    b.fillAndStroke();
  }
}

/* AndroidIndeterminateSpinner ************************************************************************** */

class AndroidIndeterminateSpinner extends SimpleShapeNodeDefinition {
  constructor() {
    super('mxgraph.android.indeterminateSpinner');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, b: ShapeBuilder) {
    const { w, h } = props.node.bounds;

    const g = b.buildBoundary(w, h);

    g.path(0.5, 0.1)
      .arc(0.4, 0.4, 0, 0, 0, 0.5, 0.9)
      .line(0.5, 1)
      .arc(0.5, 0.5, 0, 0, 1, 0.5, 0)
      .close();
    g.linearGradient('#aaaaaa', '#dddddd', Math.PI / 2);
    g.fill();

    g.path(0.5, 0.1)
      .arc(0.4, 0.4, 0, 0, 1, 0.5, 0.9)
      .line(0.5, 1)
      .arc(0.5, 0.5, 0, 0, 0, 0.5, 0)
      .close();
    g.linearGradient('#dddddd', '#ffffff', -Math.PI / 2);
    g.fill();
  }
}

export const parseAndroidShapes = async (
  id: string,
  bounds: Box,
  props: NodeProps,
  style: Style,
  diagram: Diagram,
  layer: Layer
): Promise<DiagramNode> => {
  if (style.shape === 'mxgraph.android.progressBar') {
    props.shapeAndroidProgressBar ??= {};
    props.shapeAndroidProgressBar.width = parseNum(style.strokeWidth, 2);
    props.shapeAndroidProgressBar.dx1 = parseNum(style.dx1, 0.25);
    props.shapeAndroidProgressBar.dx2 = parseNum(style.dx2, 0.75);
  } else if (style.shape?.startsWith('mxgraph.android.quickscroll2')) {
    props.shapeAndroidQuickscroll2 ??= {};
    props.shapeAndroidQuickscroll2.dy = parseNum(style.dy, 0.5);
  } else if (style.shape?.startsWith('mxgraph.android.quickscroll3')) {
    props.shapeAndroidQuickscroll3 ??= {};
    props.shapeAndroidQuickscroll3.dy = parseNum(style.dy, 0.5);
  } else if (style.shape?.startsWith('mxgraph.android.progressScrubber')) {
    props.shapeAndroidProgressScrubber ??= {};
    props.shapeAndroidProgressScrubber.dx = parseNum(style.dx, 0.5);
    if (style.shape === 'mxgraph.android.progressScrubberDisabled') {
      props.shapeAndroidProgressScrubber.state = 'disabled';
      style.shape = 'mxgraph.android.progressScrubber';
    } else if (style.shape === 'mxgraph.android.progressScrubberPressed') {
      props.shapeAndroidProgressScrubber.state = 'pressed';
      style.shape = 'mxgraph.android.progressScrubber';
    } else if (style.shape === 'mxgraph.android.progressScrubberFocused') {
      props.shapeAndroidProgressScrubber.state = 'focused';
      style.shape = 'mxgraph.android.progressScrubber';
    }
  }

  return new DiagramNode(id, style.shape!, bounds, diagram, layer, props);
};

export const registerAndroidShapes = async (
  r: NodeDefinitionRegistry,
  shapeParsers: Record<string, ShapeParser>
) => {
  const stencils = await loadDrawioStencils(
    '/stencils/android/android.xml',
    'Android',
    '#00BEF2',
    'white'
  );

  shapeParsers['mxgraph.android.progressBar'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.quickscroll2'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.quickscroll3'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.progressScrubber'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.progressScrubberDisabled'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.progressScrubberPressed'] = parseAndroidShapes;
  shapeParsers['mxgraph.android.progressScrubberFocused'] = parseAndroidShapes;

  r.register(new Spinner2NodeDefinition());
  r.register(new AndroidRectNodeDefinition());
  r.register(new AndroidProgressBarDefinition());
  r.register(new AndroidProgressScrubber());
  r.register(new AndroidQuickscroll2());
  r.register(new AndroidQuickscroll3());
  r.register(new AndroidRRectNodeDefinition());
  r.register(new AndroidAnchorNodeDefinition());
  r.register(new AndroidScrollbars2NodeDefinition());
  r.register(new AndroidCheckboxNodeDefinition());
  r.register(new AndroidIndeterminateSpinner());

  registerStencil(r, 'phone2', stencils);
  registerStencil(r, 'tab2', stencils);
  registerStencil(r, 'action bar', stencils);
  registerStencil(r, 'action bar landscape', stencils);
  registerStencil(r, 'contact badge focused', stencils);
  registerStencil(r, 'contact badge normal', stencils);
  registerStencil(r, 'contact badge pressed', stencils);
  registerStencil(r, 'contextual action bar', stencils);
  registerStencil(r, 'contextual action bar white', stencils);
  registerStencil(r, 'contextual action bar landscape', stencils);
  registerStencil(r, 'contextual action bar landscape white', stencils);
  registerStencil(r, 'contextual split action bar', stencils);
  registerStencil(r, 'contextual split action bar white', stencils);
  registerStencil(r, 'contextual split action bar landscape', stencils);
  registerStencil(r, 'contextual split action bar landscape white', stencils);
  registerStencil(r, 'indeterminate progress bar', stencils);
  registerStencil(r, 'keyboard', stencils);
  registerStencil(r, 'navigation bar 1', stencils);
  registerStencil(r, 'navigation bar 1 landscape', stencils);
  registerStencil(r, 'navigation bar 1 vertical', stencils);
  registerStencil(r, 'navigation bar 2', stencils);
  registerStencil(r, 'navigation bar 3', stencils);
  registerStencil(r, 'navigation bar 3 landscape', stencils);
  registerStencil(r, 'navigation bar 4', stencils);
  registerStencil(r, 'navigation bar 5', stencils);
  registerStencil(r, 'navigation bar 5 vertical', stencils);
  registerStencil(r, 'navigation bar 6', stencils);
  registerStencil(r, 'quick contact', stencils);
};
