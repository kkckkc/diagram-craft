import { EventEmitter } from '../utils/event.ts';
import { Transform } from '../geometry/transform.ts';
import { Box } from '../geometry/box.ts';
import { Viewbox } from './viewBox.ts';
import { DiagramNode } from './diagramNode.ts';
import { DiagramEdge } from './diagramEdge.ts';
import { EdgeDefinitionRegistry, NodeDefinitionRegistry } from './elementDefinitionRegistry.ts';
import { Layer, LayerManager } from './diagramLayer.ts';
import { SelectionState } from './selectionState.ts';
import { UndoManager } from './undoManager.ts';
import { SnapManager } from './snap/snapManager.ts';
import { SnapManagerConfig } from './snap/snapManagerConfig.ts';
import { assert } from '../utils/assert.ts';
import { UnitOfWork } from './unitOfWork.ts';
import { DiagramElement, isEdge, isNode } from './diagramElement.ts';
import { DiagramDocument } from './diagramDocument.ts';

export type Canvas = Omit<Box, 'r'>;

export type DiagramEvents = {
  /* Diagram props, canvas have changed, or a large restructure of
   * elements have occured (e.g. change of stacking order)
   */
  change: { diagram: Diagram };

  /* A single element has changed (e.g. moved, resized, etc) */
  elementChange: { element: DiagramElement };

  /* A new element has been added to the diagram */
  elementAdd: { element: DiagramElement };

  /* An element has been removed from the diagram */
  elementRemove: { element: DiagramElement };
};

export type StackPosition = { element: DiagramElement; idx: number };

export const excludeLabelNodes = (n: DiagramElement) => !(isNode(n) && n.props.labelForEdgeId);

export const includeAll = () => true;

