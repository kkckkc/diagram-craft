import { EventEmitter } from '../utils/event.ts';
import { VERIFY_NOT_REACHED } from '../utils/assert.ts';
import { Transform } from '../geometry/transform.ts';
import { Box } from '../geometry/box.ts';
import { UndoManager } from '../model-editor/undoManager.ts';
import { Viewbox } from './viewBox.ts';
import { deepClone } from '../utils/clone.ts';
import { Point } from '../geometry/point.ts';

export interface DiagramElement {
  id: string;
  type: string;
}

export interface AbstractNode extends DiagramElement {
  type: 'node';
  nodeType: 'group' | string;
  id: string;

  bounds: Box;

  // TODO: We should use interface for this and make it extendable by nodeType
  props?: Record<string, unknown>;
}

export interface AbstractEdge extends DiagramElement {
  type: 'edge';
  id: string;
}

export type DiagramNodeSnapshot = Pick<AbstractNode, 'id' | 'bounds' | 'props'>;

export class DiagramNode implements AbstractNode {
  id: string;
  bounds: Box;
  type: 'node';
  nodeType: 'group' | string;

  parent?: DiagramNode;
  children: DiagramNode[];

  edges: Record<string, DiagramEdge[]>;

  // TODO: We should use interface for this and make it extendable by nodeType
  props?: Record<string, unknown>;

  constructor(id: string, nodeType: 'group' | string, bounds: Box) {
    this.id = id;
    this.bounds = bounds;
    this.type = 'node';
    this.nodeType = nodeType;
    this.children = [];
    this.edges = {};
  }

  removeEdge(edge: DiagramEdge) {
    for (const [anchor, edges] of Object.entries(this.edges)) {
      this.edges[anchor] = edges.filter(e => e !== edge);
    }
  }

  addEdge(anchor: string, edge: DiagramEdge) {
    this.edges[anchor] = [...(this.edges[anchor] ?? []), edge];
  }

  updateEdge(anchor: string, edge: DiagramEdge) {
    if (this.edges[anchor].includes(edge)) return;

    this.removeEdge(edge);
    this.addEdge(anchor, edge);
  }

  clone() {
    const node = new DiagramNode(this.id, this.nodeType, deepClone(this.bounds));
    node.props = deepClone(this.props);
    node.children = this.children.map(c => c.clone());
    return node;
  }

  snapshot() {
    return {
      id: this.id,
      bounds: deepClone(this.bounds),
      props: deepClone(this.props)
    };
  }

  restore(snapshot: DiagramNodeSnapshot) {
    this.id = snapshot.id;
    this.bounds = snapshot.bounds;
    this.props = snapshot.props;
  }

  listEdges(includeChildren = true): DiagramEdge[] {
    return [
      ...Object.values(this.edges ?? {}).flatMap(e => e),
      ...(includeChildren ? this.children.flatMap(c => c.listEdges(includeChildren)) : [])
    ];
  }
}

export type ConnectedEndpoint = { anchor: string; node: DiagramNode };
export type Endpoint = ConnectedEndpoint | { position: Point };

// TODO: Maybe make endpoint a class with this as a method?
//       ...or perhaps a property as discriminator
export const isConnected = (endpoint: Endpoint): endpoint is ConnectedEndpoint =>
  'node' in endpoint;

export class DiagramEdge implements AbstractEdge {
  id: string;
  type: 'edge';

  #start: Endpoint;
  #end: Endpoint;

  constructor(id: string, start: Endpoint, end: Endpoint) {
    this.id = id;
    this.type = 'edge';
    this.#start = start;
    this.#end = end;
  }

  // TODO: This is probably not a sufficient way to calculate the bounding box
  get bounds() {
    return Box.fromCorners(this.startPosition, this.endPosition);
  }

  set bounds(b: Box) {
    this.start = { position: { x: b.pos.x, y: b.pos.y } };
    this.end = { position: { x: b.pos.x + b.size.w, y: b.pos.y + b.size.h } };
  }

  get startPosition() {
    return isConnected(this.start) ? Box.center(this.start.node.bounds) : this.start.position;
  }

  isStartConnected() {
    return isConnected(this.start);
  }

