import { Box } from '../geometry/box.ts';
import { Transform } from '../geometry/transform.ts';
import { ChangeType, Diagram } from './diagram.ts';
import { Point } from '../geometry/point.ts';
import { DiagramNode, DuplicationContext } from './diagramNode.ts';
import { AbstractEdge, LabelNode, Waypoint } from './types.ts';
import { Layer } from './diagramLayer.ts';
import { buildEdgePath } from './edgePathBuilder.ts';
import { LengthOffsetOnPath, TimeOffsetOnPath } from '../geometry/pathPosition.ts';
import { Vector } from '../geometry/vector.ts';
import { newid } from '../utils/id.ts';
import { deepClone } from '../utils/clone.ts';
import { UnitOfWork } from './unitOfWork.ts';
import { DiagramElement, isEdge, isNode } from './diagramElement.ts';
import { UndoableAction } from './undoManager.ts';
import { isDifferent } from '../utils/math.ts';
import { isHorizontal, isParallel, isPerpendicular, isReadable, isVertical } from './labelNode.ts';

export type ConnectedEndpoint = { anchor: number; node: DiagramNode };
export type Endpoint = ConnectedEndpoint | { position: Point };

export const isConnected = (endpoint: Endpoint): endpoint is ConnectedEndpoint =>
  'node' in endpoint;

export type ResolvedLabelNode = LabelNode & {
  node: DiagramNode;
};

export type Intersection = {
  point: Point;
  type: 'above' | 'below';
};

export class DiagramEdge implements AbstractEdge {
  readonly id: string;
  readonly type = 'edge';
  readonly props: EdgeProps = {};

  #intersections: Intersection[] = [];

  waypoints: ReadonlyArray<Waypoint> | undefined;

  diagram: Diagram;
  layer: Layer;
  parent?: DiagramNode;

  #start: Endpoint;
  #end: Endpoint;
  #labelNodes?: ReadonlyArray<ResolvedLabelNode>;

