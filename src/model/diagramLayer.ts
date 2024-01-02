import { DiagramNode } from './diagramNode.ts';
import { Diagram, StackPosition } from './diagram.ts';
import { EventEmitter } from '../utils/event.ts';
import { assert } from '../utils/assert.ts';
import { DiagramElement } from './diagramElement.ts';
import { Point } from '../geometry/point.ts';
import { PathBuilder } from '../geometry/pathBuilder.ts';
import { Box } from '../geometry/box.ts';

export type LayerEvents = {
  change: { layer: Layer };
  elementChange: { element: DiagramElement };
  elementAdd: { element: DiagramElement };
  elementRemove: { element: DiagramElement };
};

// TODO: Maybe diagram can relay these events, instead of expliclitly calling
//       diagram.emit
export class Layer extends EventEmitter<LayerEvents> {
  id: string;
  name: string;

  // TODO: We should make this a ReadonlyArray
  elements: DiagramElement[] = [];
  private diagram: Diagram;

  #locked = false;

  constructor(id: string, name: string, elements: DiagramElement[], diagram: Diagram) {
    super();
    this.id = id;
    this.name = name;
    this.diagram = diagram;

    elements.forEach(e => this.addElement(e, false));
  }

  isLocked() {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
    this.emit('change', { layer: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  // TODO: Add some tests for the stack operations
  stackModify(
    elements: ReadonlyArray<DiagramElement>,
    newPosition: number
  ): Map<DiagramNode | undefined, StackPosition[]> {
    // Group by parent
    const byParent = new Map<DiagramNode | undefined, DiagramElement[]>();
    for (const el of elements) {
      const parent = el.type === 'node' ? el.parent : undefined;
      const arr = byParent.get(parent) ?? [];
      arr.push(el);
      byParent.set(parent, arr);
    }

    const dest = new Map<DiagramNode | undefined, StackPosition[]>();

    for (const [parent, elements] of byParent) {
      const existing = parent?.children ?? this.elements;

      const withPositions = existing.map((e, i) => ({ element: e, idx: i }));
      const oldPositions = existing.map((e, i) => ({ element: e, idx: i }));

      for (const el of elements) {
        const idx = withPositions.findIndex(e => e.element === el);
        withPositions[idx].idx += newPosition;
      }

      // TODO: Maybe we can add UnitOfWork and avoid emitting diagram level
      //       change events if only the stack changes
      withPositions.sort((a, b) => a.idx - b.idx);
      if (parent) {
        parent.children = withPositions.map(e => e.element as DiagramNode);
      } else {
        this.elements = withPositions.map(e => e.element);
      }
      dest.set(parent, oldPositions);
    }

    this.diagram.emit('change', { diagram: this.diagram });

    return dest;
  }

  stackSet(newPositions: Map<DiagramNode | undefined, StackPosition[]>) {
    for (const [parent, positions] of newPositions) {
      positions.sort((a, b) => a.idx - b.idx);
      if (parent) {
        parent.children = positions.map(e => e.element as DiagramNode);
      } else {
        this.elements = positions.map(e => e.element);
      }
    }
    this.emit('change', { layer: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  addElement(element: DiagramElement, omitEvents = false) {
    if (!element.parent) this.elements.push(element);
    this.processElementForAdd(element);
    if (!omitEvents) {
      this.emit('elementAdd', { element });
      this.diagram.emit('elementAdd', { element });
    }
  }

  removeElement(element: DiagramElement) {
    this.elements = this.elements.filter(e => e !== element);

    if (element.type === 'node') {
      this.diagram.nodeLookup.delete(element.id);
    } else if (element.type === 'edge') {
      this.diagram.edgeLookup.delete(element.id);
    }

    this.diagram.emit('elementRemove', { element });
    this.emit('elementRemove', { element });
  }

  updateElement(element: DiagramElement) {
    this.diagram.emit('elementChange', { element });
    this.emit('elementChange', { element });
  }

  isAbove(layer: Layer) {
    return this.diagram.layers.all.indexOf(this) < this.diagram.layers.all.indexOf(layer);
  }

  findElementsByPoint(coord: Point): ReadonlyArray<DiagramElement> {
    const pb = new PathBuilder();
    pb.moveTo({ x: -100000, y: -100000 });
    pb.lineTo(coord);
    const ref = pb.getPath();

    const dest: Array<DiagramElement> = [];
    for (const e of this.elements.toReversed()) {
      if (!Box.contains(e.bounds, coord)) continue;

      if (e.type === 'node') {
        if (e.getNodeDefinition().getBoundingPath(e).intersections(ref).length % 2 === 1) {
          dest.push(e);
        }
      } else {
        const projected = e.path().projectPoint(coord);
        if (
          projected.segmentT >= 0 &&
          projected.segmentT <= 1 &&
          Point.distance(coord, projected.point) < 5
        ) {
          dest.push(e);
        }
      }
    }

    return dest;
  }

  private processElementForAdd(e: DiagramElement) {
    e.diagram = this.diagram;
    e.layer = this;
    if (e.type === 'node') {
      this.diagram.nodeLookup.set(e.id, e);
      for (const child of e.children) {
        // TODO: Eventually remove this assertion
        assert.true(child.parent === e);
        this.processElementForAdd(child);
      }
    } else {
      this.diagram.edgeLookup.set(e.id, e);
    }
  }
}

export type LayerManagerEvents = {
  change: { layers: LayerManager };
};

export class LayerManager extends EventEmitter<LayerManagerEvents> {
  #layers: Layer[] = [];
  #activeLayer: Layer;
  #visibleLayers: Set<string> = new Set<string>();

  constructor(
    readonly diagram: Diagram,
    layers: Layer[]
  ) {
    super();
    this.#layers = layers;
    this.#activeLayer = layers[0];

    this.#layers.forEach(layer => {
      this.#visibleLayers.add(layer.id);
    });

    this.diagram.selectionState.on('add', () => {
      if (!this.diagram.selectionState.isEmpty())
        this.active = this.diagram.selectionState.elements[0].layer!;
    });
    this.diagram.selectionState.on('remove', () => {
      if (!this.diagram.selectionState.isEmpty())
        this.active = this.diagram.selectionState.elements[0].layer!;
    });
  }

  get all() {
    return this.#layers;
  }

  get visible() {
    return this.#layers.filter(layer => this.#visibleLayers.has(layer.id));
  }

  // TODO: Need undo/redo for this - perhaps change into an UndoableAction
  move(layers: Layer[], ref: { layer: Layer; relation: 'above' | 'below' }) {
    const idx = this.#layers.indexOf(ref.layer);
    const newIdx = ref.relation === 'below' ? idx : idx + 1;

    for (const layer of layers) {
      const oldIdx = this.#layers.indexOf(layer);
      this.#layers.splice(oldIdx, 1);
      this.#layers.splice(newIdx, 0, layer);
    }

    this.emit('change', { layers: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  toggleVisibility(layer: Layer) {
    this.#visibleLayers.has(layer.id)
      ? this.#visibleLayers.delete(layer.id)
      : this.#visibleLayers.add(layer.id);
    this.emit('change', { layers: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  setVisibility(layers: Layer, isVisible: boolean) {
    if (isVisible) {
      this.#visibleLayers.add(layers.id);
    } else {
      this.#visibleLayers.delete(layers.id);
    }
    this.emit('change', { layers: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  set active(layer: Layer) {
    this.#activeLayer = layer;
    this.emit('change', { layers: this });
    this.diagram.emit('change', { diagram: this.diagram });
  }

  get active() {
    return this.#activeLayer;
  }

  byId(id: string) {
    return this.#layers.find(l => l.id === id);
  }

  add(layer: Layer) {
    this.#layers.push(layer);
    this.setVisibility(layer, true);
    this.#activeLayer = layer;
    this.emit('change', { layers: this });
  }

  remove(layer: Layer) {
    this.#layers = this.#layers.filter(l => l !== layer);
    this.emit('change', { layers: this });
  }
}
