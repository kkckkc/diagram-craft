import type { DiagramEdge, EdgePropsForEditing, EdgePropsForRendering } from './diagramEdge';
import type {
  DiagramNode,
  DuplicationContext,
  NodePropsForEditing,
  NodePropsForRendering
} from './diagramNode';
import { ElementInterface } from './types';
import { Transform } from '@diagram-craft/geometry/transform';
import { Box } from '@diagram-craft/geometry/box';
import { UnitOfWork } from './unitOfWork';
import { Layer } from './diagramLayer';
import type { Diagram } from './diagram';
import { AttachmentConsumer } from './attachment';
import { FlatObject } from '@diagram-craft/utils/types';
import { PropertyInfo } from '@diagram-craft/main/react-app/toolwindow/ObjectToolWindow/types';
import { PropPath, PropPathValue } from '@diagram-craft/utils/propertyPath';
import { assert } from '@diagram-craft/utils/assert';
import type { RegularLayer } from './diagramLayerRegular';

// eslint-disable-next-line
type Snapshot = any;

export type ElementPropsForEditing = EdgePropsForEditing | NodePropsForEditing;
export type ElementPropsForRendering = EdgePropsForRendering | NodePropsForRendering;

export abstract class DiagramElement implements ElementInterface, AttachmentConsumer {
  readonly type: string;
  readonly id: string;
  readonly trackableType = 'element';

  protected _children: ReadonlyArray<DiagramElement> = [];
  protected _diagram: Diagram;

  // TODO: Is this always a RegularLayer
  protected _layer: Layer;
  protected _activeDiagram: Diagram;
  protected _metadata: ElementMetadata = {};
  protected _parent?: DiagramElement;
  protected _highlights: ReadonlyArray<string> = [];

  protected _cache: Map<string, unknown> | undefined = undefined;

  protected constructor(
    type: string,
    id: string,
    diagram: Diagram,
    layer: Layer,
    metadata: ElementMetadata
  ) {
    this.type = type;
    this.id = id;
    this._diagram = diagram;
    this._layer = layer;
    this._activeDiagram = diagram;

    this._metadata = metadata ?? {};
  }

  abstract getAttachmentsInUse(): Array<string>;

  abstract invalidate(uow: UnitOfWork): void;
  abstract detach(uow: UnitOfWork): void;
  abstract duplicate(ctx?: DuplicationContext, id?: string | undefined): DiagramElement;
  abstract transform(
    transforms: ReadonlyArray<Transform>,
    uow: UnitOfWork,
    isChild?: boolean
  ): void;

  abstract readonly bounds: Box;
  abstract setBounds(bounds: Box, uow: UnitOfWork): void;

  abstract readonly name: string;
  abstract readonly dataForTemplate: FlatObject;
  abstract editProps: ElementPropsForEditing;
  abstract renderProps: ElementPropsForRendering;
  abstract storedProps: ElementProps;

  abstract getPropsInfo<T extends PropPath<ElementProps>>(
    path: T
  ): PropertyInfo<PropPathValue<ElementProps, T>>;

  abstract updateProps(callback: (props: NodeProps | EdgeProps) => void, uow: UnitOfWork): void;

  abstract snapshot(): Snapshot;
  abstract restore(snapshot: Snapshot, uow: UnitOfWork): void;

  /* Flags *************************************************************************************************** */

  isLocked() {
    return this.layer.isLocked();
  }

  isHidden() {
    return this.renderProps.hidden;
  }

  /* Diagram/layer ******************************************************************************************* */

  _setLayer(layer: RegularLayer, diagram: Diagram) {
    this._layer = layer;
    this._diagram = diagram;
  }

  get diagram() {
    return this._diagram;
  }

  get layer() {
    return this._layer;
  }

  get activeDiagram() {
    return this._activeDiagram;
  }

  set activeDiagram(diagram: Diagram) {
    if (this._activeDiagram !== diagram) {
      this.cache.clear();
    }
    this._activeDiagram = diagram;
  }