  constructor(
    id: string,
    start: Endpoint,
    end: Endpoint,
    props: EdgeProps,
    midpoints: ReadonlyArray<Waypoint>,
    diagram: Diagram,
    layer: Layer
  ) {
    this.id = id;
    this.#start = start;
    this.#end = end;
    this.props = props;
    this.waypoints = midpoints;
    this.diagram = diagram;
    this.layer = layer;

    this.diagram.on('change', this.invalidate.bind(this));
    this.diagram.on('elementChange', ({ element }) => {
      if (
        (isConnected(this.#start) && element === this.#start.node) ||
        (isConnected(this.#end) && element === this.#end.node) ||
        element === this
      ) {
        this.invalidate();
      } else if (this.#labelNodes?.find(ln => ln.node === element)) {
        // TODO: Note that this can cause infinite recursion
        UnitOfWork.execute(this.diagram, uow => {
          this.adjustLabelNodePosition(uow);
        });
      }
    });
  }

  get intersections() {
    return this.#intersections;
  }

  get labelNodes() {
    return this.#labelNodes;
  }

  set labelNodes(labelNodes: ReadonlyArray<ResolvedLabelNode> | undefined) {
    this.#labelNodes = labelNodes;
    this.invalidate();
  }

  isLocked() {
    return this.layer.isLocked() ?? false;
  }

  // TODO: This is probably not a sufficient way to calculate the bounding box
  get bounds() {
    return Box.fromCorners(this.startPosition, this.endPosition);
  }

  set bounds(b: Box) {
    if (!isConnected(this.start)) this.start = { position: { x: b.pos.x, y: b.pos.y } };
    if (!isConnected(this.end))
      this.end = { position: { x: b.pos.x + b.size.w, y: b.pos.y + b.size.h } };
  }

  path() {
    // TODO: We should be able to cache this, and then invalidate it when the edge changes (see invalidate())
    return buildEdgePath(this, this.props.routing?.rounding ?? 0);
  }

  transform(transforms: ReadonlyArray<Transform>, uow: UnitOfWork, _type: ChangeType) {
    this.bounds = Transform.box(this.bounds, ...transforms);

    this.waypoints = this.waypoints?.map(w => {
      const absoluteControlPoints = (w.controlPoints ?? []).map(cp => Point.add(w.point, cp));
      const transformedControlPoints = absoluteControlPoints.map(cp =>
        Transform.point(cp, ...transforms)
      );
      const transformedPoint = Transform.point(w.point, ...transforms);
      const relativeControlPoints = transformedControlPoints.map(cp =>
        Point.subtract(cp, transformedPoint)
      );

      return {
        point: transformedPoint,
        controlPoints: w.controlPoints ? (relativeControlPoints as [Point, Point]) : undefined
      };
    });

    this.recalculateIntersections(uow, true);
  }

  update() {
    const uow = new UnitOfWork(this.diagram);
    this.recalculateIntersections(uow, true);
    uow.updateElement(this);
    uow.commit();
  }

  duplicate(ctx?: DuplicationContext) {
    const edge = new DiagramEdge(
      newid(),
      this.start,
      this.end,
      deepClone(this.props),
      deepClone(this.waypoints ?? []),
      this.diagram,
      this.layer
    );

    ctx?.targetElementsInGroup.set(this.id, edge);

    // Clone any label nodes
    const newLabelNodes: ResolvedLabelNode[] = [];
    for (const l of edge.labelNodes ?? []) {
      const newNode = l.node.duplicate(ctx);
      newLabelNodes.push({
        ...l,
        node: newNode
      });
      newNode.props.labelForEdgeId = edge.id;
    }
    edge.labelNodes = newLabelNodes;

    return edge;
  }

  get startPosition() {
    return isConnected(this.start)
      ? this.start.node.getAnchorPosition(this.start.anchor)
      : this.start.position;
  }

  isStartConnected() {
    return isConnected(this.start);
  }

  get endPosition() {
    return isConnected(this.end)
      ? this.end.node.getAnchorPosition(this.end.anchor)
      : this.end.position;
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

  flip() {
    const start = this.#start;
    const end = this.#end;

    if (isConnected(this.#start)) {
      this.#start.node.removeEdge(this);
    }

    if (isConnected(this.#end)) {
      this.#end.node.removeEdge(this);
    }

    this.#start = end;
    this.#end = start;

    if (isConnected(this.#start)) {
      this.#start.node.addEdge(this.#start.anchor, this);
    }
    if (isConnected(this.#end)) {
      this.#end.node.addEdge(this.#end.anchor, this);
    }
  }

  invalidate() {
    const uow = new UnitOfWork(this.diagram);
    this.recalculateIntersections(uow, true);
    this.adjustLabelNodePosition(uow);
    uow.commit();
  }

  // TODO: Not sure we want UI logic in the model
  onDrop(
    coord: Point,
    elements: ReadonlyArray<DiagramElement>,
    uow: UnitOfWork,
    _changeType: ChangeType,
    operation: string
  ): UndoableAction | undefined {
    if (elements.length !== 1 || !isNode(elements[0])) return undefined;

    if (operation === 'split') {
      return this.onDropSplit(elements[0], uow);
    } else {
      return this.onDropAttachAsLabel(elements[0], coord, uow);
    }
  }

  private onDropSplit(element: DiagramNode, uow: UnitOfWork): UndoableAction | undefined {
    // We will attach to the center point anchor
    const anchor = 0;

    // TODO: This requires some work to support dropping on multi-segment edges
    const newEdge = new DiagramEdge(
      newid(),
      { anchor, node: element },
      this.end,
      deepClone(this.props),
      [],
      this.diagram,
      this.layer
    );
    element.addEdge(anchor, newEdge);
    this.layer.addElement(newEdge, uow);

    this.end = { anchor: anchor, node: element };

    uow.updateElement(this);

    // TODO: Support undo
    return undefined;
  }

  private onDropAttachAsLabel(
    element: DiagramNode,
    coord: Point,
    uow: UnitOfWork
  ): UndoableAction | undefined {
    const path = this.path();
    const projection = path.projectPoint(coord);

    this.labelNodes = [
      ...(this.labelNodes ?? []),
      {
        id: element.id,
        node: element,
        offset: Point.ORIGIN,
        timeOffset: LengthOffsetOnPath.toTimeOffsetOnPath(projection, path).pathT,
        type: 'horizontal'
      }
    ];

    element.props.labelForEdgeId = this.id;

    // TODO: Perhaps create a helper to add an element as a label edge
    if (this.parent) {
      if (element.parent) {
        element.parent.children = element.parent.children.filter(c => c !== element);
        uow.updateElement(element.parent);
      }

      element.parent = this.parent;
      this.parent.children = [...this.parent.children, element];
      uow.updateElement(this.parent);
    }

    uow.updateElement(element);
    uow.updateElement(this);

    // TODO: Support undo
    return undefined;
  }

  private recalculateIntersections(uow: UnitOfWork, propagate = false) {
    if (!this.diagram.mustCalculateIntersections) return;

    let currentEdgeHasBeenSeen = false;
    const path = this.path();
    const intersections: Intersection[] = [];
    for (const edge of this.diagram.visibleElements()) {
      if (edge === this) {
        currentEdgeHasBeenSeen = true;
        continue;
      }
      if (!isEdge(edge)) continue;

      const otherPath = edge.path();
      const intersectionsWithOther = path.intersections(otherPath);
      intersections.push(
        ...intersectionsWithOther.map(e => ({
          point: e.point,
          type: (currentEdgeHasBeenSeen ? 'below' : 'above') as Intersection['type']
        }))
      );
      if (propagate) {
        edge.recalculateIntersections(uow, false);
      }
    }

    // TODO: Maybe use deep-equals here?
    if (this.#intersections !== intersections) {
      this.#intersections = intersections;
      uow.updateElement(this);
    }
  }

  private adjustLabelNodePosition(uow: UnitOfWork) {
    if (!this.labelNodes || this.labelNodes.length === 0) return;

    const path = this.path();

    for (const labelNode of this.labelNodes) {
      const pathD = TimeOffsetOnPath.toLengthOffsetOnPath({ pathT: labelNode.timeOffset }, path);
      const attachmentPoint = path.pointAt(pathD);

      let newCenterPoint = Point.add(attachmentPoint, labelNode.offset);
      let newRotation = labelNode.node.bounds.rotation;
      if (isParallel(labelNode.type) || isPerpendicular(labelNode.type)) {
        const tangent = path.tangentAt(pathD);

        if (isParallel(labelNode.type)) {
          newRotation = Vector.angle(tangent);
        } else {
          newRotation = Vector.angle(tangent) + Math.PI / 2;
        }

        if (isReadable(labelNode.type)) {
          if (newRotation > Math.PI / 2) newRotation -= Math.PI;
          if (newRotation < -Math.PI / 2) newRotation += Math.PI;
        }

        newCenterPoint = Point.add(
          attachmentPoint,
          Point.rotate({ x: -labelNode.offset.x, y: 0 }, Vector.angle(tangent) + Math.PI / 2)
        );
      } else if (isHorizontal(labelNode.type)) {
        newRotation = 0;
      } else if (isVertical(labelNode.type)) {
        newRotation = Math.PI / 2;
      }

      // Note, using rounding here to avoid infinite recursion
      const currentCenterPoint = Box.center(labelNode.node.bounds);
      const hasChanged =
        isDifferent(newCenterPoint.x, currentCenterPoint.x) ||
        isDifferent(newCenterPoint.y, currentCenterPoint.y) ||
        isDifferent(newRotation, labelNode.node.bounds.rotation);

      if (hasChanged) {
        labelNode.node.bounds = {
          ...labelNode.node.bounds,
          rotation: newRotation,
          pos: {
            x: newCenterPoint.x - labelNode.node.bounds.size.w / 2,
            y: newCenterPoint.y - labelNode.node.bounds.size.h / 2
          }
        };
        uow.updateElement(labelNode.node);
      }
    }
  }
}
