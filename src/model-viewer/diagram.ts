import { Direction } from '../geometry/direction.ts';
import { Range } from '../geometry/range.ts';
import { EventEmitter } from '../utils/event.ts';
import { VERIFY_NOT_REACHED } from '../utils/assert.ts';
import { Transform, TransformFactory } from '../geometry/transform.ts';
import { Point } from '../geometry/point.ts';
import { Box } from '../geometry/box.ts';
import { Line } from '../geometry/line.ts';
import { UndoableAction, UndoManager } from '../model-editor/undoManager.ts';
import { Extent } from '../geometry/extent.ts';

/*
type BoundsCriteria = {
  criteria: 'bounds';
  bounds: Box;
  type: ('intersect' | 'corners' | 'center' | 'alignment-anchors')[];
  mode: 'any' | 'all';
};

type NodeQueryCriteria = BoundsCriteria;

type NodeQuery = {
  criteria: NodeQueryCriteria[];
};
*/

const cloneNodeBounds = (node: ResolvedNodeDef): ResolvedNodeDef => {
  return {
    ...node,
    bounds: {
      pos: { ...node.bounds.pos },
      size: { ...node.bounds.size },
      rotation: node.bounds.rotation
    },
    children: node.children.map(c => cloneNodeBounds(c))
  };
};

export interface AbstractNodeDef {
  type: 'node';
  nodeType: 'group' | string;
  id: string;

  bounds: Box;

  // TODO: We should use interface for this and make it extendable by nodeType
  props?: Record<string, unknown>;
}

export interface AbstractEdgeDef {
  type: 'edge';
  id: string;
}

export interface ResolvedNodeDef extends AbstractNodeDef {
  parent?: ResolvedNodeDef;

  edges?: Record<string, ResolvedEdgeDef[]>;
  children: ResolvedNodeDef[];
}

export interface ResolvedEdgeDef extends AbstractEdgeDef {
  start: { anchor: string; node: ResolvedNodeDef };
  end: { anchor: string; node: ResolvedNodeDef };
}

export type Canvas = Omit<Box, 'rotation'>;

export type DiagramEvents = {
  nodechanged: { before: ResolvedNodeDef; after: ResolvedNodeDef };
  nodeadded: { node: ResolvedNodeDef };
  noderemoved: { node: ResolvedNodeDef };
  edgechanged: { before: ResolvedEdgeDef; after: ResolvedEdgeDef };
  edgeadded: { edge: ResolvedEdgeDef };
  edgeremoved: { edge: ResolvedEdgeDef };
  canvaschanged: { before: Canvas; after: Canvas };
};

export type ViewboxEvents = {
  viewbox: { viewbox: Viewbox };
};

class Viewbox extends EventEmitter<ViewboxEvents> {
  #dimensions: Extent;

  #offset: Point = {
    x: 0,
    y: 0
  };

  zoomLevel = 1;

  windowSize: Extent;

  constructor(size: Extent) {
    super();
    this.#dimensions = size;
    this.windowSize = size;
  }

  toDiagramPoint(point: Point) {
    const transforms = TransformFactory.fromTo(
      { pos: { x: 0, y: 0 }, size: { w: this.windowSize.w, h: this.windowSize.h }, rotation: 0 },
      { pos: { x: this.#offset.x, y: this.#offset.y }, size: this.#dimensions, rotation: 0 }
    );
    return Transform.point(point, ...transforms);
  }

  zoom(point: Point, factor: number) {
    const p = this.toDiagramPoint(point);

    this.#offset = {
      x: this.#offset.x - (p.x - this.#offset.x) * (factor - 1),
      y: this.#offset.y - (p.y - this.#offset.y) * (factor - 1)
    };
    this.#dimensions = {
      w: this.#dimensions.w * factor,
      h: this.#dimensions.h * factor
    };
    this.zoomLevel *= factor;

    this.emit('viewbox', { viewbox: this });
  }

  pan(point: Point) {
    this.#offset = point;
    this.emit('viewbox', { viewbox: this });
  }

  get dimensions(): Extent {
    return this.#dimensions;
  }

  set dimensions(d: Extent) {
    this.#dimensions = d;
    this.emit('viewbox', { viewbox: this });
  }

  get offset(): Point {
    return this.#offset;
  }

  get svgViewboxString() {
    return `${this.#offset.x} ${this.#offset.y} ${this.#dimensions.w} ${this.#dimensions.h}`;
  }
}

