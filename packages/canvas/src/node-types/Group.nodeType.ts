import { ShapeNodeDefinition } from '../shape/shapeNodeDefinition';
import { BaseNodeComponent, BaseShapeBuildShapeProps } from '../components/BaseNodeComponent';
import * as svg from '../component/vdom-svg';
import { Transforms } from '../component/vdom-svg';
import { ShapeBuilder } from '../shape/ShapeBuilder';
import { Box } from '@diagram-craft/geometry/box';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';

export class GroupNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('group', 'Group', GroupComponent);
    this.capabilities.children = true;
  }

  onChildChanged(node: DiagramNode, uow: UnitOfWork) {
    const childrenBounds = node.children.map(c => c.bounds);
    if (childrenBounds.length === 0) return;
    const newBounds = Box.boundingBox(childrenBounds);
    node.setBounds(newBounds, uow);

    if (node.parent) {
      const parentDef = node.parent.getDefinition();
      parentDef.onChildChanged(node.parent, uow);
    }
  }
}

class GroupComponent extends BaseNodeComponent {
  buildShape(props: BaseShapeBuildShapeProps, builder: ShapeBuilder) {
    builder.add(
      svg.g(
        {},
        ...props.node.children.map(child =>
          svg.g(
            { transform: Transforms.rotateBack(props.node.bounds) },
            this.makeElement(child, props)
          )
        )
      )
    );
  }
}