export class Diagram extends EventEmitter<DiagramEvents> {
  #canvas: Canvas = {
    x: 0,
    y: 0,
    w: 640,
    h: 640
  };

  diagrams: ReadonlyArray<this> = [];
  #document: DiagramDocument | undefined;

  mustCalculateIntersections = true;

  readonly props: DiagramProps = {};
  readonly viewBox = new Viewbox(this.#canvas);
  readonly nodeLookup = new Map<string, DiagramNode>();
  readonly edgeLookup = new Map<string, DiagramEdge>();
  readonly selectionState: SelectionState = new SelectionState(this);
  readonly layers = new LayerManager(this, []);
  readonly snapManagerConfig = new SnapManagerConfig([
    'grid',
    'node',
    'canvas',
    'distance',
    'size'
  ]);
  readonly undoManager = new UndoManager(this);

  constructor(
    readonly id: string,
    readonly name: string,
    readonly nodeDefinitions: NodeDefinitionRegistry,
    readonly edgeDefinitions: EdgeDefinitionRegistry
  ) {
    super();

    // TODO: We should be able to remove this
    const toggleMustCalculateIntersections = () => {
      const old = this.mustCalculateIntersections;
      this.mustCalculateIntersections = this.visibleElements().some(
        e => isEdge(e) && (e.props.lineHops?.type ?? 'none') !== 'none'
      );
      // Only trigger invalidation in case the value has changed to true
      if (this.mustCalculateIntersections && this.mustCalculateIntersections !== old) {
        const uow = new UnitOfWork(this);
        this.layers.active.elements
          .filter(e => isEdge(e))
          .forEach(e => (e as DiagramEdge).invalidate(uow));
        uow.commit();
      }
    };
    this.on('elementChange', toggleMustCalculateIntersections);
    this.on('elementAdd', toggleMustCalculateIntersections);
    this.on('elementRemove', toggleMustCalculateIntersections);
  }

  set document(d: DiagramDocument) {
    this.#document = d;
  }

  get document(): DiagramDocument {
    return this.#document!;
  }

  lookup(id: string): DiagramElement | undefined {
    return this.nodeLookup.get(id) ?? this.edgeLookup.get(id);
  }

  createSnapManager() {
    return new SnapManager(
      this,
      this.selectionState.elements.map(e => e.id),
      this.snapManagerConfig.magnetTypes,
      this.snapManagerConfig.threshold,
      this.snapManagerConfig.enabled
    );
  }

  visibleElements() {
    return this.layers.visible.flatMap(l => l.elements);
  }

  get canvas() {
    return this.#canvas;
  }

  set canvas(b: Canvas) {
    this.#canvas = b;
    this.update();
  }

  findChildDiagramById(id: string): this | undefined {
    return (
      this.diagrams.find(d => d.id === id) ??
      this.diagrams.map(d => d.findChildDiagramById(id)).find(d => d !== undefined)
    );
  }

  // TODO: Check layer level events are emitted
  moveElement(
    elements: ReadonlyArray<DiagramElement>,
    uow: UnitOfWork,
    layer: Layer,
    ref?: { relation: 'above' | 'below' | 'on'; element: DiagramElement }
  ) {
    elements.forEach(e => uow.snapshot(e));

    const elementLayers = elements.map(e => e.layer);
    const topMostLayer = this.layers.all.findLast(layer => elementLayers.includes(layer));
    assert.present(topMostLayer);

    // Cannot move an element into itself, so abort if this is the case
    if (elements.some(e => e === ref?.element)) return;

    // Remove from existing layers
    const sourceLayers = new Set(elementLayers);
    for (const l of sourceLayers) {
      uow.snapshot(l);
      l.setElements(
        l.elements.filter(e => !elements.includes(e)),
        uow
      );
    }

    // Remove from groups
    // TODO: Can optimize by grouping by parent - probably not worth it
    for (const el of elements) {
      if (el.parent) {
        uow.snapshot(el.parent);
        el.parent.removeChild(el, uow);
      }
    }

    uow.snapshot(layer);

    // Move into the new layer
    if (ref === undefined) {
      if (layer.isAbove(topMostLayer)) {
        layer.setElements([...layer.elements, ...elements], uow);
      } else {
        layer.setElements([...elements, ...layer.elements], uow);
      }
    } else if (isNode(ref.element) && ref.element.parent) {
      const parent = ref.element.parent;
      uow.snapshot(parent);
      uow.snapshot(ref.element);

      const idx = parent.children.indexOf(ref.element);
      if (ref.relation === 'above') {
        parent.setChildren(parent.children.toSpliced(idx + 1, 0, ...elements), uow);
      } else if (ref.relation === 'below') {
        parent.setChildren(parent.children.toSpliced(idx, 0, ...elements), uow);
      } else {
        ref.element.setChildren([...ref.element.children, ...elements], uow);
      }
    } else {
      assert.true(ref.element.layer === layer);
      uow.snapshot(ref.element);

      const idx = layer.elements.indexOf(ref.element);
      if (ref.relation === 'above') {
        layer.setElements(layer.elements.toSpliced(idx + 1, 0, ...elements), uow);
      } else if (ref.relation === 'below') {
        layer.setElements(layer.elements.toSpliced(idx, 0, ...elements), uow);
      } else if (isNode(ref.element)) {
        ref.element.setChildren([...ref.element.children, ...elements], uow);
      }
    }

    // Assign new layer
    elements.forEach(e => layer.addElement(e, uow));

    // TODO: Not clear if this is needed or not
    uow.updateDiagram();
  }

  transformElements(
    elements: ReadonlyArray<DiagramElement>,
    transforms: ReadonlyArray<Transform>,
    uow: UnitOfWork,
    filter: (e: DiagramElement) => boolean = () => true
  ) {
    for (const el of elements) {
      if (filter(el)) el.transform(transforms, uow);
    }

    // We do this in a separate loop to as nodes might move which will
    // affect the start and end location of connected edges
    for (const el of elements) {
      if (filter(el)) uow.updateElement(el);
    }
  }

  // TODO: Remove this
  /** @deprecated */
  update() {
    this.emit('change', { diagram: this });
  }

  toJSON() {
    return {
      diagrams: this.diagrams,
      props: this.props,
      selectionState: this.selectionState,
      id: this.id,
      name: this.name,
      layers: this.layers
    };
  }
}