  get endPosition() {
    return isConnected(this.end) ? Box.center(this.end.node.bounds) : this.end.position;
  }

  isEndConnected() {
    return isConnected(this.end);
  }

  set start(start: Endpoint) {
    if (isConnected(this.#start) && isConnected(start)) {
      // both before and after are connected
      if (this.#start.node === start.node) {
        this.#start.node.updateEdge(start.anchor, this);
      } else {
        this.#start.node.removeEdge(this);
        start.node.addEdge(start.anchor, this);
      }
    } else if (isConnected(this.#start)) {
      // before is connected, after is not
      this.#start.node.removeEdge(this);
    } else if (isConnected(start)) {
      // before is not connected, after is connected
      start.node.addEdge(start.anchor, this);
    }

    this.#start = start;
  }

  get start() {
    return this.#start;
  }

  set end(end: Endpoint) {
    if (isConnected(this.#end) && isConnected(end)) {
      // both before and after are connected
      if (this.#end.node === end.node) {
        this.#end.node.updateEdge(end.anchor, this);
      } else {
        this.#end.node.removeEdge(this);
        end.node.addEdge(end.anchor, this);
      }
    } else if (isConnected(this.#end)) {
      // before is connected, after is not
      this.#end.node.removeEdge(this);
    } else if (isConnected(end)) {
      // before is not connected, after is connected
      end.node.addEdge(end.anchor, this);
    }

    this.#end = end;
  }

  get end() {
    return this.#end;
  }

  clone() {
    return new DiagramEdge(this.id, deepClone(this.start), deepClone(this.end));
  }
}

export type Canvas = Omit<Box, 'rotation'>;

export type DiagramEvents = {
  nodechanged: { before: DiagramNode; after: DiagramNode };
  nodeadded: { node: DiagramNode };
  noderemoved: { node: DiagramNode };
  edgechanged: { before: DiagramEdge; after: DiagramEdge };
  edgeadded: { edge: DiagramEdge };
  edgeremoved: { edge: DiagramEdge };
  canvaschanged: { before: Canvas; after: Canvas };
};

export class Diagram<T extends DiagramEvents = DiagramEvents> extends EventEmitter<T> {
  elements: (DiagramEdge | DiagramNode)[];
  readonly nodeLookup: Record<string, DiagramNode> = {};
  readonly edgeLookup: Record<string, DiagramEdge> = {};
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

  constructor(elements: (DiagramEdge | DiagramNode)[]) {
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

  addNode(node: DiagramNode) {
    this.nodeLookup[node.id] = node;
    this.elements.push(node);
    this.emit('nodeadded', { node });
  }

  removeNode(node: DiagramNode) {
    delete this.nodeLookup[node.id];
    this.elements = this.elements.filter(e => e !== node);
    this.emit('noderemoved', { node });
  }

  // TODO: Implement this part
  queryNodes() {
    return Object.values(this.nodeLookup);
  }

  transformElements(elements: (DiagramNode | DiagramEdge)[], transforms: Transform[]) {
    const before = elements.map(n => n.clone());

    for (const el of elements) {
      el.bounds = Transform.box(el.bounds, ...transforms);
    }

    for (const el of elements) {
      if (el.type === 'node' && el.nodeType === 'group') {
        this.transformElements(el.children, transforms);
      }
    }

    for (let i = 0; i < elements.length; i++) {
      this.updateElement(elements[i], before[i]);
    }

    // TODO: Automatically create undoable action?
  }

  addEdge(edge: DiagramEdge) {
    this.edgeLookup[edge.id] = edge;
    this.elements.push(edge);
    this.emit('edgeadded', { edge });
  }

  removeEdge(edge: DiagramEdge) {
    delete this.edgeLookup[edge.id];
    this.elements = this.elements.filter(e => e !== edge);
    this.emit('edgeremoved', { edge });
  }

  updateElement(element: DiagramEdge | DiagramNode, before?: DiagramEdge | DiagramNode) {
    // TODO: We don't have before here
    //       ... should we perhaps remove the before thing
    if (element.type === 'node') {
      this.emit('nodechanged', { before: (before as DiagramNode) ?? element, after: element });
    } else {
      this.emit('edgechanged', { before: (before as DiagramEdge) ?? element, after: element });
    }
  }
}
