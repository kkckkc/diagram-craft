import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import { DiagramNode, NodePropsForRendering } from '@diagram-craft/model/diagramNode';
import { PathBuilder, PathBuilderHelper } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import {
  BaseNodeComponent,
  BaseShapeBuildShapeProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';
import { Box } from '@diagram-craft/geometry/box';
import { Extent } from '@diagram-craft/geometry/extent';
import { deepClone } from '@diagram-craft/utils/object';
import { cloneAsWriteable, DeepWriteable } from '@diagram-craft/utils/types';
import { Anchor } from '@diagram-craft/model/anchor';
import {
  assertHAlign,
  assertLineCap,
  assertLineJoin,
  assertVAlign
} from '@diagram-craft/model/diagramProps';
import { xNum } from './utils';
import { registerCustomNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { coalesce } from '@diagram-craft/utils/strings';
import { DrawioStencil } from './drawioStencilLoader';
import { NodeDefinition } from '@diagram-craft/model/elementDefinitionRegistry';
import { Metrics } from '@diagram-craft/utils/metrics';

declare global {
  interface CustomNodeProps {
    // TODO: We should split this in shapeDrawio and shapeDrawioImage
    drawio?: {
      shape?: string;
      textPosition?: '' | 'center' | 'bottom' | 'right';
      imageWidth?: number;
      imageHeight?: number;
    };
  }
}

registerCustomNodeDefaults('drawio', {
  shape: '',
  textPosition: '',
  imageHeight: 0,
  imageWidth: 0
});

const makeShapeTransform =
  (source: Extent, target: Box) => (p: Point, _type?: 'point' | 'distance') => {
    if (_type === 'distance') {
      return {
        x: (p.x / source.w) * target.w,
        y: (p.y / source.h) * target.h
      };
    }
    return {
      x: target.x + (p.x / source.w) * target.w,
      y: target.y + (p.y / source.h) * target.h
    };
  };

const isShapeElement = ($el: Element) =>
  $el.nodeName === 'rect' ||
  $el.nodeName === 'ellipse' ||
  $el.nodeName === 'path' ||
  $el.nodeName === 'roundrect';

const parse = (def: DiagramNode, stencil: DrawioStencil | undefined): Element | undefined => {
  if (def.cache.has('element')) return def.cache.get('element') as Element;

  const data = coalesce(def.renderProps.custom.drawio.shape, stencil?.props?.custom?.drawio?.shape);
  if (!data) {
    console.warn(`Cannot find shape for ${def.type} / ${def.name}`);
    return undefined;
  }

  const parser = new DOMParser();
  const $shape = parser.parseFromString(atob(data), 'application/xml');
  def.cache.set('element', $shape.documentElement);
  return def.cache.get('element') as Element;
};

type CompiledShape = {
  size: Extent;
  boundingPath: string;
  anchors: Array<Anchor> | undefined;
};

class Compiler {
  constructor(private $el: Element | undefined) {}

  compile() {
    return {
      size: this.compileSize(),
      boundingPath: this.compileBoundingPath(),
      anchors: this.compileAnchors()
    };
  }

  private compileSize(): Extent {
    if (!this.$el) return { w: 100, h: 100 };
    return {
      w: xNum(this.$el, 'w', 100),
      h: xNum(this.$el, 'h', 100)
    };
  }

  private compileBoundingPath(): string {
    if (!this.$el) return '';

    const pathBuilder = new PathBuilder();
    const background = this.$el.querySelector('background');
    this.parseElement(background, pathBuilder);

    if (pathBuilder.getPaths().all().length === 0) {
      const foreground = this.$el.querySelector('foreground');
      this.parseElement(foreground, pathBuilder);
    }
    return pathBuilder.getPaths().asSvgPath();
  }

  private compileAnchors() {
    if (!this.$el) return undefined;

    const newAnchors: Array<Anchor> = [];
    newAnchors.push({ id: 'c', start: { x: 0.5, y: 0.5 }, clip: true, type: 'center' });

    const $constraints = this.$el.getElementsByTagName('constraint');
    for (let i = 0; i < $constraints.length; i++) {
      const $constraint = $constraints.item(i)!;
      if ($constraint.nodeType !== Node.ELEMENT_NODE) continue;

      const x = xNum($constraint, 'x');
      const y = xNum($constraint, 'y');
      newAnchors.push({ id: i.toString(), start: Point.of(x, y), clip: false, type: 'point' });
    }

    return newAnchors;
  }

  private parseElement(element: Element | null, pathBuilder: PathBuilder) {
    if (!element) return;

    const outlines = element!.childNodes;
    for (let i = 0; i < outlines.length; i++) {
      const node = outlines.item(i);
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const $el = node as Element;
      if (isShapeElement($el)) {
        parseShapeElement($el, pathBuilder);
      } else {
        //console.log(`No support for ${$el.nodeName}`);
        //VERIFY_NOT_REACHED();
      }
    }
  }
}

const compile = (def: DiagramNode, $el: Element | undefined): CompiledShape => {
  if (def.cache.has('compiledElement')) return def.cache.get('compiledElement') as CompiledShape;

  const compiler = new Compiler($el);

  const compiled = compiler.compile();
  def.cache.set('compiledElement', compiled);
  return compiled;
};

const parseShapeElement = ($el: Element, pathBuilder: PathBuilder) => {
  Metrics.counter('parseShapeElement');

  if ($el.nodeName === 'rect') {
    PathBuilderHelper.rect(pathBuilder, {
      x: xNum($el, 'x'),
      y: xNum($el, 'y'),
      w: xNum($el, 'w'),
      h: xNum($el, 'h'),
      r: 0
    });
  } else if ($el.nodeName === 'roundrect') {
    const [x, y, w, h, arcsize] = ['x', 'y', 'w', 'h', 'arcsize'].map(attr => xNum($el, attr));

    const rx = (arcsize / 100) * w;
    const ry = (arcsize / 100) * h;

    const r = Math.min(rx, ry);

    const dw = w - 2 * r;
    const dh = h - 2 * r;

    pathBuilder.moveTo(Point.of(x + r, y));
    pathBuilder.lineTo(Point.of(x + r + dw, y));
    pathBuilder.arcTo(Point.of(x + w, y + r), r, r, 0, 0, 1);
    pathBuilder.lineTo(Point.of(x + w, y + r + dh));
    pathBuilder.arcTo(Point.of(x + r + dw, y + h), r, r, 0, 0, 1);
    pathBuilder.lineTo(Point.of(x + r, y + h));
    pathBuilder.arcTo(Point.of(x, y + r + dh), r, r, 0, 0, 1);
    pathBuilder.lineTo(Point.of(x, y + r));
    pathBuilder.arcTo(Point.of(x + r, y), r, r, 0, 0, 1);

    return pathBuilder;
  } else if ($el.nodeName === 'ellipse') {
    const cx = xNum($el, 'x');
    const cy = xNum($el, 'y');
    const cw = xNum($el, 'w');
    const ch = xNum($el, 'h');

    pathBuilder.moveTo(Point.of(cx + cw / 2, cy));
    pathBuilder.arcTo(Point.of(cx + cw, cy + ch / 2), cw / 2, ch / 2, 0, 0, 1);
    pathBuilder.arcTo(Point.of(cx + cw / 2, cy + ch), cw / 2, ch / 2, 0, 0, 1);
    pathBuilder.arcTo(Point.of(cx, cy + ch / 2), cw / 2, ch / 2, 0, 0, 1);
    pathBuilder.arcTo(Point.of(cx + cw / 2, cy), cw / 2, ch / 2, 0, 0, 1);
  } else if ($el.nodeName === 'path') {
    for (const $pc of $el.childNodes) {
      if ($pc.nodeType !== Node.ELEMENT_NODE) continue;

      const $pce = $pc as Element;
      if ($pc.nodeName === 'move') {
        pathBuilder.moveTo(Point.of(xNum($pce, 'x'), xNum($pce, 'y')));
      } else if ($pc.nodeName === 'line') {
        pathBuilder.lineTo(Point.of(xNum($pce, 'x'), xNum($pce, 'y')));
      } else if ($pc.nodeName === 'close') {
        pathBuilder.close();
      } else if ($pc.nodeName === 'curve') {
        pathBuilder.cubicTo(
          Point.of(xNum($pce, 'x3'), xNum($pce, 'y3')),
          Point.of(xNum($pce, 'x1'), xNum($pce, 'y1')),
          Point.of(xNum($pce, 'x2'), xNum($pce, 'y2'))
        );
      } else if ($pc.nodeName === 'quad') {
        pathBuilder.quadTo(
          Point.of(xNum($pce, 'x2'), xNum($pce, 'y2')),
          Point.of(xNum($pce, 'x1'), xNum($pce, 'y1'))
        );
      } else if ($pc.nodeName === 'arc') {
        pathBuilder.arcTo(
          Point.of(xNum($pce, 'x'), xNum($pce, 'y')),
          xNum($pce, 'rx'),
          xNum($pce, 'ry'),
          xNum($pce, 'x-axis-rotation'),
          xNum($pce, 'large-arc-flag') as 0 | 1,
          xNum($pce, 'sweep-flag') as 0 | 1
        );
      } else {
        console.log(`No support for path.` + $pc.nodeName);
      }
    }
  }
};

export function assertDrawioShapeNodeDefinition(
  def: NodeDefinition
): asserts def is DrawioShapeNodeDefinition {
  if (!(def instanceof DrawioShapeNodeDefinition)) {
    throw new Error(`Expected DrawioShapeNodeDefinition, got ${def}`);
  }
}

export class DrawioShapeNodeDefinition extends ShapeNodeDefinition {
  constructor(
    key: string,
    name: string,
    public readonly stencil?: DrawioStencil
  ) {
    super(key, name, DrawioShapeComponent);
  }

  getSize(node: DiagramNode): Extent {
    const { size } = compile(node, parse(node, this.stencil));
    return size;
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const shape = parse(def, this.stencil);
    const compiledShape = compile(def, shape);

    if (compiledShape.boundingPath === '') return new PathBuilder();

    return PathBuilder.fromString(
      compiledShape.boundingPath,
      makeShapeTransform(compiledShape.size, def.bounds)
    );
  }

  // TODO: This needs to consider rotation
  getShapeAnchors(def: DiagramNode) {
    const shape = parse(def, this.stencil);
    const anchors = compile(def, shape).anchors;

    if (!anchors) return super.getShapeAnchors(def);

    return anchors;
  }
}

const makeColor = (c: string, alpha: number) => {
  if (alpha === 1.0) return c;
  return `color(from ${c} srgb r g b / ${alpha})`;
};

class DrawioShapeComponent extends BaseNodeComponent {
  // TODO: There's opportunity to make most of this "compiled"
  buildShape(props: BaseShapeBuildShapeProps, shapeBuilder: ShapeBuilder) {
    const shapeNodeDefinition = this.def as unknown as DrawioShapeNodeDefinition;

    const $shape = parse(props.node, (this.def as unknown as DrawioShapeNodeDefinition).stencil);
    if (!$shape) return;

    const compiledShape = compile(props.node, $shape);

    const boundary = shapeNodeDefinition.getBoundingPathBuilder(props.node).getPaths();

    const { w, h } = compiledShape.size;

    const state: {
      strokeAlpha: number;
      strokeColor: string;
      fillAlpha: number;
      fillColor: string;
      style: DeepWriteable<NodePropsForRendering>;
      savedStyle: {
        style: DeepWriteable<NodePropsForRendering>;
        strokeAlpha: number;
        strokeColor: string;
        fillAlpha: number;
        fillColor: string;
      };
      currentShape: (p: NodeProps) => void;
    } = {
      strokeAlpha: 1,
      strokeColor: props.nodeProps.stroke.color,
      fillAlpha: 1,
      fillColor: props.nodeProps.fill.color,

      style: cloneAsWriteable(props.nodeProps),
      currentShape(p: NodeProps): void {
        return shapeBuilder.boundaryPath(boundary.all(), p);
      },

      // @ts-expect-error - This is initialized in the next line
      savedStyle: undefined
    };
    state.savedStyle = {
      style: state.style,
      strokeAlpha: state.strokeAlpha,
      strokeColor: state.strokeColor,
      fillAlpha: state.fillAlpha,
      fillColor: state.fillColor
    };

    let backgroundDrawn = false;

    const drawBackground = () => {
      state.currentShape({
        fill: {
          color: 'transparent'
        },
        stroke: {
          color: 'transparent'
        }
      });
      backgroundDrawn = true;
    };

    // TODO: This is partially repeated below
    const $styles = $shape.querySelector('background')?.childNodes;
    if ($styles) {
      for (let i = 0; i < $styles.length; i++) {
        const $node = $styles.item(i);
        if ($node.nodeType !== Node.ELEMENT_NODE) continue;

        const $el = $node as Element;
        if ($el.nodeName === 'save') {
          state.savedStyle = deepClone({
            style: state.style,
            strokeAlpha: state.strokeAlpha,
            strokeColor: state.strokeColor,
            fillAlpha: state.fillAlpha,
            fillColor: state.fillColor
          });
        } else if ($el.nodeName === 'restore') {
          const restored = deepClone(state.savedStyle);
          state.style = restored.style;
          state.strokeAlpha = restored.strokeAlpha;
          state.strokeColor = restored.strokeColor;
          state.fillAlpha = restored.fillAlpha;
          state.fillAlpha = restored.fillAlpha;
        } else if ($el.nodeName === 'fontcolor') {
          state.style.text!.color = $el.getAttribute('color')!;
        } else if ($el.nodeName === 'fontsize') {
          state.style.text!.fontSize = xNum($el, 'size')!;
        } else if ($el.nodeName === 'strokecolor') {
          state.strokeColor = $el.getAttribute('color')!;
          state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
        } else if ($el.nodeName === 'fillcolor') {
          state.fillColor = $el.getAttribute('color')!;
          state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
          state.style.fill!.type = 'solid';
        } else if ($el.nodeName === 'fillalpha') {
          state.fillAlpha = xNum($el, 'alpha')!;
          state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
        } else if ($el.nodeName === 'strokealpha') {
          state.strokeAlpha = xNum($el, 'alpha')!;
          state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
        } else if ($el.nodeName === 'alpha') {
          state.fillAlpha = xNum($el, 'alpha')!;
          state.strokeAlpha = xNum($el, 'alpha')!;

          state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
          state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
        } else if ($el.nodeName === 'strokewidth') {
          state.style.stroke!.width = xNum($el, 'width');
        } else if ($el.nodeName === 'dashpattern') {
          state.style.stroke!.pattern = $el.getAttribute('pattern')!;
        } else if ($el.nodeName === 'dashed') {
          if ($el.getAttribute('dashed') === '0') {
            state.style.stroke!.pattern = null;
          }
        } else if ($el.nodeName === 'miterlimit') {
          state.style.stroke!.miterLimit = xNum($el, 'miterlimit')!;
        } else if ($el.nodeName === 'linecap') {
          const lineCap =
            $el.getAttribute('linecap') === 'flat' ? 'round' : $el.getAttribute('linecap');

          if (!lineCap) continue;
          assertLineCap(lineCap);

          state.style.stroke!.lineCap = lineCap;
        } else if ($el.nodeName === 'linejoin') {
          const lineJoin = $el.getAttribute('linejoin');

          if (!lineJoin) continue;
          assertLineJoin(lineJoin);

          state.style.stroke!.lineJoin = lineJoin;
        }
      }
    }

    let textId = 1;

    const $outlines = $shape.querySelector('foreground')!.childNodes;
    for (let i = 0; i < $outlines.length; i++) {
      const $node = $outlines.item(i);
      if ($node.nodeType !== Node.ELEMENT_NODE) continue;

      const $el = $node as Element;
      if ($el.nodeName === 'fillstroke') {
        state.currentShape(state.style);
        backgroundDrawn = true;
      } else if ($el.nodeName === 'fill') {
        const old = state.style.stroke!.color;
        state.style.stroke!.color = 'transparent';
        state.currentShape(state.style);
        state.style.stroke!.color = old;
        backgroundDrawn = true;
      } else if ($el.nodeName === 'stroke') {
        const old = state.style.fill!.color;
        state.style.fill!.color = 'transparent';
        state.currentShape(state.style);
        state.style.fill!.color = old;
        backgroundDrawn = true;
      } else if ($el.nodeName === 'text') {
        if (!backgroundDrawn) drawBackground();

        const align = $el.getAttribute('align') ?? 'center';
        assertHAlign(align);

        const valign = $el.getAttribute('valign') ?? 'middle';
        assertVAlign(valign);

        shapeBuilder.text(
          this,
          (++textId).toString(),
          $el.getAttribute('str')!,
          {
            align: align,
            valign: valign,
            color: state.style.text.color ?? state.style.fill.color,
            fontSize: (state.style.text.fontSize ?? 12) * (props.node.bounds.h / xNum($shape, 'h'))
          },
          {
            x:
              props.nodeProps.custom.drawio.textPosition === 'right'
                ? props.node.bounds.x + props.node.bounds.w
                : props.node.bounds.x + (xNum($el, 'x') / w) * props.node.bounds.w - 30,
            y:
              props.nodeProps.custom.drawio.textPosition === 'bottom'
                ? props.node.bounds.y + props.node.bounds.h
                : props.node.bounds.y + (xNum($el, 'y') / h) * props.node.bounds.h - 20,
            w: props.nodeProps.custom.drawio.textPosition === 'right' ? 200 : 60,
            h: 40,
            r: 0
          }
        );
        backgroundDrawn = true;
      } else if ($el.nodeName === 'save') {
        state.savedStyle = deepClone({
          style: state.style,
          strokeAlpha: state.strokeAlpha,
          strokeColor: state.strokeColor,
          fillAlpha: state.fillAlpha,
          fillColor: state.fillColor
        });
      } else if ($el.nodeName === 'restore') {
        const restored = deepClone(state.savedStyle);
        state.style = restored.style;
        state.strokeAlpha = restored.strokeAlpha;
        state.strokeColor = restored.strokeColor;
        state.fillAlpha = restored.fillAlpha;
        state.fillAlpha = restored.fillAlpha;
      } else if ($el.nodeName === 'strokecolor') {
        state.strokeColor = $el.getAttribute('color')!;
        state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
      } else if ($el.nodeName === 'fontcolor') {
        state.style.text!.color = $el.getAttribute('color')!;
      } else if ($el.nodeName === 'fontsize') {
        state.style.text!.fontSize = xNum($el, 'size')!;
      } else if ($el.nodeName === 'fillcolor') {
        state.fillColor = $el.getAttribute('color')!;
        state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
        state.style.fill!.type = 'solid';
      } else if ($el.nodeName === 'fillalpha') {
        state.fillAlpha = xNum($el, 'alpha')!;
        state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
      } else if ($el.nodeName === 'strokealpha') {
        state.strokeAlpha = xNum($el, 'alpha')!;
        state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
      } else if ($el.nodeName === 'alpha') {
        state.fillAlpha = xNum($el, 'alpha')!;
        state.strokeAlpha = xNum($el, 'alpha')!;

        state.style.fill!.color = makeColor(state.fillColor, state.fillAlpha);
        state.style.stroke!.color = makeColor(state.strokeColor, state.strokeAlpha);
      } else if ($el.nodeName === 'strokewidth') {
        state.style.stroke!.width = xNum($el, 'width');
      } else if ($el.nodeName === 'dashpattern') {
        state.style.stroke!.pattern = $el.getAttribute('pattern')!;
      } else if ($el.nodeName === 'dashed') {
        if ($el.getAttribute('dashed') === '0') {
          state.style.stroke!.pattern = null;
        }
      } else if ($el.nodeName === 'miterlimit') {
        state.style.stroke!.miterLimit = xNum($el, 'miterlimit')!;
      } else if ($el.nodeName === 'linecap') {
        const lineCap =
          $el.getAttribute('linecap') === 'flat' ? 'round' : $el.getAttribute('linecap');

        if (!lineCap) continue;
        assertLineCap(lineCap);

        state.style.stroke!.lineCap = lineCap;
      } else if ($el.nodeName === 'linejoin') {
        const lineJoin = $el.getAttribute('linejoin');

        if (!lineJoin) continue;
        assertLineJoin(lineJoin);

        state.style.stroke!.lineJoin = lineJoin;
      } else if (isShapeElement($el)) {
        if (!backgroundDrawn) drawBackground();

        const pathBuilder = new PathBuilder(makeShapeTransform({ w, h }, props.node.bounds));
        parseShapeElement($el, pathBuilder);

        if (pathBuilder.getPaths().all().length === 0) continue;

        state.currentShape = (p: NodeProps) => {
          shapeBuilder.path(pathBuilder.getPaths().all(), p);
        };
      } else {
        console.log(`No support for ${$el.nodeName}`);
        //VERIFY_NOT_REACHED();
      }
    }

    shapeBuilder.text(this, '1', props.node.getText(), props.nodeProps.text, {
      ...props.node.bounds,
      x:
        props.nodeProps.custom.drawio.textPosition === 'right'
          ? props.node.bounds.x + props.node.bounds.w
          : props.node.bounds.x,
      y:
        props.nodeProps.custom.drawio.textPosition === 'bottom'
          ? props.node.bounds.y + props.node.bounds.h
          : props.node.bounds.y,
      w: props.nodeProps.custom.drawio.textPosition === 'right' ? 200 : props.node.bounds.w
    });
  }
}
