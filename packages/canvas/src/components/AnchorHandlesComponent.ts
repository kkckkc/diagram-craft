import { DRAG_DROP_MANAGER } from '../dragDropManager';
import { CanvasState } from '../EditableCanvasComponent';
import { Component, createEffect } from '../component/component';
import * as svg from '../component/vdom-svg';
import { VNode } from '../component/vdom';
import { MoveDrag } from '../drag/moveDrag';
import { DiagramElement, isNode } from '@diagram-craft/model/diagramElement';
import { EventHelper } from '@diagram-craft/utils/eventHelper';
import { AnchorHandleDrag } from '../drag/anchorHandleDrag';

type State = 'background' | 'node' | 'handle';

const ANCHOR_SIZE = 4;
const SCALE = 10;

// TODO: All these timeouts are a bit ugly... should find a better way
//       to describe the state machine - or somehow subscribe to mouse move events
//       to trigger the hiding of the handles
//
export class AnchorHandlesComponent extends Component<CanvasState> {
  private hoverNode: DiagramElement | undefined;
  private state: State = 'background';
  private timeout: number | undefined = undefined;

  render(props: CanvasState) {
    const diagram = props.diagram;

    const selection = diagram.selectionState;
    const shouldScale = selection.nodes.length === 1 && selection.nodes[0] === this.hoverNode;

    // Whenever an element is hovered, we capture the element (and reset any previous state)
    createEffect(() => {
      const cb = ({ element }: { element: string | undefined }) => {
        this.clearTimeout();

        if (element === undefined) {
          this.triggerMouseOut(shouldScale);
        } else {
          this.setState(diagram.lookup(element), 'node');
        }
      };
      props.applicationState.on('hoverElementChange', cb);
      return () => props.applicationState.off('hoverElementChange', cb);
    }, [props.applicationState]);

    // When the selection is changes, we reset the state
    createEffect(() => {
      const cb = () => {
        this.clearTimeout();
        this.setState(undefined, 'background');
      };
      diagram.selectionState.on('change', cb);
      return () => diagram.selectionState.off('change', cb);
    }, [diagram.selectionState]);

    createEffect(() => {
      const cb = ({ element }: { element: DiagramElement }) => {
        this.clearTimeout();
        if (element === this.hoverNode) {
          this.setState(undefined, 'background');
        }
      };
      diagram.on('elementRemove', cb);
      return () => diagram.off('elementRemove', cb);
    }, [diagram]);

    if (
      this.hoverNode === undefined ||
      !isNode(this.hoverNode) ||
      (DRAG_DROP_MANAGER.current() && !(DRAG_DROP_MANAGER.current() instanceof MoveDrag))
    ) {
      return svg.g({});
    }

    const node = this.hoverNode;

    if (selection.isDragging()) return svg.g({});

    const sBounds = shouldScale
      ? {
          x: node.bounds.x - SCALE,
          y: node.bounds.y - SCALE,
          w: node.bounds.w + 2 * SCALE,
          h: node.bounds.h + 2 * SCALE,
          r: node.bounds.r
        }
      : node.bounds;

    const children: VNode[] = [];

    node.anchors.forEach((a, idx) => {
      if (a.clip) return;

      const x = node.renderProps.geometry.flipH ? 1 - a.point.x : a.point.x;
      const y = node.renderProps.geometry.flipV ? 1 - a.point.y : a.point.y;
      children.push(
        svg.g(
          {
            transform: `translate(${sBounds.x + x * sBounds.w} ${sBounds.y + y * sBounds.h})`,
            on: {
              mouseover: () => (this.state = 'handle'),
              mouseout: () => {
                this.state = 'background';
                this.clearTimeout();
                this.triggerMouseOut(shouldScale);
              },
              mousedown: e => {
                DRAG_DROP_MANAGER.initiate(
                  new AnchorHandleDrag(node, idx, EventHelper.point(e), props.applicationTriggers)
                );
                this.clearTimeout();
                this.setState(undefined, 'background');
                e.preventDefault();
                e.stopPropagation();
              }
            }
          },
          svg.path({
            class: 'svg-anchor-handle',
            d: `M 0 -${ANCHOR_SIZE}, L ${ANCHOR_SIZE} 0, L 0 ${ANCHOR_SIZE}, L -${ANCHOR_SIZE} 0, L 0 -${ANCHOR_SIZE}`
          })
        )
      );
    });

    return svg.g({}, ...children);
  }

  private setState(node: DiagramElement | undefined, state: State) {
    this.state = state;
    this.hoverNode = node;
    this.redraw();
  }

  private clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  private triggerMouseOut(shouldScale: boolean) {
    this.timeout = window.setTimeout(
      () => {
        if (this.state === 'handle') return;
        this.setState(undefined, 'background');
      },
      shouldScale ? 400 : 50
    );
  }
}