  /* Highlights ********************************************************************************************** */

  set highlights(highlights: ReadonlyArray<string>) {
    this._highlights = highlights;
    this.diagram.emitAsync('elementHighlighted', { element: this });
  }

  get highlights() {
    return this._highlights;
  }

  /* Parent ************************************************************************************************** */

  get parent() {
    return this._parent;
  }

  _setParent(parent: DiagramElement | undefined) {
    this._parent = parent;
  }

  /* Metadata ************************************************************************************************ */

  get metadata() {
    return this._metadata;
  }

  updateMetadata(callback: (props: ElementMetadata) => void, uow: UnitOfWork) {
    uow.snapshot(this);
    callback(this._metadata);
    uow.updateElement(this);
    this._cache?.clear();
  }

  /* Cache *************************************************************************************************** */

  get cache() {
    if (!this._cache) {
      this._cache = new Map<string, unknown>();
    }
    return this._cache;
  }

  /* Children ************************************************************************************************ */

  get children() {
    return this._children;
  }

  setChildren(children: ReadonlyArray<DiagramElement>, uow: UnitOfWork) {
    uow.snapshot(this);

    const oldChildren = this._children;

    this._children = children;
    this._children.forEach(c => {
      uow.snapshot(c);
      c._setParent(this);
      this.diagram.register(c);
    });

    // TODO: We should update nodeLookup and edgeLookup here
    oldChildren
      .filter(c => !children.includes(c))
      .forEach(c => {
        uow.removeElement(c);
        c._setParent(undefined);
      });

    this._children.forEach(c => {
      uow.updateElement(c);
    });
    uow.updateElement(this);
  }

  addChild(
    child: DiagramElement,
    uow: UnitOfWork,
    relation?: { ref: DiagramElement; type: 'after' | 'before' }
  ) {
    assert.true(child.diagram === this.diagram);
    assert.false(this.children.includes(child));

    uow.snapshot(this);
    uow.snapshot(child);

    // TODO: Check so the same not can't be added multiple times

    if (relation) {
      const children = this._children;
      const index = children.indexOf(relation.ref);
      if (relation.type === 'after') {
        this._children = [...children.slice(0, index + 1), child, ...children.slice(index + 1)];
      } else {
        this._children = [...children.slice(0, index), child, ...children.slice(index)];
      }
    } else {
      this._children = [...this._children, child];
    }
    child._setParent(this);

    this.diagram.register(child);

    uow.updateElement(this);
    uow.updateElement(child);
  }

  removeChild(child: DiagramElement, uow: UnitOfWork) {
    assert.true(this.children.includes(child));

    uow.snapshot(this);
    uow.snapshot(child);

    this._children = this.children.filter(c => c !== child);
    child._setParent(undefined);

    // TODO: We should clear nodeLookup and edgeLookup here

    uow.updateElement(this);
    uow.removeElement(child);
  }
}

export const getDiagramElementPath = (element: DiagramElement): DiagramElement[] => {
  const dest: DiagramElement[] = [];
  let current: DiagramElement | undefined = element.parent;
  while (current !== undefined) {
    dest.push(current);
    current = current.parent;
  }
  return dest;
};

export const getTopMostNode = (element: DiagramElement): DiagramElement => {
  const path = getDiagramElementPath(element);
  return path.length > 0 ? path[path.length - 1] : element;
};

export const isNode = (e: DiagramElement | undefined): e is DiagramNode => !!e && e.type === 'node';
export const isEdge = (e: DiagramElement | undefined): e is DiagramEdge => !!e && e.type === 'edge';

declare global {
  interface AssertTypeExtensions {
    node: (e: DiagramElement) => asserts e is DiagramNode;
    edge: (e: DiagramElement) => asserts e is DiagramEdge;
  }
}

assert.node = (e: DiagramElement): asserts e is DiagramNode => assert.true(isNode(e), 'not node');
assert.edge = (e: DiagramElement): asserts e is DiagramEdge => assert.true(isEdge(e), 'not edge');
