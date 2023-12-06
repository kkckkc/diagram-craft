import React from 'react';
import {
  CustomPropertyDefinition,
  DiagramNode,
  NodeCapability,
  NodeDefinition
} from '../model-viewer/diagram.ts';
import { PathBuilder } from '../geometry/pathBuilder.ts';
import { Path } from '../geometry/path.ts';
import { round } from '../utils/math.ts';
import { Box } from '../geometry/box.ts';
import { EditableDiagram } from '../model-editor/editable-diagram.ts';

type Props = {
  node: DiagramNode;
  def: NodeDefinition;
  diagram: EditableDiagram;
  isSelected: boolean;
  isSingleSelected: boolean;
} & React.SVGProps<SVGRectElement>;

type ReactNode = React.FunctionComponent<Props>;

type BoundingPathFactory = (node: DiagramNode) => PathBuilder;
type CustomPropertyFactory = (node: DiagramNode) => Record<string, CustomPropertyDefinition>;

export class ReactNodeDefinition implements NodeDefinition {
  constructor(
    readonly type: string,
    readonly name: string,
    readonly reactNode: ReactNode,
    readonly bounds?: BoundingPathFactory,
    readonly customProps?: CustomPropertyFactory
  ) {}

  supports(_capability: NodeCapability): boolean {
    return true;
  }

  getBoundingPath(node: DiagramNode): Path {
    if (this.bounds === undefined) {
      const builder = new PathBuilder();
      builder.moveTo(node.bounds.pos.x, node.bounds.pos.y);
      builder.lineTo(node.bounds.pos.x + node.bounds.size.w, node.bounds.pos.y);
      builder.lineTo(
        node.bounds.pos.x + node.bounds.size.w,
        node.bounds.pos.y + node.bounds.size.h
      );
      builder.lineTo(node.bounds.pos.x, node.bounds.pos.y + node.bounds.size.h);
      builder.lineTo(node.bounds.pos.x, node.bounds.pos.y);

      if (round(node.bounds.rotation) !== 0) {
        builder.setRotation(node.bounds.rotation, Box.center(node.bounds));
      }

      return builder.getPath();
    }
    const pb = this.bounds?.(node);
    if (round(node.bounds.rotation) !== 0) {
      pb.setRotation(node.bounds.rotation, Box.center(node.bounds));
    }
    return pb.getPath();
  }

  getCustomProperties(node: DiagramNode): Record<string, CustomPropertyDefinition> {
    if (this.customProps !== undefined) {
      return this.customProps(node);
    }
    return {};
  }
}
