import { Box } from '../geometry/box.ts';
import { Transform } from '../geometry/transform.ts';
import { Diagram } from './diagram.ts';
import { Point } from '../geometry/point.ts';
import { DiagramNode, DuplicationContext } from './diagramNode.ts';
import { AbstractEdge, LabelNode, Waypoint } from './types.ts';
import { Layer } from './diagramLayer.ts';
import { buildEdgePath } from './edgePathBuilder.ts';
import { PointOnPath, TimeOffsetOnPath } from '../geometry/pathPosition.ts';
import { Vector } from '../geometry/vector.ts';
import { newid } from '../utils/id.ts';
import { deepClone } from '../utils/clone.ts';
import { UnitOfWork } from './unitOfWork.ts';
import { DiagramElement, isEdge } from './diagramElement.ts';
import { isDifferent } from '../utils/math.ts';
import { isHorizontal, isParallel, isPerpendicular, isReadable, isVertical } from './labelNode.ts';
import { BaseEdgeDefinition } from '../base-ui/baseEdgeDefinition.ts';

export interface Endpoint {
  readonly position: Point;
}

export class ConnectedEndpoint implements Endpoint {
  constructor(
    public readonly anchor: number,
    public readonly node: DiagramNode
  ) {}

  get position() {
    return this.node!._getAnchorPosition(this.anchor!);
  }
}

export class FreeEndpoint implements Endpoint {
  readonly position: Point;

  constructor(position: Point) {
    this.position = position;
  }
}

export const isConnected = (endpoint: Endpoint): endpoint is ConnectedEndpoint =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (endpoint as any).node !== undefined;

export type ResolvedLabelNode = LabelNode & {
  node: DiagramNode;
};

export type Intersection = {
  point: Point;
  type: 'above' | 'below';
};

const intersectionListIsSame = (a: Intersection[], b: Intersection[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Point.isEqual(a[i].point, b[i].point)) return false;
    if (a[i].type !== b[i].type) return false;
  }
  return true;
};

export class DiagramEdge implements AbstractEdge, DiagramElement {
  readonly type = 'edge';

  readonly id: string;
  readonly props: EdgeProps = {};

  #diagram: Diagram;
  #layer: Layer;
  #parent?: DiagramNode;

  #intersections: Intersection[] = [];
  #waypoints: ReadonlyArray<Waypoint> = [];

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
    this.#waypoints = midpoints;
    this.#diagram = diagram;
    this.#layer = layer;

