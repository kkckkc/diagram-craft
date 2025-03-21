import { SelectionComponent } from './components/SelectionComponent';
import { SelectionMarqueeComponent } from './components/SelectionMarqueeComponent';
import { GridComponent } from './components/GridComponent';
import { Actions, findAndExecuteAction } from './keyMap';
import { DocumentBoundsComponent } from './components/DocumentBoundsComponent';
import { DRAG_DROP_MANAGER, Modifiers } from './dragDropManager';
import { BACKGROUND, Tool, ToolConstructor, ToolType } from './tool';
import { DragLabelComponent } from './components/DragLabelComponent';
import { AnchorHandlesComponent } from '@diagram-craft/canvas/components/AnchorHandlesComponent';
import {
  $cmp,
  Component,
  ComponentVNodeData,
  createEffect,
  Observable
} from './component/component';
import * as svg from './component/vdom-svg';
import * as html from './component/vdom-html';
import { ShapeNodeDefinition } from './shape/shapeNodeDefinition';
import { NodeComponentProps } from './components/BaseNodeComponent';
import { Point } from '@diagram-craft/geometry/point';
import { Box } from '@diagram-craft/geometry/box';
import { Diagram, DiagramEvents } from '@diagram-craft/model/diagram';
import { ViewboxEvents } from '@diagram-craft/model/viewBox';
import { DiagramElement, getTopMostNode, isNode } from '@diagram-craft/model/diagramElement';
import { SelectionState, SelectionStateEvents } from '@diagram-craft/model/selectionState';
import { EventHelper } from '@diagram-craft/utils/eventHelper';
import { EventKey } from '@diagram-craft/utils/event';
import { ShapeEdgeDefinition } from './shape/shapeEdgeDefinition';
import { rawHTML } from './component/vdom';
import styles from './canvas.css?inline';
import { Browser } from './browser';
import { PanTool } from '@diagram-craft/canvas-app/tools/panTool';
import { Context } from './context';
import { unique } from '@diagram-craft/utils/array';
import { isResolvableToRegularLayer, Layer, RegularLayer } from '@diagram-craft/model/diagramLayer';
import { DiagramEdge } from '@diagram-craft/model/diagramEdge';
import { DiagramNode } from '@diagram-craft/model/diagramNode';

const removeSuffix = (s: string) => {
  return s.replace(/---.+$/, '');
};

const getAncestorDiagramElement = (
  e: SVGElement | HTMLElement
):
  | {
      id: string;
      type: 'edge' | 'node';
    }
  | undefined => {
  let element: SVGElement | HTMLElement | null = e;
  while (element) {
    if (element.id.startsWith('node-')) {
      return {
        id: removeSuffix(element.id.slice('node-'.length)),
        type: 'node'
      };
    } else if (element.id.startsWith('edge-')) {
      return {
        id: removeSuffix(element.id.slice('edge-'.length)),
        type: 'edge'
      };
    }
    element = element.parentElement;
  }
  return undefined;
};

type ComponentProps = Props & Actions & { diagram: Diagram };

export class EditableCanvasComponent extends Component<ComponentProps> {
  private svgRef: SVGSVGElement | null = null;
  private tool: Tool | undefined;

  private nodeRefs: Map<string, Component<unknown> | null> = new Map();
  private edgeRefs: Map<string, Component<unknown> | null> = new Map();

  private point: Point = { x: 0, y: 0 };

  private hoverElement = new Observable<string | undefined>(undefined);

  // TODO: Remove this
  setTool(tool: Tool | undefined) {
    this.tool = tool;
    this.redraw();
  }

