import {
  CustomPropertyDefinition,
  NodeCapability,
  NodeDefinition
} from './elementDefinitionRegistry';
import { DiagramNode } from './diagramNode';
import { Box, Extent, Path, PathBuilder, Point, Transform } from '@diagram-craft/geometry';
import { DeepReadonly, round } from '@diagram-craft/utils';
import { UnitOfWork } from './unitOfWork';
import { DiagramElement } from './diagramElement';

export class TestNodeDefinition implements NodeDefinition {
  constructor(
    public type: string,
    public name: string
  ) {}

  getBoundingPath(node: DiagramNode): Path {
    const bnd = node.bounds;
    const pb = this.getBoundingPathBuilder(node);
    if (round(bnd.r) !== 0) {
      pb.setRotation(bnd.r, Box.center(bnd));
    }
    return pb.getPath();
  }

  getBoundingPathBuilder(_node: DiagramNode): PathBuilder {
    return new PathBuilder();
  }

  getCustomProperties(_node: DiagramNode): Record<string, CustomPropertyDefinition> {
    return {};
  }

  getDefaultProps(_mode: 'picker' | 'canvas'): DeepReadonly<NodeProps> {
    return {};
  }

  getInitialConfig(): { size: Extent } {
    return { size: { w: 100, h: 100 } };
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

  onTransform(_transforms: ReadonlyArray<Transform>, _node: DiagramNode, _uow: UnitOfWork): void {}

  requestFocus(_node: DiagramNode): void {}

  supports(_capability: NodeCapability): boolean {
    return false;
  }
}