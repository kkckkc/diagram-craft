import {
  CustomPropertyDefinition,
  NodeCapability,
  NodeDefinition
} from './elementDefinitionRegistry';
import { DiagramNode } from './diagramNode';
import { UnitOfWork } from './unitOfWork';
import { DiagramElement } from './diagramElement';
import { PathBuilder } from '@diagram-craft/geometry/pathBuilder';
import { Box } from '@diagram-craft/geometry/box';
import { Point } from '@diagram-craft/geometry/point';
import { Transform } from '@diagram-craft/geometry/transform';
import { round } from '@diagram-craft/utils/math';

export class TestNodeDefinition implements NodeDefinition {
  constructor(
    public type: string,
    public name: string
  ) {}

  getBoundingPath(node: DiagramNode) {
    const bnd = node.bounds;
    const pb = this.getBoundingPathBuilder(node);
    if (round(bnd.r) !== 0) {
      pb.setRotation(bnd.r, Box.center(bnd));
    }
    return pb.getPaths();
  }

  getAnchors() {
    return [];
  }

  getBoundingPathBuilder(_node: DiagramNode): PathBuilder {
    return new PathBuilder();
  }

  getCustomPropertyDefinitions(_node: DiagramNode): Array<CustomPropertyDefinition> {
    return [];
  }

  onChildChanged(_node: DiagramNode, _uow: UnitOfWork): void {}

  onDrop(
    _coord: Point,
    _node: DiagramNode,
    _elements: ReadonlyArray<DiagramElement>,
    _uow: UnitOfWork,
    _operation: string
  ): void {}

  onPropUpdate(_node: DiagramNode, _uow: UnitOfWork): void {}

  onTransform(
    _transforms: ReadonlyArray<Transform>,
    _node: DiagramNode,
    _newBounds: Box,
    _previousBounds: Box,
    _uow: UnitOfWork
  ): void {}

  requestFocus(_node: DiagramNode): void {}

  supports(_capability: NodeCapability): boolean {
    return false;
  }
}
