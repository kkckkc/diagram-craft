import { Box } from '../geometry/box.ts';
import { assert } from '../utils/assert.ts';
import { round } from '../utils/math.ts';
import { Transform } from '../geometry/transform.ts';
import { deepClone } from '../utils/clone.ts';
import { Diagram, DiagramElement } from './diagram.ts';
import { Point } from '../geometry/point.ts';
import { DiagramEdge } from './diagramEdge.ts';

type Anchor = {
  point: Point;
  clip?: boolean;
};

export interface AbstractNode extends DiagramElement {
  type: 'node';
  nodeType: 'group' | string;
  id: string;
  bounds: Box;

  // TODO: Maybe we should make this readonly (deep)?
  props: NodeProps;
  anchors?: Anchor[];
}

export type DiagramNodeSnapshot = Pick<AbstractNode, 'id' | 'bounds' | 'props'>;

export class DiagramNode implements AbstractNode {
  id: string;
  bounds: Box;
  type: 'node';
  nodeType: 'group' | string;

  parent?: DiagramNode;
  children: DiagramNode[];

  edges: Record<number, DiagramEdge[]>;

  props: NodeProps = {};

  _anchors?: Anchor[];

  diagram?: Diagram;

  constructor(id: string, nodeType: 'group' | string, bounds: Box, anchors: Anchor[] | undefined) {
    this.id = id;
    this.bounds = bounds;
    this.type = 'node';
    this.nodeType = nodeType;
    this.children = [];
    this.edges = {};
    this._anchors = anchors;
  }

  commitChanges() {
    this.invalidateAnchors();
  }

  // TODO: Need to make sure this is called when e.g. props are changed
  invalidateAnchors() {
    if (!this.diagram) {
      console.log(this);
    }
    assert.present(this.diagram);

    this._anchors = [];
    this._anchors.push({ point: { x: 0.5, y: 0.5 }, clip: true });

    const def = this.diagram!.nodeDefinitions.get(this.nodeType);

    const path = def.getBoundingPath(this);

    for (const p of path.segments) {
      const { x, y } = p.point(0.5);
      const lx = round((x - this.bounds.pos.x) / this.bounds.size.w);
      const ly = round((y - this.bounds.pos.y) / this.bounds.size.h);

      this._anchors.push({ point: { x: lx, y: ly }, clip: false });
    }

    this.diagram.updateElement(this);
  }

  transform(transforms: Transform[]) {
    this.bounds = Transform.box(this.bounds, ...transforms);
    this.invalidateAnchors();

    if (this.nodeType === 'group') {
      for (const child of this.children) {
        child.transform(transforms);
      }
    }
  }

  get anchors(): Anchor[] {
    if (this._anchors === undefined) this.invalidateAnchors();

    return this._anchors ?? [];
  }

  removeEdge(edge: DiagramEdge) {
    for (const [anchor, edges] of Object.entries(this.edges)) {
      this.edges[anchor as unknown as number] = edges.filter(e => e !== edge);
    }
  }

  addEdge(anchor: number, edge: DiagramEdge) {
    this.edges[anchor] = [...(this.edges[anchor] ?? []), edge];
  }

  updateEdge(anchor: number, edge: DiagramEdge) {
    if (this.edges[anchor]?.includes(edge)) return;

    this.removeEdge(edge);
    this.addEdge(anchor, edge);
  }

  getAnchorPosition(anchor: number) {
    return {
      x: this.bounds.pos.x + this.bounds.size.w * this.getAnchor(anchor).point.x,
      y: this.bounds.pos.y + this.bounds.size.h * this.getAnchor(anchor).point.y
    };
  }

  getAnchor(anchor: number) {
    return this.anchors[anchor >= this.anchors.length ? 0 : anchor];
  }

  // TODO: This is a bit problematic since it has a relation to edge
  //       should probably rename this to something else - e.g. copyNode
  clone() {
    const node = new DiagramNode(
      this.id,
      this.nodeType,
      deepClone(this.bounds),
      this._anchors ? [...this._anchors] : undefined
    );
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