export class Diagram extends EventEmitter<DiagramEvents> {
  elements: (ResolvedEdgeDef | ResolvedNodeDef)[];
  readonly nodeLookup: Record<string, ResolvedNodeDef> = {};
  readonly edgeLookup: Record<string, ResolvedEdgeDef> = {};
  readonly undoManager = new UndoManager();

  #canvas: Canvas = {
    pos: { x: 0, y: 0 },
    size: {
      w: 640,
      h: 640
    }
  };

  viewBox = new Viewbox(this.#canvas.size);

  // TODO: Add listener/event on grid change
  readonly grid = {
    x: 20,
    y: 20
  };

  constructor(elements: (ResolvedEdgeDef | ResolvedNodeDef)[]) {
    super();
    this.elements = elements;

    for (const e of this.elements) {
      if (e.type === 'edge') {
        this.edgeLookup[e.id] = e;
      } else if (e.type === 'node') {
        this.nodeLookup[e.id] = e;
      } else {
        VERIFY_NOT_REACHED();
      }
    }
  }

  get canvas() {
    return this.#canvas;
  }

  set canvas(b: Canvas) {
    const before = this.#canvas;
    this.#canvas = b;
    this.emit('canvaschanged', { before, after: b });

    console.log('CANVAS CHANGED');
  }

  newid() {
    return Math.random().toString(36).substring(2, 9);
  }

  addNode(node: ResolvedNodeDef) {
    this.nodeLookup[node.id] = node;
    this.elements.push(node);
    this.emit('nodeadded', { node });
  }

  removeNode(node: ResolvedNodeDef) {
    delete this.nodeLookup[node.id];
    this.elements = this.elements.filter(e => e !== node);
    this.emit('noderemoved', { node });
  }

  updateNodeProps(node: ResolvedNodeDef, props: Record<string, unknown>) {
    node.props = props;
    // TODO: Need to keep a before state
    this.emit('nodechanged', { before: node, after: node });
  }

  // TODO: Implement this part
  queryNodes() {
    return Object.values(this.nodeLookup);
  }

  transformNodes(nodes: ResolvedNodeDef[], transforms: Transform[]) {
    const before = nodes.map(n => cloneNodeBounds(n));

    for (const node of nodes) {
      node.bounds = Transform.box(node.bounds, ...transforms);
    }

    for (const node of nodes) {
      if (node.nodeType === 'group') {
        this.transformNodes(node.children, transforms);
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      this.emit('nodechanged', { before: before[i], after: nodes[i] });
    }

    // TODO: Automatically create undoable action?
  }

  addEdge(edge: ResolvedEdgeDef) {
    this.edgeLookup[edge.id] = edge;
    this.elements.push(edge);
    this.emit('edgeadded', { edge });
  }

  removeEdge(edge: ResolvedEdgeDef) {
    delete this.edgeLookup[edge.id];
    this.elements = this.elements.filter(e => e !== edge);
    this.emit('edgeremoved', { edge });
  }
}

// TODO: Quite a bit of this should not be in diagram.ts
type BaseAnchor = {
  line: Line;
  axis: Axis;
  matchDirection?: Direction;
  respectDirection?: boolean;
};

export type DistancePair = {
  // TODO: This is a bit redundant as the distance will be the same for all pairs
  distance: number;

  pointA: Point;
  pointB: Point;
};

export type DistancePairWithRange = DistancePair & {
  rangeA: Range;
  rangeB: Range;
};

export type Anchor = BaseAnchor &
  (
    | {
        type: 'source' | 'canvas' | 'grid';
      }
    | {
        type: 'size';
        size: number;
        node: ResolvedNodeDef;
        distancePairs: DistancePair[];
      }
    | {
        type: 'node';
        node: ResolvedNodeDef;
      }
    | {
        type: 'distance';
        distancePairs: DistancePairWithRange[];
      }
  );

export type AnchorType = Anchor['type'];

export type AnchorOfType<T extends AnchorType> = Anchor & { type: T };

export type Axis = 'h' | 'v';

export const Axis = {
  orthogonal: (axis: Axis): Axis => (axis === 'h' ? 'v' : 'h'),
  axises: (): Axis[] => ['h', 'v'],
  toXY: (axis: Axis): 'x' | 'y' => (axis === 'h' ? 'x' : 'y')
};

export const NodeHelper = {
  edges: (node: ResolvedNodeDef): ResolvedEdgeDef[] => {
    return [
      ...Object.values(node.edges ?? {}).flatMap(e => e),
      ...node.children.flatMap(c => NodeHelper.edges(c))
    ];
  },

  // TODO: Maybe include use corners for rotated nodes somehow
  anchors: (node: Box, type: 'source' = 'source'): Anchor[] => {
    const center: Anchor[] = [
      {
        line: {
          from: { x: node.pos.x, y: node.pos.y + node.size.h / 2 },
          to: { x: node.pos.x + node.size.w, y: node.pos.y + node.size.h / 2 }
        },
        axis: 'h',
        type
      },
      {
        line: {
          from: { x: node.pos.x + node.size.w / 2, y: node.pos.y },
          to: { x: node.pos.x + node.size.w / 2, y: node.pos.y + node.size.h }
        },
        axis: 'v',
        type
      }
    ];

    if (node.rotation !== 0) return center;

    center.push({
      line: {
        from: { x: node.pos.x, y: node.pos.y },
        to: { x: node.pos.x + node.size.w, y: node.pos.y }
      },
      axis: 'h',
      type,
      matchDirection: 'n'
    });
    center.push({
      line: {
        from: { x: node.pos.x, y: node.pos.y + node.size.h },
        to: { x: node.pos.x + node.size.w, y: node.pos.y + node.size.h }
      },
      axis: 'h',
      type,
      matchDirection: 's'
    });
    center.push({
      line: {
        from: { x: node.pos.x, y: node.pos.y },
        to: { x: node.pos.x, y: node.pos.y + node.size.h }
      },
      axis: 'v',
      type,
      matchDirection: 'w'
    });
    center.push({
      line: {
        from: { x: node.pos.x + node.size.w, y: node.pos.y },
        to: { x: node.pos.x + node.size.w, y: node.pos.y + node.size.h }
      },
      axis: 'v',
      type,
      matchDirection: 'e'
    });
    return center;
  }
};

class AbstractTransformAction implements UndoableAction {
  private nodes: ResolvedNodeDef[] = [];
  private source: Box[] = [];
  private target: Box[] = [];
  private diagram: Diagram;

  constructor(source: Box[], target: Box[], nodes: ResolvedNodeDef[], diagram: Diagram) {
    this.diagram = diagram;
    this.nodes.push(...nodes);
    this.source.push(...source);
    this.target.push(...target);
  }

  undo() {
    this.transformNodesAction(this.target, this.source);
  }

  redo() {
    this.transformNodesAction(this.source, this.target);
  }

  private transformNodesAction(source: Box[], target: Box[]): void {
    for (let i = 0; i < this.nodes.length; i++) {
      this.diagram.transformNodes([this.nodes[i]], TransformFactory.fromTo(source[i], target[i]));
    }
    this.diagram.undoManager.clearPending();
  }
}

export class MoveAction extends AbstractTransformAction {}

export class RotateAction extends AbstractTransformAction {}

export class ResizeAction extends AbstractTransformAction {}

export class NodeAddAction implements UndoableAction {
  constructor(
    private readonly nodes: ResolvedNodeDef[],
    private readonly diagram: Diagram
  ) {}

  undo() {
    this.nodes.forEach(node => this.diagram.removeNode(node));
    this.diagram.undoManager.clearPending();
  }

  redo() {
    this.nodes.forEach(node => this.diagram.addNode(node));
    this.diagram.undoManager.clearPending();
  }
}
