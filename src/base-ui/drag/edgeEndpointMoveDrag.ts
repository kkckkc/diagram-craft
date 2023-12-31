import { AbstractDrag } from './dragDropManager.ts';
import { Point } from '../../geometry/point.ts';
import { precondition } from '../../utils/assert.ts';
import { DiagramEdge } from '../../model/diagramEdge.ts';
import { Diagram } from '../../model/diagram.ts';
import { DiagramElement } from '../../model/diagramElement.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';

const addHighlight = (element: DiagramElement, highlight: string) => {
  element.props.highlight ??= [];
  element.props.highlight.push(highlight);

  UnitOfWork.updateElement(element);
};

const removeHighlight = (element: DiagramElement, highlight: string) => {
  if (!element.props?.highlight) return;
  element.props.highlight = element.props.highlight.filter(h => h !== highlight);

  UnitOfWork.updateElement(element);
};

export class EdgeEndpointMoveDrag extends AbstractDrag {
  private readonly originalPointerEvents: string;
  private hoverElement: string | undefined;
  private coord: Point | undefined;

  constructor(
    private readonly diagram: Diagram,
    private readonly edge: DiagramEdge,
    private readonly element: SVGElement,
    private readonly type: 'start' | 'end'
  ) {
    super();
    this.originalPointerEvents = element.getAttribute('pointer-events') ?? 'all';
    element.classList.add('selection-edge-handle--active');

    // TODO: Should disable point-events on all elements that makes up the edge
    element.setAttribute('pointer-events', 'none');
  }

  onDragEnter(id: string): void {
    this.hoverElement = id;

    if (id && this.diagram.nodeLookup.has(id)) {
      const el = this.diagram.nodeLookup.get(id)!;
      el.anchors;
    }

    const el = this.diagram.lookup(id)!;
    addHighlight(el, 'edge-connect');
  }

  onDragLeave(): void {
    if (this.hoverElement) {
      removeHighlight(this.diagram.lookup(this.hoverElement)!, 'edge-connect');
    }
    this.hoverElement = undefined;
  }

  onDrag(coord: Point) {
    const selection = this.diagram.selectionState;
    precondition.is.true(this.type === 'start' || this.type === 'end');

    selection.guides = [];

    if (this.type === 'start') {
      this.edge.start = { position: coord };
    } else {
      this.edge.end = { position: coord };
    }

    this.coord = coord;

    // TODO: We should snap to the connection point
    if (this.hoverElement && this.diagram.nodeLookup.has(this.hoverElement)) {
      this.element.classList.add('selection-edge-handle--connected');

      this.attachToClosestAnchor(coord);
    } else {
      this.element.classList.remove('selection-edge-handle--connected');
    }

    this.edge.update();
  }

  onDragEnd(): void {
    this.element.setAttribute('pointer-events', this.originalPointerEvents);
    this.element.classList.remove('selection-edge-handle--active');

    // Using the last known coordinate, attach to the closest anchor
    this.attachToClosestAnchor(this.coord!);

    if (this.hoverElement) {
      removeHighlight(this.diagram.lookup(this.hoverElement)!, 'edge-connect');
    }

    // TODO: Create undoable action
  }

  private attachToClosestAnchor(coord: Point) {
    if (this.hoverElement && this.diagram.nodeLookup.has(this.hoverElement)) {
      if (this.type === 'start') {
        this.edge.start = {
          node: this.diagram.nodeLookup.get(this.hoverElement)!,
          anchor: this.getClosestAnchor(coord)
        };
      } else {
        this.edge.end = {
          node: this.diagram.nodeLookup.get(this.hoverElement)!,
          anchor: this.getClosestAnchor(coord)
        };
      }
    }
  }

  private getClosestAnchor(coord: Point): number {
    const node = this.diagram.nodeLookup.get(this.hoverElement!)!;
    const anchors = node.anchors.map((a, idx) => {
      return {
        idx,
        x: node.bounds.x + a.point.x * node.bounds.w,
        y: node.bounds.y + a.point.y * node.bounds.h
      };
    });

    let closestAnchor = 0;
    let closestDistance = Number.MAX_SAFE_INTEGER;
    for (const a of anchors) {
      const d = Point.squareDistance(coord, a);
      if (d < closestDistance) {
        closestAnchor = a.idx;
        closestDistance = d;
      }
    }

    return closestAnchor;
  }
}