    if (isConnected(start)) start.node._addEdge(start.anchor, this);
    if (isConnected(end)) end.node._addEdge(end.anchor, this);
  }

  /* Parent ************************************************************************************************** */

  get parent() {
    return this.#parent;
  }

  _setParent(parent: DiagramNode | undefined) {
    this.#parent = parent;
  }

  /* Diagram/layer ******************************************************************************************* */

  get diagram() {
    return this.#diagram;
  }

  get layer() {
    return this.#layer;
  }

  _setLayer(layer: Layer, diagram: Diagram) {
    this.#layer = layer;
    this.#diagram = diagram;
  }

  /* Bounds ************************************************************************************************* */

  // TODO: This is probably not a sufficient way to calculate the bounding box
  get bounds() {
    return Box.fromCorners(this.#start.position, this.#end.position);
  }

  setBounds(b: Box, uow: UnitOfWork) {
    if (!isConnected(this.start)) {
      this.#start = new FreeEndpoint({ x: b.x, y: b.y });
      uow.updateElement(this);
    }
    if (!isConnected(this.end)) {
      this.#end = new FreeEndpoint({ x: b.x + b.w, y: b.y + b.h });
      uow.updateElement(this);
    }
  }

  /* Endpoints ********************************************************************************************** */

  setStart(start: Endpoint, uow: UnitOfWork) {
    if (isConnected(this.#start)) {
      this.#start.node._removeEdge(this.#start.anchor, this);
      uow.updateElement(this.#start.node);
    }

    if (isConnected(start)) {
      start.node._addEdge(start.anchor, this);
      uow.updateElement(start.node);
    }

    this.#start = start;

    uow.updateElement(this);
  }

  get start() {
    return this.#start;
  }

  setEnd(end: Endpoint, uow: UnitOfWork) {
    if (isConnected(this.#end)) {
      this.#end.node._removeEdge(this.#end.anchor, this);
      uow.updateElement(this.#end.node);
    }

    if (isConnected(end)) {
      end.node._addEdge(end.anchor, this);
      uow.updateElement(end.node);
    }

    this.#end = end;

    uow.updateElement(this);
  }

  get end() {
    return this.#end;
  }

  /* Label Nodes ******************************************************************************************** */

  get labelNodes() {
    return this.#labelNodes;
  }

  setLabelNodes(labelNodes: ReadonlyArray<ResolvedLabelNode> | undefined, uow: UnitOfWork) {
    this.#labelNodes = labelNodes;
    this.#labelNodes?.forEach(ln => {
      ln.node.props.labelForEdgeId = this.id;
      uow.updateElement(ln.node);
    });
    uow.updateElement(this);
  }

  addLabelNode(labelNode: ResolvedLabelNode, uow: UnitOfWork) {
    this.setLabelNodes([...(this.labelNodes ?? []), labelNode], uow);
  }

  removeLabelNode(labelNode: ResolvedLabelNode, uow: UnitOfWork) {
    this.setLabelNodes(this.labelNodes?.filter(ln => ln !== labelNode), uow);
  }

  /* Waypoints ********************************************************************************************** */

  get waypoints() {
    return this.#waypoints;
  }

  addWaypoint(waypoint: Waypoint, uow: UnitOfWork) {
    const path = this.path();
    const projection = path.projectPoint(waypoint.point);

    const wpDistances = this.waypoints.map(p => {
      return {
        pathD: PointOnPath.toTimeOffset({ point: p.point }, path).pathD,
        ...p
      };
    });

    this.#waypoints = [...wpDistances, { ...waypoint, pathD: projection.pathD }].sort(
      (a, b) => a.pathD - b.pathD
    );

    uow.updateElement(this);
  }

  removeWaypoint(waypoint: Waypoint, uow: UnitOfWork) {
    this.#waypoints = this.waypoints?.filter(w => w !== waypoint);
    uow.updateElement(this);
  }

  moveWaypoint(waypoint: Waypoint, point: Point, uow: UnitOfWork) {
    waypoint.point = point;
    uow.updateElement(this);
  }

  updateWaypoint(_waypoint: Waypoint, uow: UnitOfWork) {
    uow.updateElement(this);
  }

  /* ***** ***** ******************************************************************************************** */

  isLocked() {
    return this.layer.isLocked() ?? false;
  }

  path() {
    // TODO: We should be able to cache this, and then invalidate it when the edge changes (see invalidate())
    return buildEdgePath(this, this.props.routing?.rounding ?? 0);
  }

  transform(transforms: ReadonlyArray<Transform>, uow: UnitOfWork) {
    this.setBounds(Transform.box(this.bounds, ...transforms), uow);

    this.#waypoints = this.waypoints?.map(w => {
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

    uow.updateElement(this);
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
    UnitOfWork.noCommit(this.diagram, uow => {
      edge.setLabelNodes(newLabelNodes, uow);
    });

    return edge;
  }

  // TODO: This should use the EdgeDefinitionRegistry
  getEdgeDefinition() {
    return new BaseEdgeDefinition(this.id, 'Edge', 'edge');
  }

  get intersections() {
    return this.#intersections;
  }

  flip(uow: UnitOfWork) {
    const start = this.#start;
    const end = this.#end;

    // Need to "zero" the end so that the setters logic should work correctly
    this.#end = new FreeEndpoint(Point.ORIGIN);

    this.setStart(end, uow);
    this.setEnd(start, uow);
  }

  /**
   * Called in case the edge has been changed and needs to be recalculated
   *
   *  edge -> label nodes -> ...
   *       -> intersecting edges
   *
   * Note, that whilst an edge can be part of a group, a change to the edge will not
   * impact the state and/or bounds of the parent group/container
   */
  invalidate(uow: UnitOfWork) {
    // Ensure we don't get into an infinite loop
    if (uow.hasBeenInvalidated(this)) return;
    uow.beginInvalidation(this);

    this.adjustLabelNodePosition(uow);
    this.recalculateIntersections(uow, true);
  }

  detach(uow: UnitOfWork) {
    // Update any parent
    if (this.parent) {
      this.parent.removeChild(this, uow);
    }

    // All label nodes must be detached
    if (this.labelNodes) {
      for (const l of this.labelNodes) {
        l.node.detach(uow);
      }
    }

    this.diagram.edgeLookup.delete(this.id);

    // Note, need to check if the element is still in the layer to avoid infinite recursion
    if (this.layer.elements.includes(this)) {
      this.layer.removeElement(this, uow);
    }
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

    if (!intersectionListIsSame(intersections, this.#intersections)) {
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
      let newRotation = labelNode.node.bounds.r;
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
        isDifferent(newRotation, labelNode.node.bounds.r);

      if (hasChanged) {
        labelNode.node.setBounds(
          {
            ...labelNode.node.bounds,
            r: newRotation,
            x: newCenterPoint.x - labelNode.node.bounds.w / 2,
            y: newCenterPoint.y - labelNode.node.bounds.h / 2
          },
          uow
        );
      }
    }
  }
}
