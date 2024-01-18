import { AbstractDrag, Modifiers } from './dragDropManager.ts';
import { Point } from '../../geometry/point.ts';
import { Box, WritableBox } from '../../geometry/box.ts';
import { Direction } from '../../geometry/direction.ts';
import { Translation } from '../../geometry/transform.ts';
import { Vector } from '../../geometry/vector.ts';
import { Angle } from '../../geometry/angle.ts';
import { createResizeCanvasActionToFit } from '../../model/helpers/canvasResizeHelper.ts';
import {
  ElementAddUndoableAction,
  SnapshotUndoableAction
} from '../../model/diagramUndoActions.ts';
import { Axis } from '../../geometry/axis.ts';
import { Diagram, excludeLabelNodes, includeAll } from '../../model/diagram.ts';
import { DiagramElement, isEdge, isNode } from '../../model/diagramElement.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { largest } from '../../utils/array.ts';
import { VERIFY_NOT_REACHED } from '../../utils/assert.ts';
import { addHighlight, removeHighlight } from '../../react-canvas-editor/highlight.ts';
import { CompoundUndoableAction } from '../../model/undoManager.ts';
import { SelectionState } from '../../model/selectionState.ts';

const getId = (e: DiagramElement) => (isNode(e) ? `node-${e.id}` : `edge-${e.id}`);

const enablePointerEvents = (elements: ReadonlyArray<DiagramElement>) => {
  for (const e of elements) {
    document.getElementById(getId(e))!.style.pointerEvents = '';
    if (isNode(e)) enablePointerEvents(e.children);
  }
};

const disablePointerEvents = (elements: ReadonlyArray<DiagramElement>) => {
  for (const e of elements) {
    document.getElementById(getId(e))!.style.pointerEvents = 'none';
    if (isNode(e)) disablePointerEvents(e.children);
  }
};

// TODO: We can/should make this configurable by platform
const isConstraintDrag = (m: Modifiers) => m.shiftKey;
const isFreeDrag = (m: Modifiers) => m.altKey;
const isDuplicateDrag = (e: KeyboardEvent) => e.key === 'Meta';

export class MoveDrag extends AbstractDrag {
  #snapAngle?: Axis;
  #hasDuplicatedSelection?: boolean = false;
  #dragStarted = false;
  #currentElement: DiagramElement | undefined = undefined;
  #keys: string[] = [];

  private readonly uow: UnitOfWork;

  constructor(
    private readonly diagram: Diagram,
    private readonly offset: Point
  ) {
    super();

    this.uow = new UnitOfWork(this.diagram, true);
  }

  onDragEnter(id: string) {
    const selection = this.diagram.selectionState;
    if (selection.getSelectionType() !== 'single-node') return;

    const hover = this.diagram.lookup(id);

    this.clearHighlight();

    // Need to filter any edges that are connected to the current selection
    if (isEdge(hover) && selection.elements.some(e => isNode(e) && e.listEdges().includes(hover))) {
      this.#currentElement = undefined;
      return;
    }

    if (hover !== this.#currentElement) {
      this.#currentElement = hover;
      this.setHighlight();
    }
  }

  onDragLeave() {
    this.clearHighlight();
    this.#currentElement = undefined;
  }

