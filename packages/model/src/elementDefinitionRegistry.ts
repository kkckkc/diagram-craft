import { DiagramNode, NodePropsForEditing } from './diagramNode';
import { assert } from '@diagram-craft/utils/assert';
import { DiagramElement } from './diagramElement';
import { DiagramEdge } from './diagramEdge';
import { CompoundPath } from '@diagram-craft/geometry/pathBuilder';
import { Extent } from '@diagram-craft/geometry/extent';
import { Transform } from '@diagram-craft/geometry/transform';
import { Point } from '@diagram-craft/geometry/point';
import { UnitOfWork } from './unitOfWork';
import { Anchor } from './types';
import { Box } from '@diagram-craft/geometry/box';
import { Diagram } from './diagram';
import { newid } from '@diagram-craft/utils/id';

export type NodeCapability = 'children' | 'fill' | 'select';

// TODO: Make make this into an interface in the global namespace we can extend
// TODO: Should we change these callbacks to have a UOW parameter?
export type CustomPropertyDefinition = {
  id: string;
  label: string;
} & (
  | {
      type: 'number';
      value: number;
      minValue?: number;
      maxValue?: number;
      step?: number;
      unit?: string;
      onChange: (value: number, uow: UnitOfWork) => void;
    }
  | {
      type: 'select';
      value: string;
      options: ReadonlyArray<{ value: string; label: string }>;
      onChange: (value: string, uow: UnitOfWork) => void;
    }
  | {
      type: 'boolean';
      value: boolean;
      onChange: (value: boolean, uow: UnitOfWork) => void;
    }
);

export interface NodeDefinition {
  type: string;
  name: string;

  supports(capability: NodeCapability): boolean;
  getCustomProperties(node: DiagramNode): Array<CustomPropertyDefinition>;

  getBoundingPath(node: DiagramNode): CompoundPath;

  // TODO: These are a bit weird, considering we allow for multiple registrations
  //       of the same definition
  getDefaultProps(mode: 'picker' | 'canvas'): NodePropsForEditing;
  getDefaultAspectRatio(node: DiagramNode): number;

  // TODO: Remove this perhaps
  getDefaultConfig(node: DiagramNode): { size: Extent };

  // This returns anchors in diagram coordinates, i.e. rotated and translated
  getAnchors(node: DiagramNode): ReadonlyArray<Anchor>;

  layoutChildren(node: DiagramNode, uow: UnitOfWork): void;

  onChildChanged(node: DiagramNode, uow: UnitOfWork): void;
  onTransform(
    transforms: ReadonlyArray<Transform>,
    node: DiagramNode,
    newBounds: Box,
    previousBounds: Box,
    uow: UnitOfWork
  ): void;
  onDrop(
    coord: Point,
    node: DiagramNode,
    elements: ReadonlyArray<DiagramElement>,
    uow: UnitOfWork,
    operation: string
  ): void;
  onPropUpdate(node: DiagramNode, uow: UnitOfWork): void;

  requestFocus(node: DiagramNode): void;
}

const missing = new Set();
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dump_missing = () => {
    console.log([...missing].join('\n'));
  };
}

export class NodeDefinitionRegistry {
  private nodes = new Map<string, NodeDefinition>();

  public stencilRegistry = new StencilRegistry();

  register(node: NodeDefinition) {
    this.nodes.set(node.type, node);
    return node;
  }

  get(type: string): NodeDefinition {
    const r = this.nodes.get(type);

    if (!r) {
      missing.add(type);
      console.warn(`Cannot find shape '${type}'`);
      return this.nodes.get('rect')!;
    }

    assert.present(r, 'Not found: ' + type);
    return r;
  }

  hasRegistration(type: string) {
    return this.nodes.has(type);
  }
}

export type EdgeCapability = 'arrows' | 'fill' | 'line-hops';

export interface EdgeDefinition {
  type: string;
  name: string;

  supports(capability: EdgeCapability): boolean;

  onDrop(
    coord: Point,
    edge: DiagramEdge,
    elements: ReadonlyArray<DiagramElement>,
    uow: UnitOfWork,
    operation: string
  ): void;

  getCustomProperties(edge: DiagramEdge): Array<CustomPropertyDefinition>;
}

export class EdgeDefinitionRegistry {
  private edges = new Map<string, EdgeDefinition>();

  #defaultValue: EdgeDefinition | undefined = undefined;

  set defaultValue(value: EdgeDefinition | undefined) {
    this.#defaultValue = value;
  }

  register(edge: EdgeDefinition) {
    this.edges.set(edge.type, edge);
  }

  get(type: string): EdgeDefinition {
    const r = this.edges.get(type) ?? this.#defaultValue;
    assert.present(r);
    return r;
  }
}

const isNodeDefinition = (type: string | NodeDefinition): type is NodeDefinition =>
  typeof type !== 'string';

export const makeStencilNode =
  (type: string | NodeDefinition, _aspectRation = 1) =>
  ($d: Diagram) => {
    const typeId = isNodeDefinition(type) ? type.type : type;
    const typeDef = $d.document.nodeDefinitions.get(typeId);

    const n = new DiagramNode(
      newid(),
      typeId,
      { x: 0, y: 0, w: $d.canvas.w, h: $d.canvas.h, r: 0 },
      $d,
      $d.layers.active,
      typeDef.getDefaultProps('picker')
    );

    const size = typeDef.getDefaultConfig(n).size;
    n.setBounds({ x: 0, y: 0, w: size.w, h: size.h, r: 0 }, UnitOfWork.immediate($d));

    return n;
  };

export const registerStencil = (
  reg: NodeDefinitionRegistry,
  pkg: StencilPackage,
  def: NodeDefinition
) => {
  pkg.stencils.push({ id: def.type, node: makeStencilNode(reg.register(def)) });
};

export type Stencil = {
  id: string;
  name?: string;
  node: (diagram: Diagram) => DiagramNode;
};

export type StencilPackage = {
  id: string;
  name: string;
  group?: string;
  stencils: Array<Stencil>;
};

export class StencilRegistry {
  private stencils = new Map<string, StencilPackage>();
  private activeStencils = new Set<string>();

  register(pkg: StencilPackage, activate = false) {
    if (this.stencils.has(pkg.id)) {
      this.stencils.get(pkg.id)!.stencils.push(...pkg.stencils);
    } else {
      this.stencils.set(pkg.id, pkg);
    }

    if (activate) {
      this.activate(pkg.id);
    }
  }

  get(name: string): StencilPackage {
    return this.stencils.get(name)!;
  }

  activate(name: string) {
    this.activeStencils.add(name);
  }

  getActiveStencils() {
    return [...this.activeStencils.values()]
      .filter(s => this.stencils.has(s))
      .map(s => this.stencils.get(s)!);
  }
}