  render(props: ComponentProps) {
    const diagram = props.diagram;
    const { actionMap, keyMap } = props;

    // State
    const selection = diagram.selectionState;
    const resetTool = () => props.context.tool.set(props.initialTool ?? 'move');

    this.tool ??= new props.tools[props.context.tool.get()]!(
      diagram,
      DRAG_DROP_MANAGER,
      this.svgRef,
      props.context,
      resetTool
    );

    createEffect(() => {
      const cb = (s: { newValue: ToolType }) => {
        this.setTool(
          new props.tools[s.newValue]!(
            diagram,
            DRAG_DROP_MANAGER,
            this.svgRef,
            props.context,
            resetTool
          )
        );
        this.updateToolClassOnSvg(s.newValue);
      };
      props.context.tool.on('change', cb);
      return () => props.context.tool.off('change', cb);
    }, [diagram, props.context.tool]);

    // ---> start useCanvasZoomAndPan

    createEffect(() => {
      const cb = ({ viewbox }: ViewboxEvents['viewbox']) => {
        this.svgRef?.setAttribute('viewBox', viewbox.svgViewboxString);
        this.svgRef?.style.setProperty('--zoom', viewbox.zoomLevel.toString());
      };
      diagram.viewBox.on('viewbox', cb);
      return () => diagram.viewBox.off('viewbox', cb);
    }, [diagram, diagram.viewBox]);

    createEffect(() => {
      if (!this.svgRef) return;

      const cb = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey) {
          const delta = e.deltaY;
          const normalized = -(delta % 3 ? delta * 10 : delta / 3);
          diagram.viewBox.zoom(normalized > 0 ? 1 / 1.008 : 1.008, EventHelper.point(e));
        } else {
          diagram.viewBox.pan({
            x: diagram.viewBox.offset.x + e.deltaX * diagram.viewBox.zoomLevel,
            y: diagram.viewBox.offset.y + e.deltaY * diagram.viewBox.zoomLevel
          });
        }
      };
      this.svgRef!.addEventListener('wheel', cb);
      return () => this.svgRef!.removeEventListener('wheel', cb);
    }, [diagram, this.svgRef]);

    createEffect(() => {
      const cb = () => this.adjustViewbox(diagram, props.offset);
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    }, [diagram]);

    // ---> end useCanvasZoomAndPan

    createEffect(() => {
      const cb = (e: KeyboardEvent) => {
        if (
          e.code === 'Space' &&
          !(e.srcElement as HTMLElement | undefined)?.className.includes('svg-node__text') &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          if (this.tool?.type !== 'pan') {
            props.context.tool.set('pan');
          }
          return;
        }

        if (!findAndExecuteAction(e, { point: this.point }, keyMap, actionMap)) {
          this.tool?.onKeyDown(e);
        }
      };

      document.addEventListener('keydown', cb);
      return () => document.removeEventListener('keydown', cb);
    }, [diagram]);

    createEffect(() => {
      const cb = (e: KeyboardEvent) => this.tool?.onKeyUp(e);
      document.addEventListener('keyup', cb);
      return () => document.removeEventListener('keyup', cb);
    }, [diagram]);

    createEffect(() => {
      const highlightCb = (e: { element: DiagramElement }) => this.redrawElements([e.element]);
      diagram.on('elementHighlighted', highlightCb);
      return () => {
        diagram.off('elementHighlighted', highlightCb);
      };
    }, [diagram]);

    createEffect(() => {
      const commitCb = (e: { updated: DiagramElement[] }) => this.redrawElements(e.updated);
      diagram.on('uowCommit', commitCb);
      return () => {
        diagram.off('uowCommit', commitCb);
      };
    }, [diagram]);

    // Need to redraw each selected element on zoom or pan
    // as some of the control nodes will change dimensions
    createEffect(() => {
      const cb = ({ type }: ViewboxEvents['viewbox']) => {
        if (type === 'pan') return;
        for (const e of this.currentProps?.diagram?.selectionState.elements ?? []) {
          this.redrawElements([e]);
        }
      };
      diagram.viewBox.on('viewbox', cb);
      return () => {
        diagram.viewBox.off('viewbox', cb);
      };
    }, [diagram]);

    this.onDiagramRedraw('elementAdd', diagram);
    this.onDiagramRedraw('elementRemove', diagram);
    this.onDiagramRedraw('change', diagram);

    this.onSelectionRedrawElement(selection);

    const onEdgeDoubleClick = (id: string, coord: Point) => {
      actionMap['EDGE_TEXT_ADD']?.execute({
        point: diagram.viewBox.toDiagramPoint(coord),
        id
      });
    };

    const canvasState = {
      context: props.context,
      diagram
    };

    return html.div(
      {
        class: 'light-theme canvas-wrapper'
      },
      [
        html.textarea({ id: 'clipboard', style: 'position: absolute; left: -4000px' }),
        this.subComponent($cmp(DragLabelComponent), { ...canvasState }),
        html.svg(
          {
            ...(props.width ? { width: props.width } : {}),
            ...(props.height ? { height: props.height } : {}),
            id: `diagram-${diagram.id}`,
            class: [
              props.className ?? 'canvas editable-canvas',
              Browser.isChrome() ? 'browser-chrome' : ''
            ].join(' '),
            preserveAspectRatio: 'none',
            viewBox: diagram.viewBox.svgViewboxString,
            style: `user-select: none`,
            hooks: {
              onInsert: node => {
                this.svgRef = node.el! as SVGSVGElement;
                this.adjustViewbox(diagram, props.offset);

                // Note: this causes an extra redraw, but it's necessary to ensure that
                //       the wheel events (among others) are bound correctly
                this.redraw();
              },
              onRemove: () => {
                this.svgRef = null;
              }
            },
            on: {
              click: e => {
                props.onClick?.(e);
              },
              mousedown: e => {
                if (e.button === 1) {
                  const currentTool = props.context.tool.get();
                  const panTool = new PanTool(
                    diagram,
                    DRAG_DROP_MANAGER,
                    this.svgRef,
                    props.context,
                    () => {
                      props.context.tool.set(currentTool);
                    }
                  );
                  this.setTool(panTool);
                  panTool.setResetOnMouseUp(true);
                  this.updateToolClassOnSvg('pan');
                  panTool.onMouseDown(BACKGROUND, EventHelper.point(e), e);
                }
                if (e.button !== 0) return;
                this.tool!.onMouseDown(BACKGROUND, EventHelper.point(e), e);
              },
              mouseover: e => {
                const el = getAncestorDiagramElement(e.target as SVGElement);
                if (!el) return;
                this.tool!.onMouseOver(el.id, EventHelper.point(e), e.currentTarget!);
                props.onMouseOver?.(e, el);
                this.hoverElement.value = el.id;
              },
              mouseout: e => {
                const el = getAncestorDiagramElement(e.target as SVGElement);
                if (!el) return;
                this.tool!.onMouseOut(el.id, EventHelper.point(e), e.currentTarget!);
                props.onMouseOut?.(e, el);
                this.hoverElement.value = undefined;
              },
              mouseup: e => this.tool!.onMouseUp(EventHelper.point(e), e, e.currentTarget!),
              mousemove: e => {
                // TODO: Could we cache this and only update in case a resize happens?
                const b = (e.currentTarget! as SVGSVGElement).getBoundingClientRect();
                this.tool!.onMouseMove(
                  {
                    x: e.clientX - b.x,
                    y: e.clientY - b.y
                  },
                  e,
                  e.currentTarget!
                );
                if (e.x >= b.left && e.x <= b.right && e.y >= b.top && e.y <= b.bottom) {
                  this.point = diagram.viewBox.toDiagramPoint({
                    x: e.x - b.left,
                    y: e.y - b.top
                  });
                }
              },
              contextmenu: event => {
                const bounds = this.svgRef!.getBoundingClientRect();
                const point = {
                  x: event.clientX - bounds.x,
                  y: event.clientY - bounds.y
                };

                const isClickOnSelection = Box.contains(
                  selection.bounds,
                  diagram.viewBox.toDiagramPoint(point)
                );

                if (isClickOnSelection) {
                  props.context.ui.showContextMenu(
                    'selection',
                    diagram.viewBox.toDiagramPoint(point),
                    event,
                    {}
                  );
                } else {
                  props.context.ui.showContextMenu(
                    'canvas',
                    diagram.viewBox.toDiagramPoint(point),
                    event,
                    {}
                  );
                }

                props.onContextMenu?.(event);
              },

              drag: e => {
                props.onDrag?.(e);
              },
              drop: e => {
                props.onDrop?.(e);
              },
              dragover: e => {
                props.onDragOver?.(e);
              }
            }
          },
          [
            svg.style({}, rawHTML(styles)),
            svg.defs(
              svg.filter(
                { id: 'reflection-filter', filterUnits: 'objectBoundingBox' },
                svg.feGaussianBlur({ stdDeviation: 0.5 })
              )
            ),

            this.subComponent($cmp(DocumentBoundsComponent), { ...canvasState }),

            this.subComponent($cmp(GridComponent), { ...canvasState }),

            svg.g(
              {},
              ...diagram.layers.visible.flatMap(layer => {
                if (!isResolvableToRegularLayer(layer)) return null;
                return this.renderLayer(layer, diagram, onEdgeDoubleClick, props);
              })
            ),

            this.tool.type === 'move'
              ? this.subComponent($cmp(SelectionComponent), { ...canvasState })
              : svg.g({}),

            this.subComponent($cmp(SelectionMarqueeComponent), { ...canvasState }),

            this.tool.type === 'move'
              ? this.subComponent($cmp(AnchorHandlesComponent), {
                  ...canvasState,
                  hoverElement: this.hoverElement
                })
              : svg.g({})
          ]
        )
      ]
    );
  }

  private renderLayer(
    layer: Layer<RegularLayer>,
    $d: Diagram,
    onEdgeDoubleClick: (id: string, coord: Point) => void,
    props: ComponentProps
  ) {
    const diagram = $d;
    return layer.resolveForced().elements.map(e => {
      const id = e.id;

      e.activeDiagram = $d;

      if (e.type === 'edge') {
        const edge = e as DiagramEdge;
        const edgeDef = diagram.document.edgeDefinitions.get(edge.renderProps.shape);

        return this.subComponent(
          () => new (edgeDef as ShapeEdgeDefinition).component!(edgeDef as ShapeEdgeDefinition),
          {
            key: `edge-${id}`,
            onDoubleClick: onEdgeDoubleClick,
            onMouseDown: (id: string, coord: Point, modifiers: Modifiers) =>
              this.tool!.onMouseDown(id, coord, modifiers),
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
      } else {
        const node = e as DiagramNode;
        const nodeDef = diagram.document.nodeDefinitions.get(node.nodeType);

        return this.subComponent<NodeComponentProps>(
          () => new (nodeDef as ShapeNodeDefinition).component!(nodeDef as ShapeNodeDefinition),
          {
            key: `node-${node.nodeType}-${id}`,
            element: node,
            onMouseDown: (id: string, coord: Point, modifiers: Modifiers) =>
              this.tool!.onMouseDown(id, coord, modifiers),
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
      }
    });
  }

  private updateToolClassOnSvg(s: ToolType) {
    for (const cl of this.svgRef?.classList ?? []) {
      if (cl.startsWith('tool-')) {
        this.svgRef?.classList.remove(cl);
      }
    }
    this.svgRef?.classList.add(`tool-${s}`);
  }

  private redrawElements = (e: DiagramElement[]) => {
    const resolvedElements = unique(e.map(e => (isNode(e) ? getTopMostNode(e) : e)));
    for (const element of resolvedElements) {
      if (isNode(element)) {
        this.nodeRefs.get(element.id)?.redraw();
        for (const edge of element.listEdges()) {
          this.edgeRefs.get(edge.id)?.redraw();
        }
      } else {
        this.edgeRefs.get(element.id)?.redraw();
      }
    }
  };

  private onDiagramRedraw(eventName: EventKey<DiagramEvents>, diagram: Diagram) {
    createEffect(() => {
      const cb = () => this.redraw();
      diagram.on(eventName, cb);
      return () => diagram.off(eventName, cb);
    }, [diagram]);
  }

  private onSelectionRedrawElement(selection: SelectionState) {
    createEffect(() => {
      const cb = (e: SelectionStateEvents['add'] | SelectionStateEvents['remove']) =>
        this.redrawElements([e.element]);
      selection.on('add', cb);
      return () => selection.off('add', cb);
    }, [selection]);

    createEffect(() => {
      const cb = (e: SelectionStateEvents['add'] | SelectionStateEvents['remove']) =>
        this.redrawElements([e.element]);
      selection.on('remove', cb);
      return () => selection.off('remove', cb);
    }, [selection]);
  }

  private adjustViewbox(diagram: Diagram, _offset: Point) {
    const rect = this.svgRef!.getBoundingClientRect();

    diagram.viewBox.dimensions = {
      w: Math.floor(rect.width * diagram.viewBox.zoomLevel),
      h: Math.floor(rect.height * diagram.viewBox.zoomLevel)
    };
    diagram.viewBox.windowSize = {
      w: Math.floor(rect.width),
      h: Math.floor(rect.height)
    };
  }

  getSvgElement(): SVGSVGElement {
    return document.getElementById(
      `diagram-${this.currentProps?.diagram.id}`
    )! as unknown as SVGSVGElement;
  }
}

export type Props = {
  offset: Point;
  context: Context;
  className?: string;
  diagram: Diagram;
  tools: Partial<Record<ToolType, ToolConstructor>>;
  initialTool?: ToolType;
  width?: string | number;
  height?: string | number;
  onClick?: (e: MouseEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDrag?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onMouseOver?: (e: MouseEvent, el: { type: 'edge' | 'node'; id: string }) => void;
  onMouseOut?: (e: MouseEvent, el: { type: 'edge' | 'node'; id: string }) => void;
};

export type CanvasState = {
  context: Context;
  diagram: Diagram;
};