  onKeyDown(event: KeyboardEvent) {
    this.#keys.push(event.key);
    this.updateState(this.diagram.selectionState.bounds);

    if (isDuplicateDrag(event)) {
      this.duplicate();
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (isDuplicateDrag(event)) {
      this.removeDuplicate();
    }
  }

  onDrag(coord: Point, modifiers: Modifiers): void {
    const selection = this.diagram.selectionState;
    selection.setDragging(true);

    // Don't move connected edges
    if (selection.isEdgesOnly() && selection.edges.every(e => e.isConnected())) {
      return;
    }

    // Disable pointer events on the first onDrag event
    if (!this.#dragStarted) {
      this.#dragStarted = true;
      disablePointerEvents(selection.elements);
    }

    // Determine the delta between the current mouse position and the original mouse position
    const delta = Point.subtract(coord, Point.add(selection.bounds, this.offset));
    const newPos = Point.add(selection.bounds, delta);

    const newBounds = Box.asReadWrite(selection.bounds);
    newBounds.x = newPos.x;
    newBounds.y = newPos.y;

    let snapDirections = Direction.all();

    if (isConstraintDrag(modifiers)) {
      const res = this.constrainDrag(selection, coord);
      snapDirections = res.availableSnapDirections;
      newBounds.x = res.adjustedPosition.x;
      newBounds.y = res.adjustedPosition.y;
    }

    if (isFreeDrag(modifiers)) {
      selection.guides = [];
    } else {
      const snapManager = this.diagram.createSnapManager();

      const result = snapManager.snapMove(WritableBox.asBox(newBounds), snapDirections);
      selection.guides = result.guides;

      newBounds.x = result.adjusted.x;
      newBounds.y = result.adjusted.y;
    }

    // This is to update the tooltip
    this.updateState(newBounds);

    this.diagram.transformElements(
      selection.elements,
      [new Translation(Point.subtract(newBounds, selection.bounds))],
      this.uow,
      selection.getSelectionType() === 'single-label-node' ? includeAll : excludeLabelNodes
    );

    // This is mainly a performance optimization and not strictly necessary
    this.diagram.selectionState.recalculateBoundingBox();

    this.uow.notify();
  }

  onDragEnd(): void {
    const selection = this.diagram.selectionState;
    selection.setDragging(false);
    selection.guides = [];

    this.clearHighlight();
    enablePointerEvents(selection.elements);
    this.#hasDuplicatedSelection = false;

    const snapshots = this.uow.commit();

    if (selection.isChanged()) {
      const compoundUndoAction = new CompoundUndoableAction();

      const resizeCanvasAction = createResizeCanvasActionToFit(
        this.diagram,
        Box.boundingBox(
          selection.nodes.map(e => e.bounds),
          true
        )
      );
      if (resizeCanvasAction) {
        resizeCanvasAction.redo();
        compoundUndoAction.addAction(resizeCanvasAction);
      }

      const addedElements = snapshots.onlyAdded().keys;
      if (addedElements.length > 0) {
        compoundUndoAction.addAction(
          new ElementAddUndoableAction(
            addedElements.map(e => this.diagram.lookup(e)!),
            this.diagram
          )
        );
      }

      // This means we are dropping onto an element
      if (this.#currentElement) {
        const p = Point.add(selection.bounds, this.offset);
        const el = this.#currentElement;
        if (isNode(el)) {
          el.getDefinition().onDrop(p, el, selection.elements, this.uow, 'default');
        } else if (isEdge(el)) {
          const operation = this.getLastState(2) === 1 ? 'split' : 'attach';
          el.getDefinition().onDrop(p, el, selection.elements, this.uow, operation);
        } else {
          VERIFY_NOT_REACHED();
        }

        // Move elements out of a container
      } else if (selection.elements.every(e => e.parent?.nodeType === 'container')) {
        const activeLayer = this.diagram.layers.active;
        this.diagram.moveElement(
          selection.elements,
          this.uow,
          activeLayer,
          activeLayer.elements.length > 0
            ? {
                relation: 'above',
                element: this.diagram.layers.active.elements.at(-1)!
              }
            : undefined
        );
      }

      compoundUndoAction.addAction(
        new SnapshotUndoableAction(
          'Move',
          snapshots.onlyUpdated(),
          snapshots.onlyUpdated().retakeSnapshot(this.diagram),
          this.diagram
        )
      );

      if (compoundUndoAction.hasActions()) this.diagram.undoManager.add(compoundUndoAction);
    }

    this.uow.commit();
    selection.rebaseline();
  }

  private constrainDrag(selection: SelectionState, coord: Point) {
    let snapDirections = Direction.all();
    const source = Point.add(selection.source.boundingBox, this.offset);

    const v = Vector.from(source, coord);
    const length = Vector.length(v);
    const angle = Vector.angle(v);

    let snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);

    if (this.#snapAngle === 'h') {
      snapAngle = Math.round(angle / Math.PI) * Math.PI;
    } else if (this.#snapAngle === 'v') {
      snapAngle = Math.round((angle + Math.PI / 2) / Math.PI) * Math.PI - Math.PI / 2;
      snapDirections = ['n', 's'];
    } else if (length > 20) {
      this.#snapAngle = Angle.isHorizontal(snapAngle) ? 'h' : 'v';
      snapDirections = ['e', 'w'];
    }

    return {
      availableSnapDirections: snapDirections,
      adjustedPosition: Point.add(selection.source.boundingBox, Vector.fromPolar(snapAngle, length))
    };
  }

  private duplicate() {
    if (this.#hasDuplicatedSelection) return;

    this.#hasDuplicatedSelection = true;

    const selection = this.diagram.selectionState;

    // Clone the current selection to keep in its original position
    const newElements = selection.source.elementIds.map(e => this.diagram.lookup(e)!.duplicate());
    newElements.forEach(e => {
      this.diagram.layers.active.addElement(e, this.uow);
    });

    // Reset current selection back to original
    this.diagram.transformElements(
      selection.nodes,
      [new Translation(Point.subtract(selection.source.boundingBox, selection.bounds))],
      this.uow,
      selection.getSelectionType() === 'single-label-node' ? includeAll : excludeLabelNodes
    );

    enablePointerEvents(selection.elements);

    selection.guides = [];
    selection.setElements(newElements, false);

    this.uow.notify();

    // To ensure that pointer events are disabled at the next drag event
    this.#dragStarted = false;
  }

  private removeDuplicate() {
    if (!this.#hasDuplicatedSelection) return;

    this.#hasDuplicatedSelection = false;

    const selection = this.diagram.selectionState;

    const elementsToRemove = selection.elements;
    const posititions = elementsToRemove.map(e => e.bounds);

    selection.setElements(selection.source.elementIds.map(e => this.diagram.lookup(e)!));
    selection.guides = [];

    elementsToRemove.forEach(e => {
      e.layer.removeElement(e, this.uow);
    });

    // Reset the original selection back to the position of the now
    // removed duplicates
    selection.elements.forEach((e, idx) => {
      e.setBounds(posititions[idx], this.uow);
    });

    this.uow.notify();
  }

  private clearHighlight() {
    if (!this.#currentElement) return;
    removeHighlight(this.#currentElement, 'drop-target');
  }

  private setHighlight() {
    if (!this.#currentElement) return;
    addHighlight(this.#currentElement, 'drop-target');
  }

  private getLastState(max: number) {
    const last: [number, number][] = [];
    for (let i = 1; i <= max; i++) {
      last[i] = [i, this.#keys.lastIndexOf(i.toString())];
    }
    return largest(last.slice(1).toReversed(), (a, b) => a[1] - b[1])![0];
  }

  private updateState(newPos: { x: number; y: number }) {
    const lastState = this.getLastState(2);
    this.setState({
      label: `x: ${newPos.x.toFixed(0)}, y: ${newPos.y.toFixed(0)}`,
      modifiers:
        this.#currentElement?.type === 'edge'
          ? [
              { key: '1', label: 'Split', isActive: lastState === 1 },
              { key: '2', label: 'Attach as label', isActive: lastState === 2 }
            ]
          : []
    });
  }
}
