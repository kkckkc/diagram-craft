import {
  SimpleShapeNodeDefinition,
  SimpleShapeNodeDefinitionProps
} from '@diagram-craft/canvas/components/BaseNodeComponent';
import { ShapeBuilder } from '@diagram-craft/canvas/shape/ShapeBuilder';

export class ProvidedRequiredInterface extends SimpleShapeNodeDefinition {
  constructor() {
    super('providedRequiredInterface', 'Provided/Required Interface');
  }

  buildShape(props: SimpleShapeNodeDefinitionProps, shapeBuilder: ShapeBuilder): void {
    const inset = 2 + props.node.renderProps.stroke.width;
    const { h, w } = props.node.bounds;

    const b = shapeBuilder.buildBoundary();

    b.ellipse(w / 2 - inset, h / 2, w / 2 - inset, h / 2 - inset);
    b.fillAndStroke();

    b.path(w / 2, 0)
      .arc(w / 2, w / 2, 0, 0, 1, w - inset, h / 2)
      .arc(w / 2, w / 2, 0, 0, 1, w / 2, h);
    b.stroke();
  }
}
