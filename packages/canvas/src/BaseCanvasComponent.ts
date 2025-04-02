import { Context } from '@diagram-craft/canvas/context';
import {
  Component,
  ComponentVNodeData,
  createEffect,
  isInComponent
} from '@diagram-craft/canvas/component/component';
import { assert, VerifyNotReached } from '@diagram-craft/utils/assert';
import { isResolvableToRegularLayer, Layer, RegularLayer } from '@diagram-craft/model/diagramLayer';
import { Diagram, DiagramEvents } from '@diagram-craft/model/diagram';
import { Point } from '@diagram-craft/geometry/point';
import { Modifiers } from '@diagram-craft/canvas/dragDropManager';
import { isEdge, isNode } from '@diagram-craft/model/diagramElement';
import { ShapeEdgeDefinition } from '@diagram-craft/canvas/shape/shapeEdgeDefinition';
import { NodeComponentProps } from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeNodeDefinition } from '@diagram-craft/canvas/shape/shapeNodeDefinition';
import { EventKey } from '@diagram-craft/utils/event';
import * as svg from '@diagram-craft/canvas/component/vdom-svg';
import { Browser } from '@diagram-craft/canvas/browser';
import * as html from './component/vdom-html';
import { rawHTML, VNode } from './component/vdom';
import styles from './canvas.css?inline';

export type BaseCanvasProps = {
  id: string;
  width?: number | string | undefined;
  height?: number | string | undefined;
  context: Context;
  className?: string;
  diagram: Diagram;
  onClick?: (e: MouseEvent) => void;
};

export abstract class BaseCanvasComponent<
  P extends BaseCanvasProps = BaseCanvasProps
> extends Component<P> {
  protected nodeRefs: Map<string, Component<unknown> | null> = new Map();
  protected edgeRefs: Map<string, Component<unknown> | null> = new Map();

  getSvgElement(): SVGSVGElement {
    assert.present(this.currentProps);
    return document.getElementById(this.currentProps.id)! as unknown as SVGSVGElement;
  }

  render(props: P): VNode {
    const viewBox = this.viewBox(props);

    return html.svg(
      {
        id: props.id,
        class: this.getClassName(props),

        ...this.dimensionAttributes(props),

        preserveAspectRatio: this.preserveAspectRatio,
        style: `user-select: none`,
        ...(viewBox ? { viewBox: viewBox } : {}),
        on: {
          click: e => props.onClick?.(e)
        }
      },
      [
        svg.style({}, rawHTML(styles)),
        this.svgFilterDefs(),

        svg.g(
          {},
          ...props.diagram.layers.visible.flatMap(layer => {
            if (!isResolvableToRegularLayer(layer)) return null;
            return this.renderLayer(layer, props.diagram, undefined, undefined, props);
          })
        )
      ]
    );
  }

  protected renderLayer(
    layer: Layer<RegularLayer>,
    $d: Diagram,
    onMouseDown: ((id: string, coord: Point, modifiers: Modifiers) => void) | undefined,
    onEdgeDoubleClick: ((id: string, coord: Point) => void) | undefined,

    // TODO: Can we replace this by using this.currentProps instead
    props: P
  ) {
    assert.present(this.currentProps);

    const diagram = $d;
    return layer.resolveForced().elements.map(e => {
      const id = e.id;

      e.activeDiagram = $d;

      if (isEdge(e)) {
        const edge = e;
        const edgeDef = diagram.document.edgeDefinitions.get(edge.renderProps.shape);

        return this.subComponent(
          () => new (edgeDef as ShapeEdgeDefinition).component!(edgeDef as ShapeEdgeDefinition),
          {
            key: `edge-${id}`,
            onDoubleClick: onEdgeDoubleClick,
            onMouseDown: onMouseDown ?? (() => {}),
            element: edge,
            context: props.context,
            isReadOnly: layer.type === 'reference'
          },
          {
            onCreate: element => {
              this.edgeRefs.set(
                id,
                (element.data as ComponentVNodeData<unknown>).component.instance!
              );
            },
            onRemove: element => {
              /* Note: Need to check if the instance is the same as the one we have stored,
               *       as removes and adds can come out of order */
              const instance = element.data as ComponentVNodeData<unknown>;
              if (this.edgeRefs.get(id) === instance.component.instance) {
                this.edgeRefs.set(id, null);
              }
            }
          }
        );
      } else if (isNode(e)) {
        const node = e;
        const nodeDef = diagram.document.nodeDefinitions.get(node.nodeType);

        return this.subComponent<NodeComponentProps>(
          () => new (nodeDef as ShapeNodeDefinition).component!(nodeDef as ShapeNodeDefinition),
          {
            key: `node-${node.nodeType}-${id}`,
            element: node,
            onMouseDown: onMouseDown ?? (() => {}),
            context: props.context,
            isReadOnly: layer.type === 'reference'
          },
          {
            onCreate: element => {
              this.nodeRefs.set(
                id,
                (element.data as ComponentVNodeData<NodeComponentProps>).component.instance!
              );
            },
            onRemove: element => {
              /* Note: Need to check if the instance is the same as the one we have stored,
               *       as removes and adds can come out of order */
              const instance = (element.data as ComponentVNodeData<NodeComponentProps>).component
                .instance;
              if (this.nodeRefs.get(id) === instance) {
                this.nodeRefs.set(id, null);
              }
            }
          }
        );
      } else {
        throw new VerifyNotReached();
      }
    });
  }

  protected onEventRedraw(eventName: EventKey<DiagramEvents>, diagram: Diagram) {
    if (!isInComponent()) return;

    createEffect(() => {
      const cb = () => this.redraw();
      diagram.on(eventName, cb);
      return () => diagram.off(eventName, cb);
    }, [diagram]);
  }

  protected svgFilterDefs() {
    return svg.defs(
      svg.filter(
        { id: 'reflection-filter', filterUnits: 'objectBoundingBox' },
        svg.feGaussianBlur({ stdDeviation: 0.5 })
      )
    );
  }

  protected dimensionAttributes(props: P) {
    return {
      ...(props.width ? { width: props.width } : {}),
      ...(props.height ? { height: props.height } : {})
    };
  }

  protected getClassName(props: P) {
    return [
      props.className ?? this.defaultClassName,
      Browser.isChrome() ? 'browser-chrome' : ''
    ].join(' ');
  }

  protected abstract viewBox(props: P): string | undefined;

  protected abstract defaultClassName: string;
  protected abstract preserveAspectRatio: string;
}
